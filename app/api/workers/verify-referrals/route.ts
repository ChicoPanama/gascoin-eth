import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { REFERRAL_CONFIG } from '../../../../lib/referral-config';
import { calculateWalletTrust, detectReferralRing, awardVerifiedPoints } from '../../../../lib/ai-points-engine';

function isAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// Worker: auto-verify referrals + award POINTS (not SOL)
// SOL payouts are for gas receipts ONLY
// Runs every 15 minutes via Vercel cron
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

    for (const ref of pending || []) {
      const { data: payout } = await supabase
        .from('payouts')
        .select('id, claim_id')
        .eq('wallet', ref.referred_wallet)
        .eq('status', 'paid')
        .limit(1)
        .maybeSingle();

      if (!payout) continue;

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
        submission_id: payout.claim_id,
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

        const walletTrust = calculateWalletTrust({
          totalSubmissions: 1, approvedSubmissions: 1, rejectedSubmissions: 0,
          referralConversions: 0, skippedReferrals: 0, accountAgeDays: 30, anomalyCount: 0,
        });

        const result = await awardVerifiedPoints(supabase, {
          wallet: ref.referrer_wallet,
          source: 'referral_conversion',
          rawPoints: REFERRAL_CONFIG.POINTS_PER_CONVERSION,
          metadata: { referred_wallet: ref.referred_wallet, claim_id: payout.claim_id },
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
