import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { signGateCookie, GATE_COOKIE_NAME, GATE_COOKIE_MAX_AGE_SECONDS } from '../../../../lib/gate-cookie';
import { getClientIp } from '../../../../lib/ip';

/**
 * POST /api/invites/redeem — Season 1 beta invite redemption
 *
 * Body: { code: "GC-XXXX-XXXX" }
 * Auth: Privy bearer token (user must be signed in)
 *
 * Flow:
 *   1. Verify Privy session → get session.xId + session.xHandle
 *   2. Check if this x_user_id already has a redeemed code → return ok (idempotent)
 *   3. Look up the code → 404 if missing
 *   4. If the code is already used → 409 already_used
 *   5. Claim the code atomically — UPDATE ... WHERE used_by_x_user_id IS NULL
 *      so two simultaneous redemptions of the same code race-safely (only
 *      one winner, the other gets 0 rows updated and we return 409)
 *   6. Return 200 { ok: true, code } on success
 *
 * Rate limit: 10 attempts per 5 min per IP to prevent code brute-forcing.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REDEEM_WINDOW_SEC = 300;
const REDEEM_MAX = 10;

export async function POST(req: Request) {
  // Rate limit by IP — brute-forcing protection
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`invite-redeem:${ip}`, REDEEM_MAX, REDEEM_WINDOW_SEC);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfterSec: rl.resetSec },
      { status: 429 },
    );
  }

  // Verify Privy session
  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(
    auth,
    {
      xId: req.headers.get('x-privy-user-id') || '',
      xHandle: req.headers.get('x-privy-handle') || '',
      wallet: req.headers.get('x-privy-wallet') || '',
    },
    req.headers.get('cookie'),
  );
  if (!session || !session.xId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const rawCode = String(body?.code || '').trim().toUpperCase();
  if (!rawCode || !/^GC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(rawCode)) {
    return NextResponse.json({ ok: false, error: 'invalid_code_format' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Idempotent path: this user already has a redeemed invite
  const { data: existing } = await supabase
    .from('invite_codes')
    .select('code')
    .eq('used_by_x_user_id', session.xId)
    .maybeSingle();

  if (existing) {
    const gateCookie = await signGateCookie({ days: 90 });
    const res = NextResponse.json({
      ok: true,
      code: existing.code,
      alreadyRedeemed: true,
      message: 'You already have beta access.',
    });
    res.cookies.set(GATE_COOKIE_NAME, gateCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: GATE_COOKIE_MAX_AGE_SECONDS,
    });
    return res;
  }

  // Does the code exist?
  const { data: row } = await supabase
    .from('invite_codes')
    .select('id, code, used_by_x_user_id')
    .eq('code', rawCode)
    .maybeSingle();

  if (!row) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code', message: 'That code is not recognized.' },
      { status: 404 },
    );
  }

  if (row.used_by_x_user_id) {
    return NextResponse.json(
      { ok: false, error: 'already_used', message: 'That code has already been redeemed.' },
      { status: 409 },
    );
  }

  // Atomic claim — only set redeemer if nobody else has
  const { data: updated, error: updateErr } = await supabase
    .from('invite_codes')
    .update({
      used_by_x_user_id: session.xId,
      used_by_x_handle: session.xHandle,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .is('used_by_x_user_id', null)
    .select('code')
    .maybeSingle();

  if (updateErr || !updated) {
    // Race: another concurrent redemption won
    return NextResponse.json(
      { ok: false, error: 'already_used', message: 'That code has already been redeemed.' },
      { status: 409 },
    );
  }

  const gateCookie = await signGateCookie({ days: 90 });
  const res = NextResponse.json({
    ok: true,
    code: updated.code,
    message: 'Beta access unlocked. You can now submit receipts.',
  });
  res.cookies.set(GATE_COOKIE_NAME, gateCookie, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: GATE_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

// GET returns the current caller's invite status — used by the submit
// flow to decide whether to show the redemption panel or the form.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(
    auth,
    {
      xId: req.headers.get('x-privy-user-id') || '',
      xHandle: req.headers.get('x-privy-handle') || '',
      wallet: req.headers.get('x-privy-wallet') || '',
    },
    req.headers.get('cookie'),
  );
  if (!session || !session.xId) {
    return NextResponse.json({ ok: false, hasInvite: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('invite_codes')
    .select('code, redeemed_at')
    .eq('used_by_x_user_id', session.xId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    hasInvite: !!data,
    code: data?.code || null,
    redeemedAt: data?.redeemed_at || null,
  });
}
