import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { validateReferralCode, generateReferralCode } from '../../../../lib/referral-code';

export async function POST(req: NextRequest) {
  try {
    const { referral_code } = await req.json();

    if (!referral_code || !validateReferralCode(referral_code)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find referrer wallet by matching code against paid wallets
    const { data: payouts } = await supabase
      .from('payouts')
      .select('wallet')
      .eq('status', 'paid');

    const wallets = [...new Set((payouts || []).map((p: any) => p.wallet))];
    const referrerWallet = wallets.find((w) => generateReferralCode(w) === referral_code);

    if (!referrerWallet) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    // Create click fingerprint
    const ip = req.headers.get('x-forwarded-for')?.split('.').slice(0, 3).join('.') ?? 'unknown';
    const ua = req.headers.get('user-agent') ?? 'unknown';
    const fingerprint = Buffer.from(`${ip}:${ua}`).toString('base64').slice(0, 32);

    // Check duplicate
    const { data: existing } = await supabase
      .from('referral_clicks')
      .select('id')
      .eq('referral_code', referral_code)
      .eq('click_fingerprint', fingerprint)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await supabase.from('referral_clicks').insert({
      referral_code,
      referrer_wallet: referrerWallet,
      click_fingerprint: fingerprint,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'click failed' }, { status: 500 });
  }
}
