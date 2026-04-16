import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { validateReferralCode, generateReferralCode } from '../../../../lib/referral-code';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

export async function POST(req: NextRequest) {
  // Rate limit: 10 clicks per minute per IP
  const rl = await checkRateLimit(`referral_click:${getClientIp(req)}`, 10, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited', retryAfterSec: rl.resetSec }, { status: 429 });
  }

  try {
    const { referral_code } = await req.json();

    if (!referral_code || !validateReferralCode(referral_code)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Optimized: look up referrer from referral_clicks table first (cached from previous clicks)
    // This avoids the O(n) wallet scan on every request
    const { data: cachedReferrer } = await supabase
      .from('referral_clicks')
      .select('referrer_wallet')
      .eq('referral_code', referral_code)
      .limit(1)
      .maybeSingle();

    let referrerWallet = cachedReferrer?.referrer_wallet;

    // Cache miss: scan paid wallets (only happens on first click for a new code)
    if (!referrerWallet) {
      const { data: payouts } = await supabase
        .from('payouts')
        .select('wallet')
        .eq('status', 'paid');

      const wallets = [...new Set((payouts || []).map((p: any) => p.wallet))];
      referrerWallet = wallets.find((w) => generateReferralCode(w) === referral_code);
    }

    if (!referrerWallet) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    // Fingerprint for dedup — use /24 subnet prefix of the real IP
    const ip = getClientIp(req).split('.').slice(0, 3).join('.');
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
  } catch {
    // SECURITY: Do not leak error details to client
    return NextResponse.json({ error: 'click_failed' }, { status: 500 });
  }
}
