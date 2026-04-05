import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { REFERRAL_CONFIG } from '../../../../lib/referral-config';

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

      // Award points if eligible
      if (!skipReason) {
        await supabase.from('engagement_points').insert({
          wallet: ref.referrer_wallet,
          source: 'referral_conversion',
          points: REFERRAL_CONFIG.POINTS_PER_CONVERSION,
          metadata_json: { referred_wallet: ref.referred_wallet, claim_id: payout.claim_id },
        });
        pointsAwarded += REFERRAL_CONFIG.POINTS_PER_CONVERSION;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, verified, pointsAwarded, skipped });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'worker failed' }, { status: 500 });
  }
}
