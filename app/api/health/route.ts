/**
 * GASCOIN health check
 *
 * Returns the runtime mode (live vs dry-run), the build SHA, and a
 * lightweight ping of every external dependency. Useful for monitoring
 * during beta and as a one-call smoke test after deploys.
 *
 * Public endpoint — does not return secrets, only boolean reachability
 * + status codes. Rate limited via the global proxy.ts limiter.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

type DepStatus = { ok: boolean; status?: number; latencyMs?: number; error?: string };

async function pingUrl(url: string, init?: RequestInit): Promise<DepStatus> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, error: (e?.name || 'error').slice(0, 60) };
  }
}

export async function GET(req: Request) {
  // Require CRON_SECRET bearer so this endpoint isn't fingerprintable by
  // external scanners. Monitoring tools should pass it in the Authorization header.
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const presented = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!cronSecret || presented !== cronSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
  const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8) || 'local';
  const region = process.env.VERCEL_REGION || 'local';

  // Run all dependency pings in parallel — bounded at ~3.5s each by the
  // AbortSignal timeout so the route always returns within maxDuration.
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const upstashUrl = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const ethRpcUrl = alchemyKey
    ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : (process.env.ETH_RPC_URL || '');

  const [supabase, upstash, mem0, ethereum] = await Promise.all([
    // Supabase REST ping using the service_role key. Server-side only.
    // Service role bypasses RLS and auth gates, so this is "can the platform
    // reach its own database with admin credentials". Both `/rest/v1/` OpenAPI
    // root and `/auth/v1/health` returned 401 in this project config — neither
    // is publicly reachable. Service role + /rest/v1/ is the one combination
    // guaranteed to return 200 whenever Supabase is alive.
    (supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY)
      ? pingUrl(`${supabaseUrl}/rest/v1/`, {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })
      : Promise.resolve({ ok: false, error: 'not_configured' } as DepStatus),
    // Upstash Redis REST PING
    upstashUrl
      ? pingUrl(`${upstashUrl}/ping`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN || ''}` },
        })
      : Promise.resolve({ ok: false, error: 'not_configured' } as DepStatus),
    // mem0 health endpoint
    process.env.MEM0_API_KEY
      ? pingUrl('https://api.mem0.ai/v1/ping', {
          headers: { Authorization: `Token ${process.env.MEM0_API_KEY}` },
        })
      : Promise.resolve({ ok: false, error: 'not_configured' } as DepStatus),
    // Ethereum RPC — eth_blockNumber
    ethRpcUrl
      ? pingUrl(ethRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        })
      : Promise.resolve({ ok: false, error: 'not_configured' } as DepStatus),
  ]);

  const allOk = supabase.ok && upstash.ok && mem0.ok && ethereum.ok;

  return NextResponse.json(
    {
      ok: allOk,
      mode: isDryRun ? 'dry-run' : 'live',
      season: isDryRun ? 'season-1-beta' : 'live',
      buildSha,
      region,
      timestamp: new Date().toISOString(),
      deps: {
        supabase,
        upstash,
        mem0,
        ethereum,
      },
      note: isDryRun
        ? 'Season 1 beta — submissions flow end-to-end but no SOL is dispatched.'
        : 'Live mode — real SOL transactions enabled.',
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
