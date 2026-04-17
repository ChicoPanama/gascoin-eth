import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { isValidSolanaAddress } from '../../../../lib/validate-wallet';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

// GET — fetch referral count for a wallet
export async function GET(req: Request) {
  const rl = await checkRateLimit(`pub_referrals:${getClientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
  }

  // SECURITY: Validate wallet format to prevent injection
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json({ error: 'invalid_wallet_address' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('referrals')
      .select('id, referred_wallet, status, created_at, verified_at')
      .eq('referrer_wallet', wallet)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const verified = (data || []).filter((r: any) => r.status === 'verified').length;
    const pending = (data || []).filter((r: any) => r.status === 'pending').length;

    return NextResponse.json({
      wallet,
      verified_referrals: verified,
      pending_referrals: pending,
      total: (data || []).length,
      referrals: data || [],
    });
  } catch {
    return NextResponse.json({ error: 'failed to fetch referrals' }, { status: 500 });
  }
}

// POST — create a referral link / register a referral
export async function POST(req: Request) {
  const rl = await checkRateLimit(`pub_referrals_post:${getClientIp(req)}`, 5, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { referrer_wallet, referred_wallet } = body;

    if (!referrer_wallet || !referred_wallet) {
      return NextResponse.json({ error: 'referrer_wallet and referred_wallet required' }, { status: 400 });
    }

    // SECURITY: Validate both wallet addresses
    if (!isValidSolanaAddress(referrer_wallet) || !isValidSolanaAddress(referred_wallet)) {
      return NextResponse.json({ error: 'invalid_wallet_address' }, { status: 400 });
    }

    if (referrer_wallet === referred_wallet) {
      return NextResponse.json({ error: 'cannot refer yourself' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if referred wallet already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_wallet', referred_wallet)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'wallet already referred' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('referrals')
      .insert({ referrer_wallet, referred_wallet, status: 'pending' })
      .select('id, status, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, referral: data });
  } catch {
    // SECURITY: Do not leak error details to client
    return NextResponse.json({ error: 'failed to create referral' }, { status: 500 });
  }
}
