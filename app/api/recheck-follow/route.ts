import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../lib/integrations/privy';
import { refreshGascoinFollowersCache, isFollowingGascoin } from '../../../lib/integrations/x';
import { getUserByUsername } from '../../../lib/x-api';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/ip';

/**
 * POST /api/recheck-follow — force-refresh the @GasCoinApp follower cache
 * and re-check whether the caller is following.
 *
 * Why this endpoint exists:
 *   The follows_gascoin gate reads from a Redis SET that's rebuilt every 2h
 *   by the sync-gascoin-followers cron. A user who just followed will fail
 *   the gate until the next cron tick — up to 2 hours of false rejections.
 *   This endpoint bypasses that wait: the user hits "Recheck" in the UI
 *   after following, we paginate the X API live, replace the cache, and
 *   retest. Cost: one full follower-list fetch per invocation — rate limit
 *   is tight to prevent abuse.
 *
 * Rate limit: 3 refreshes per session per hour. Enough for a legit user
 * to retry a couple of times if the cache races; not enough to DoS the X
 * API via burst refresh.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WINDOW_SEC = 60 * 60; // 1h
const MAX_PER_WINDOW = 3;

export async function POST(req: Request) {
  // Dual rate limit: by IP (stops IP bursts) and by session (stops one user
  // from hammering even on rotated IPs).
  const ip = getClientIp(req);
  const ipRl = await checkRateLimit(`recheck-follow:ip:${ip}`, MAX_PER_WINDOW * 3, WINDOW_SEC);
  if (!ipRl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfterSec: ipRl.resetSec },
      { status: 429 },
    );
  }

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

  const userRl = await checkRateLimit(
    `recheck-follow:user:${session.xId}`,
    MAX_PER_WINDOW,
    WINDOW_SEC,
  );
  if (!userRl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'rate_limited_user',
        message: `You can recheck up to ${MAX_PER_WINDOW} times per hour. Try again in a few minutes.`,
        retryAfterSec: userRl.resetSec,
      },
      { status: 429 },
    );
  }

  // Force-refresh the cache. Pays one X API roundtrip.
  const refresh = await refreshGascoinFollowersCache();
  if (refresh.count < 0) {
    return NextResponse.json(
      { ok: false, error: 'cache_refresh_failed', detail: refresh.error },
      { status: 503 },
    );
  }

  // Resolve the X numeric subject ID. Prefer Privy's linked_accounts value;
  // fall back to a live X API lookup if Privy didn't supply one. SISMEMBER
  // against the freshly populated follower cache needs X's numeric ID —
  // the Privy DID never matches (see SessionIdentity.xSubjectId comment).
  let xSubjectId = session.xSubjectId || '';
  if (!xSubjectId && session.xHandle) {
    const lookup = await getUserByUsername(session.xHandle);
    xSubjectId = lookup.user?.id || '';
  }
  if (!xSubjectId) {
    return NextResponse.json(
      { ok: false, error: 'x_subject_id_unavailable',
        message: 'Could not resolve your X account ID. Try again in a moment.' },
      { status: 503 },
    );
  }

  const check = await isFollowingGascoin(xSubjectId);

  return NextResponse.json({
    ok: true,
    following: check.ok,
    cachedFollowerCount: refresh.count,
    apiFailure: check.apiFailure,
    message: check.ok
      ? 'Confirmed — you follow @GasCoinApp. You can now submit.'
      : 'Still not seeing you in the follower list. Double-check you followed @GasCoinApp, then try again.',
  });
}
