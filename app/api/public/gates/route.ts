import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json([]);
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('gate_results')
    .select('gate_name,passed,created_at')
    .gte('created_at', since)
    .limit(10000);

  if (error || !data) return NextResponse.json([]);

  const counts = new Map<string, { total: number; passed: number }>();
  for (const row of data as any[]) {
    const name = String(row.gate_name || '').trim();
    if (!name) continue;
    const c = counts.get(name) || { total: 0, passed: 0 };
    c.total += 1;
    if (row.passed) c.passed += 1;
    counts.set(name, c);
  }

  const rows = Array.from(counts.entries()).map(([name, c]) => ({
    name,
    rate: c.total > 0 ? Math.round((c.passed / c.total) * 100) : 0,
    total: c.total,
  }));

  return NextResponse.json(rows);
}
