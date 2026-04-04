import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

// Worker: verify pending referrals where the referred wallet has an approved claim
// Run via cron or manually: POST /api/workers/verify-referrals
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Find pending referrals
    const { data: pending, error: pendingErr } = await supabase
      .from('referrals')
      .select('id, referred_wallet')
      .eq('status', 'pending');

    if (pendingErr) throw pendingErr;
    if (!pending || pending.length === 0) {
      return NextResponse.json({ ok: true, verified: 0, message: 'no pending referrals' });
    }

    let verified = 0;

    for (const ref of pending) {
      // Check if referred wallet has a paid payout
      const { data: payout } = await supabase
        .from('payouts')
        .select('id')
        .eq('wallet', ref.referred_wallet)
        .eq('status', 'paid')
        .limit(1)
        .maybeSingle();

      if (payout) {
        await supabase
          .from('referrals')
          .update({ status: 'verified', verified_at: new Date().toISOString() })
          .eq('id', ref.id);
        verified++;
      }
    }

    return NextResponse.json({ ok: true, verified, total_pending: pending.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'worker failed' }, { status: 500 });
  }
}
