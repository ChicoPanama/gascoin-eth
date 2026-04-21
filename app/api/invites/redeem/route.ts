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

  // A wallet must be connected BEFORE redeeming — this is the wallet we
  // pin into beta_participants as the Pioneer Bonus payout target. Without
  // this guard the tester could redeem with no wallet, then connect a
  // throw-away wallet later, then lose access to the actual rewards wallet.
  const sessionWallet = String(session.wallet || '').trim();
  if (!sessionWallet) {
    return NextResponse.json(
      {
        ok: false,
        error: 'wallet_connect_required',
        message: 'Connect your wallet before redeeming. Your Season 1 Pioneer Bonus will be locked to this wallet — make sure it\'s one you control and will keep.',
      },
      { status: 400 },
    );
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
    // Return the pinned wallet so the UI can reflect "your Pioneer Bonus
    // goes to 0x…" without a second round trip.
    const { data: locked } = await supabase
      .from('beta_participants')
      .select('wallet, locked_at')
      .eq('x_user_id', session.xId)
      .maybeSingle();
    const gateCookie = await signGateCookie({ days: 90 });
    const res = NextResponse.json({
      ok: true,
      code: existing.code,
      alreadyRedeemed: true,
      lockedWallet: locked?.wallet || null,
      lockedAt: locked?.locked_at || null,
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

  // Pin the wallet to this x_user_id. From this moment forward every beta
  // submission must come from sessionWallet. Pioneer Bonus pays here at
  // Season 1 close. ON CONFLICT DO NOTHING protects against a race where
  // the tester redeems via two devices simultaneously — whoever's row
  // wins the invite_codes UPDATE above also wins the wallet pin.
  const { error: participantErr } = await supabase
    .from('beta_participants')
    .insert({
      x_user_id: session.xId,
      x_handle: session.xHandle,
      wallet: sessionWallet,
      invite_code: updated.code,
    });
  if (participantErr && !participantErr.message?.includes('duplicate')) {
    // Don't block the user on this — the invite is already claimed in
    // invite_codes and the submit pipeline's idempotent backfill (see
    // migration comment) will pick them up. But surface to logs.
    // eslint-disable-next-line no-console
    console.error('beta_participants insert failed', { xId: session.xId, err: participantErr.message });
  }

  const gateCookie = await signGateCookie({ days: 90 });
  const res = NextResponse.json({
    ok: true,
    code: updated.code,
    lockedWallet: sessionWallet,
    lockedAt: new Date().toISOString(),
    message: 'Beta access unlocked. Your Season 1 Pioneer Bonus is pinned to this wallet.',
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
  const [inviteRow, lockedRow] = await Promise.all([
    supabase
      .from('invite_codes')
      .select('code, redeemed_at')
      .eq('used_by_x_user_id', session.xId)
      .maybeSingle(),
    supabase
      .from('beta_participants')
      .select('wallet, locked_at')
      .eq('x_user_id', session.xId)
      .maybeSingle(),
  ]);
  const data = inviteRow.data;
  const locked = lockedRow.data;

  return NextResponse.json({
    ok: true,
    hasInvite: !!data,
    code: data?.code || null,
    redeemedAt: data?.redeemed_at || null,
    lockedWallet: locked?.wallet || null,
    lockedAt: locked?.locked_at || null,
  });
}
