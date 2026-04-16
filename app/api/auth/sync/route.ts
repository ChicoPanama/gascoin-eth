import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

export async function POST(req: Request) {
  // SECURITY: Rate limit auth sync to prevent brute force
  const rl = await checkRateLimit(`auth_sync:${getClientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const session = await verifyPrivySession(req.headers.get('authorization'), {
    xId: req.headers.get('x-privy-user-id') || '',
    xHandle: req.headers.get('x-privy-handle') || '',
    wallet: req.headers.get('x-privy-wallet') || ''
  }, req.headers.get('cookie'));
  // SECURITY: allowHintFallback removed — unverified identities no longer accepted.
  // Hardened 2026-04-06.
  if (!session) {
    // SECURITY: Do not leak diagnostics about auth state to client
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  }

  const xHandle = `@${session.xHandle}`;

  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .upsert(
      {
        x_user_id: session.xId || `x_${session.xHandle}`,
        x_handle: xHandle,
        x_verified: session.xVerified
      },
      { onConflict: 'x_user_id' }
    )
    .select('id,x_user_id,x_handle')
    .single();

  if (userErr || !userRow?.id) {
    // SECURITY: Do not leak DB error details to client
    return NextResponse.json({ ok: false, error: 'user_upsert_failed' }, { status: 500 });
  }

  if (session.wallet) {
    // SECURITY: Check if this wallet is registered to a different user
    const { data: walletConflict } = await supabase
      .from('wallet_links')
      .select('user_id')
      .eq('wallet', session.wallet)
      .neq('user_id', userRow.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (walletConflict) {
      return NextResponse.json({ ok: false, error: 'wallet_registered_to_another_account' }, { status: 409 });
    }

    // Deactivate any previous wallets for this user (one wallet per X account)
    await supabase
      .from('wallet_links')
      .update({ is_primary: false })
      .eq('user_id', userRow.id)
      .neq('wallet', session.wallet);

    await supabase
      .from('wallet_links')
      .upsert(
        {
          user_id: userRow.id,
          wallet: session.wallet,
          is_primary: true,
          verified_at: new Date().toISOString()
        },
        { onConflict: 'user_id,wallet' }
      );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: userRow.id,
      xUserId: userRow.x_user_id,
      xHandle: userRow.x_handle,
      wallet: session.wallet,
      xVerified: session.xVerified
    }
  });
}
