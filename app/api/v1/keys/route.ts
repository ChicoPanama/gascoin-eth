import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { generateApiKey, tierForBalance, API_TIERS } from '../../../../lib/api-gating';
import { getWalletGascoinBalance } from '../../../../lib/integrations/ethereum';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/keys
 * Create a new API key bound to the authenticated wallet. Tier is
 * derived from current $GASCOIN balance. Plaintext returned ONCE.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`apikey-create:${ip}`, 5, 3600);
  if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const session = await verifyPrivySession(
    req.headers.get('authorization'),
    { xHandle: '', wallet: '' },
    req.headers.get('cookie'),
  ).catch(() => null);

  if (!session?.wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const wallet = session.wallet.trim();
  if (!wallet.startsWith('0x')) {
    return NextResponse.json({ error: 'invalid_wallet' }, { status: 400 });
  }

  let body: { label?: string } = {};
  try { body = await req.json(); } catch {}
  const label = (body.label || '').toString().slice(0, 80) || null;

  const balance = await getWalletGascoinBalance(wallet).catch(() => 0);
  const tier = tierForBalance(balance);

  const { plaintext, hash } = generateApiKey();
  const keyPrefix = plaintext.slice(0, 12);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      wallet,
      key_hash: hash,
      key_prefix: keyPrefix,
      tier,
      label,
    })
    .select('id,tier,created_at,label,key_prefix')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    tier: data.tier,
    label: data.label,
    key_prefix: data.key_prefix,
    created_at: data.created_at,
    api_key: plaintext, // RETURNED ONCE — never again
    gascoin_balance: balance,
    daily_request_limit: API_TIERS[tier].dailyRequests,
  });
}

/**
 * GET /api/v1/keys
 * List keys for the authenticated wallet. Hashes/plaintext never returned.
 */
export async function GET(req: Request) {
  const session = await verifyPrivySession(
    req.headers.get('authorization'),
    { xHandle: '', wallet: '' },
    req.headers.get('cookie'),
  ).catch(() => null);

  if (!session?.wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('api_keys')
    .select('id,tier,label,key_prefix,created_at,last_used_at,expires_at,revoked_at')
    .eq('wallet', session.wallet.trim())
    .order('created_at', { ascending: false });

  return NextResponse.json({ keys: data || [] });
}

/**
 * DELETE /api/v1/keys?id=...
 * Revoke a key (soft delete).
 */
export async function DELETE(req: Request) {
  const session = await verifyPrivySession(
    req.headers.get('authorization'),
    { xHandle: '', wallet: '' },
    req.headers.get('cookie'),
  ).catch(() => null);

  if (!session?.wallet) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('wallet', session.wallet.trim());

  if (error) return NextResponse.json({ error: 'revoke_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
