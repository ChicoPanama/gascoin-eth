import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { REFERRAL_CONFIG } from '../../../../lib/referral-config';
import { calculateWalletTrust, detectReferralRing, awardVerifiedPoints } from '../../../../lib/ai-points-engine';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { writeReferralRingFlag } from '../../../../lib/mem0';
import { writeIntelligence } from '../../../../lib/knowledge-base';

// Worker: auto-verify referrals + award POINTS (not SOL)
// SOL payouts are for gas receipts ONLY
// Runs every 15 minutes via Vercel cron

// Ring detection BFS + AI verification calls — bump timeout to 60s
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const { data: pending } = await supabase
      .from('referrals')
      .select('id, referrer_wallet, referred_wallet')
      .eq('status', 'pending');

    let verified = 0;
    let pointsAwarded = 0;
    let skipped = 0;
    let heldForReview = 0;

    // Batch: pre-fetch all paid payouts for referred wallets in one query
    const referredWallets = [...new Set((pending || []).map((r: any) => r.referred_wallet))];
    const { data: paidPayouts } = referredWallets.length > 0
      ? await supabase.from('payouts').select('wallet').eq('status', 'paid').in('wallet', referredWallets)
      : { data: [] };
    const paidWalletSet = new Set((paidPayouts || []).map((p: any) => p.wallet));

    for (const ref of pending || []) {
      if (!paidWalletSet.has(ref.referred_wallet)) continue;

      await supabase.from('referrals').update({ status: 'verified', verified_at: now }).eq('id', ref.id);
      verified++;

      // Check if already converted
      const { data: existing } = await supabase
        .from('referral_conversions')
        .select('id')
        .eq('referrer_wallet', ref.referrer_wallet)
        .eq('referred_wallet', ref.referred_wallet)
        .maybeSingle();
      if (existing) continue;

      // Eligibility checks
      let skipReason: string | null = null;

      if (ref.referrer_wallet === ref.referred_wallet) {
        skipReason = 'self_referral';
      }

      if (!skipReason) {
        const { data: referrerPaid } = await supabase
          .from('payouts').select('id').eq('wallet', ref.referrer_wallet).eq('status', 'paid').limit(1).maybeSingle();
        if (!referrerPaid) skipReason = 'referrer_not_approved';
      }

      if (!skipReason) {
        const { data: recent } = await supabase
          .from('referral_conversions')
          .select('id')
          .eq('referrer_wallet', ref.referrer_wallet)
          .in('reward_status', ['verified', 'ready_for_dispatch'])
          .gte('created_at', thirtyDaysAgo);
        if ((recent || []).length >= REFERRAL_CONFIG.MAX_CONVERSIONS_30D) {
          skipReason = 'max_conversions_reached';
        }
      }

      // Create conversion record — points only, no SOL
      await supabase.from('referral_conversions').insert({
        referral_code: '',
        referrer_wallet: ref.referrer_wallet,
        referred_wallet: ref.referred_wallet,
        submission_id: ref.id,
        reward_sol: 0, // No SOL for referrals
        reward_status: skipReason ? 'skipped' : 'verified',
        skip_reason: skipReason,
      });

      // Award points through AI verification gate
      if (!skipReason) {
        // Get all referrals for ring detection
        const { data: allRefs } = await supabase
          .from('referrals')
          .select('referrer_wallet, referred_wallet, created_at')
          .in('status', ['pending', 'verified']);

        const ringCheck = await detectReferralRing({
          referrerWallet: ref.referrer_wallet,
          referredWallet: ref.referred_wallet,
          allReferrals: (allRefs || []).map((r: any) => ({ referrer: r.referrer_wallet, referred: r.referred_wallet, created_at: r.created_at })),
        });

        // Record ring detection signals to mem0 + intelligence entries
        if (ringCheck.isSuspicious) {
          const ringMsg = `Referral ring detected (${ringCheck.ringType}): ${ringCheck.reason}`;
          // Use the typed writeReferralRingFlag helper — categorizes under
          // referral_ring_flag, marks immutable, assigns agent/app scope, and
          // busts the Upstash profile cache. The ringType/confidence/cyclePath
          // metadata is what the payout worker reads before dispatching SOL.
          writeReferralRingFlag(ref.referrer_wallet, {
            ringType: ringCheck.ringType === 'none' ? 'cluster' : ringCheck.ringType,
            confidence: ringCheck.confidence,
            cyclePath: ringCheck.wallets,
            reason: ringCheck.reason,
          }).catch(() => {});
          writeReferralRingFlag(ref.referred_wallet, {
            ringType: ringCheck.ringType === 'none' ? 'cluster' : ringCheck.ringType,
            confidence: ringCheck.confidence,
            cyclePath: ringCheck.wallets,
            reason: ringCheck.reason,
          }).catch(() => {});
          writeIntelligence({
            entry_type: 'ring_detected', entity_type: 'wallet', entity_id: ref.referrer_wallet,
            summary: ringMsg,
            detail_json: { ringType: ringCheck.ringType, wallets: ringCheck.wallets, confidence: ringCheck.confidence },
            severity: 'critical', pipeline_source: 'verify_referrals',
          }).catch(() => {});
        }

        // ─── Wallet age gate: referred wallet must be 7+ days old ───
        const { data: referredFirstClaim } = await supabase
          .from('claims')
          .select('created_at')
          .eq('wallet', ref.referred_wallet)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const referredAgeDays = referredFirstClaim?.created_at
          ? Math.floor((Date.now() - new Date(referredFirstClaim.created_at).getTime()) / 86400000)
          : 0;

        if (referredAgeDays < 7) {
          skipped++;
          continue; // Too new — skip to prevent Sybil farming
        }

        // ─── Fetch real wallet trust for referrer ───
        const { data: refClaims } = await supabase
          .from('claims')
          .select('status, created_at')
          .eq('wallet', ref.referrer_wallet);

        const refApproved = (refClaims || []).filter((c: any) => ['approved', 'paid', 'ready_for_dispatch'].includes(c.status)).length;
        const refRejected = (refClaims || []).filter((c: any) => c.status === 'rejected').length;
        const refFirst = (refClaims || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] as any;
        const refAgeDays = refFirst?.created_at ? Math.floor((Date.now() - new Date(refFirst.created_at).getTime()) / 86400000) : 0;

        const walletTrust = calculateWalletTrust({
          totalSubmissions: (refClaims || []).length,
          approvedSubmissions: refApproved,
          rejectedSubmissions: refRejected,
          referralConversions: 0, skippedReferrals: 0,
          accountAgeDays: refAgeDays,
          anomalyCount: 0,
        });

        const result = await awardVerifiedPoints(supabase, {
          wallet: ref.referrer_wallet,
          source: 'referral_conversion',
          rawPoints: REFERRAL_CONFIG.POINTS_PER_CONVERSION,
          metadata: { referred_wallet: ref.referred_wallet, referral_id: ref.id },
          walletTrust,
          ringDetection: ringCheck,
        });

        if (result.awarded) pointsAwarded += result.points;
        if (result.heldForReview) heldForReview++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, verified, pointsAwarded, skipped, heldForReview });
  } catch (e: any) {
    return NextResponse.json({ error: 'worker_failed' }, { status: 500 });
  }
}
