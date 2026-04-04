import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { REFERRAL_CONFIG } from '../../../../lib/referral-config';

function isAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// Worker: auto-verify referrals + auto-create conversion rewards
// Referral rewards land as 'ready_for_dispatch' — admin approves to send SOL
// Runs every 15 minutes via Vercel cron
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // Step 1: Find pending referrals where the referred wallet has a paid payout
    const { data: pending } = await supabase
      .from('referrals')
      .select('id, referrer_wallet, referred_wallet, referred_claim_id')
      .eq('status', 'pending');

    let verified = 0;
    let conversionsCreated = 0;
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

      // Mark referral as verified
      await supabase.from('referrals').update({ status: 'verified', verified_at: now }).eq('id', ref.id);
      verified++;

      // Skip if conversion already exists
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
          .from('referral_conversions').select('reward_sol')
          .eq('referrer_wallet', ref.referrer_wallet)
          .in('reward_status', ['pending', 'ready_for_dispatch', 'dispatched'])
          .gte('created_at', thirtyDaysAgo);
        const count = (recent || []).length;
        const sol = (recent || []).reduce((s: number, c: any) => s + Number(c.reward_sol || 0), 0);
        if (count >= REFERRAL_CONFIG.MAX_CONVERSIONS_30D) skipReason = 'max_conversions_reached';
        else if (sol >= REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL) skipReason = 'max_rewards_reached';
      }

      // Create conversion — ready_for_dispatch (admin approves) or skipped
      await supabase.from('referral_conversions').insert({
        referral_code: '',
        referrer_wallet: ref.referrer_wallet,
        referred_wallet: ref.referred_wallet,
        submission_id: payout.claim_id,
        reward_sol: skipReason ? 0 : REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL,
        reward_status: skipReason ? 'skipped' : 'ready_for_dispatch',
        skip_reason: skipReason,
      });

      if (skipReason) skipped++;
      else conversionsCreated++;
    }

    const { count: readyCount } = await supabase
      .from('referral_conversions').select('*', { count: 'exact', head: true }).eq('reward_status', 'ready_for_dispatch');

    return NextResponse.json({ ok: true, verified, conversionsCreated, skipped, readyForDispatch: readyCount ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'worker failed' }, { status: 500 });
  }
}
