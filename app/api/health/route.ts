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

export async function GET() {
  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
  const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8) || 'local';
  const region = process.env.VERCEL_REGION || 'local';

  // Run all dependency pings in parallel — bounded at ~3.5s each by the
  // AbortSignal timeout so the route always returns within maxDuration.
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const upstashUrl = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const heliusKey = process.env.HELIUS_API_KEY;

  const [supabase, upstash, mem0, helius] = await Promise.all([
    // Supabase REST root — returns 200 on the OpenAPI spec.
    // Supabase REST requires BOTH `apikey` AND `Authorization: Bearer` headers.
    supabaseUrl
      ? pingUrl(`${supabaseUrl}/rest/v1/`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
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
    // Helius RPC — getHealth
    heliusKey
      ? pingUrl(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
        })
      : Promise.resolve({ ok: false, error: 'not_configured' } as DepStatus),
  ]);

  const allOk = supabase.ok && upstash.ok && mem0.ok && helius.ok;

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
        helius,
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
