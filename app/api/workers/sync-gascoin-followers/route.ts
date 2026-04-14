import { NextResponse } from 'next/server';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { refreshGascoinFollowersCache } from '../../../../lib/integrations/x';

// ═══════════════════════════════════════════
// GasCoinApp Follower Sync Worker
//
// Rebuilds the `gascoin:x_followers` Redis SET that backs the
// `follows_gascoin` submission gate. Paginates the full follower
// list of @GasCoinApp via the X API v2 and writes the set of X
// user IDs to Upstash with a 6h TTL.
//
// Why this worker instead of checking on-the-fly:
//   • X API `/users/:id/following` requires OAuth user context for
//     arbitrary users, not app-bearer.
//   • `/users/:id/followers` works with bearer but is rate-limited.
//   • Per-submission checks would hit X on every claim — slow and
//     expensive. Periodic refresh + O(1) SISMEMBER is dramatically
//     cheaper.
//
// Cron schedule: every 30 minutes (see vercel.json). The submit
// pipeline falls back to a synchronous refresh if the cache is cold
// (e.g. first boot after deploy, or Redis flush), so the cron is a
// steady-state optimization, not a correctness requirement.
//
// Failure mode: if the X API returns an error (rate limit, outage,
// bad credentials), the worker returns 503 and Vercel retries on
// the next cron tick. The stale set keeps serving SISMEMBER checks
// until the TTL expires (6h), giving us a generous recovery window.
// ═══════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.X_BEARER_TOKEN) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 });
  }

  const start = Date.now();
  const result = await refreshGascoinFollowersCache();
  const durationMs = Date.now() - start;

  if (result.count < 0) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error || 'refresh_failed',
        durationMs,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    cached: result.count,
    durationMs,
    note: 'Redis SET gascoin:x_followers refreshed. Next refresh in ~30 min via cron.',
  });
}

// GET returns cache status without triggering a refresh — useful for
// smoke tests and the admin panel. Still requires cron auth.
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    note: 'POST to trigger a refresh. Cache is refreshed automatically every 30 minutes by Vercel cron.',
  });
}
