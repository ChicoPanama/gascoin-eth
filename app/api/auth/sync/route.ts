import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cookieHeader = req.headers.get('cookie');
  const session = await verifyPrivySession(req.headers.get('authorization'), {
    xId: req.headers.get('x-privy-user-id') || '',
    xHandle: req.headers.get('x-privy-handle') || '',
    wallet: req.headers.get('x-privy-wallet') || ''
  }, cookieHeader, { allowHintFallback: true });
  if (!session) {
    return NextResponse.json({
      ok: false,
      error: 'unauthorized',
      diagnostics: {
        hasAuthorizationHeader: !!authHeader,
        hasPrivyCookie: !!(cookieHeader && /(?:^|;\s*)(privy-token|privy_access_token)=/.test(cookieHeader)),
        hasHintUserId: !!req.headers.get('x-privy-user-id'),
        hasHintHandle: !!req.headers.get('x-privy-handle')
      }
    }, { status: 401 });
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
    return NextResponse.json({ ok: false, error: 'user_upsert_failed', details: userErr?.message }, { status: 500 });
  }

  if (session.wallet) {
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
