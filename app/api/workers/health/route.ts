// O6 — Worker health endpoint
//
// GET /api/workers/health
//
// No auth required — designed to be polled by external monitoring (UptimeRobot,
// Better Uptime, etc.). Returns 200 always so the monitoring tool can diff the
// JSON payload rather than relying on status codes.
//
// Reads the last audit_log row per worker and compares it against the expected
// schedule interval. Workers that haven't run within 2x their expected interval
// are marked as "stale".
//
// Cron schedules from vercel.json:
//   process-claims           every 5m   -> stale after 10m
//   verify-referrals         every 15m  -> stale after 30m
//   score-engagement         every 60m  -> stale after 120m
//   sync-gascoin-followers   every 30m  -> stale after 60m
//   award-points             daily      -> stale after 48h
//   sync-x-handles           daily      -> stale after 48h
//   pre-payout-verify        daily      -> stale after 48h
//   aggregate-intelligence   daily      -> stale after 48h
//   flush-receipts           weekly     -> stale after 14d

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { validateGascoinMint } from '../../../../lib/integrations/ethereum';

// Expected run intervals in seconds (sourced from vercel.json cron schedules)
const WORKERS: Array<{
  path: string;
  label: string;
  intervalSeconds: number;
}> = [
  { path: '/api/workers/process-claims',          label: 'Process Claims',          intervalSeconds: 5 * 60 },
  { path: '/api/workers/verify-referrals',         label: 'Verify Referrals',        intervalSeconds: 15 * 60 },
  { path: '/api/workers/score-engagement',         label: 'Score Engagement',        intervalSeconds: 60 * 60 },
  { path: '/api/workers/sync-gascoin-followers',   label: 'Sync GasCoin Followers',  intervalSeconds: 30 * 60 },
  { path: '/api/workers/award-points',             label: 'Award Points',            intervalSeconds: 24 * 60 * 60 },
  { path: '/api/workers/sync-x-handles',          label: 'Sync X Handles',          intervalSeconds: 24 * 60 * 60 },
  { path: '/api/workers/pre-payout-verify',        label: 'Pre-Payout Verify',       intervalSeconds: 24 * 60 * 60 },
  { path: '/api/workers/aggregate-intelligence',  label: 'Aggregate Intelligence',  intervalSeconds: 24 * 60 * 60 },
  { path: '/api/workers/flush-receipts',          label: 'Flush Receipts',          intervalSeconds: 7 * 24 * 60 * 60 },
];

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const presented = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!cronSecret || presented !== cronSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'supabase_unavailable', workers: [] },
      { status: 200 },
    );
  }

  // Pull the most recent run record for each worker path in one query
  const { data: recentRuns } = await supabase
    .from('audit_logs')
    .select('target, created_at, payload_json')
    .or('action.eq.cron_run,action.eq.worker_run')
    .order('created_at', { ascending: false })
    .limit(500);

  // Bucket: first (most-recent) entry per worker path
  const lastRunByPath = new Map<string, { last_run_at: string; ok: boolean }>();
  for (const row of (recentRuns || []) as any[]) {
    const path = String(row.target || '');
    if (!path || lastRunByPath.has(path)) continue;
    const payload = row.payload_json || row.payload || {};
    lastRunByPath.set(path, {
      last_run_at: row.created_at,
      ok: payload?.ok !== false,
    });
  }

  const now = Date.now();

  const workers = WORKERS.map((w) => {
    const last = lastRunByPath.get(w.path);
    if (!last) {
      return {
        path: w.path,
        label: w.label,
        last_run_at: null,
        last_run_ok: null,
        expected_interval_seconds: w.intervalSeconds,
        status: 'no_data' as const,
      };
    }

    const lastRunMs = new Date(last.last_run_at).getTime();
    const elapsedSeconds = (now - lastRunMs) / 1000;
    const staleThresholdSeconds = w.intervalSeconds * 2;
    const isStale = elapsedSeconds > staleThresholdSeconds;
    const status = isStale ? 'stale' : last.ok ? 'ok' : 'error';

    return {
      path: w.path,
      label: w.label,
      last_run_at: last.last_run_at,
      last_run_ok: last.ok,
      expected_interval_seconds: w.intervalSeconds,
      elapsed_seconds: Math.round(elapsedSeconds),
      stale_threshold_seconds: staleThresholdSeconds,
      status,
    };
  });

  const staleCount = workers.filter((w) => w.status === 'stale').length;
  const errorCount = workers.filter((w) => w.status === 'error').length;
  const noDataCount = workers.filter((w) => w.status === 'no_data').length;

  // T1: Flag if live payouts are disabled — DRYRUN mode silently marks claims
  // paid without transferring ETH. Surface this in the health feed.
  const livePayoutEnabled = process.env.ENABLE_LIVE_PAYOUT === 'true';

  // C4: Validate GASCOIN_CONTRACT_ADDRESS format at health-check time.
  const mintCheck = validateGascoinMint();

  return NextResponse.json({
    ok: true,
    checked_at: new Date().toISOString(),
    config: {
      live_payout_enabled: livePayoutEnabled,
      gascoin_mint_valid: mintCheck.ok,
      gascoin_mint_error: mintCheck.error ?? null,
      mock_auth_guard: process.env.NODE_ENV === 'production'
        ? 'active — DEV_ALLOW_MOCK_AUTH is blocked in production'
        : process.env.DEV_ALLOW_MOCK_AUTH === 'true' ? 'mock_auth_enabled (dev only)' : 'ok',
    },
    summary: {
      total: workers.length,
      ok: workers.filter((w) => w.status === 'ok').length,
      stale: staleCount,
      error: errorCount,
      no_data: noDataCount,
    },
    workers,
  });
}
