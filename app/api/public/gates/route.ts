import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { withPublicCache } from '../../../../lib/http-cache';
import { withRuntimeCache } from '../../../../lib/runtime-cache';

export const dynamic = 'force-dynamic';

type GateRow = { name: string; rate: number; total: number };

async function computeGateRates(): Promise<GateRow[]> {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return [];
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('gate_results')
    .select('gate_name,passed,created_at')
    .gte('created_at', since)
    .limit(10000);

  if (error || !data) return [];

  const counts = new Map<string, { total: number; passed: number }>();
  for (const row of data as any[]) {
    const name = String(row.gate_name || '').trim();
    if (!name) continue;
    const c = counts.get(name) || { total: 0, passed: 0 };
    c.total += 1;
    if (row.passed) c.passed += 1;
    counts.set(name, c);
  }

  return Array.from(counts.entries()).map(([name, c]) => ({
    name,
    rate: c.total > 0 ? Math.round((c.passed / c.total) * 100) : 0,
    total: c.total,
  }));
}

export async function GET() {
  // Two-tier cache: Runtime Cache (regional, 10 min) avoids re-scanning
  // 14d of gate_results per region-warm function, CDN cache (600s) shares
  // across clients. Tag `gates` so payout-worker can expireTag on major
  // rule changes.
  const rows = await withRuntimeCache(
    'public:gates:v1',
    computeGateRates,
    { ttl: 600, tags: ['gates'], name: 'public-gates-rates' },
  );

  return withPublicCache(NextResponse.json(rows), { sMaxAge: 600 });
}
