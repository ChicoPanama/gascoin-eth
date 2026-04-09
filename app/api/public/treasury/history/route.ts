import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json([]);
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('treasury_snapshots')
    .select('sol_balance,ts')
    .gte('ts', since)
    .order('ts', { ascending: true })
    .limit(400);

  if (error || !data) return NextResponse.json([]);

  // Downsample to ~7 points (daily nearest-latest snapshot)
  const byDay = new Map<string, { day: string; sol: number; ts: string }>();
  for (const row of data as any[]) {
    const ts = row.ts as string;
    const d = new Date(ts);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      sol: Number(row.sol_balance || 0),
      ts,
    });
  }

  return NextResponse.json(Array.from(byDay.values()).slice(-7));
}
