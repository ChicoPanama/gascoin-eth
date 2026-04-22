import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { withPublicCache } from '../../../../lib/http-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hdrs = await headers();
  const ip = hdrs.get('x-vercel-forwarded-for') || 'anon';
  const rl = await checkRateLimit(`gc:public:points-summary:${ip}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 503 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [{ data: allRows, error: allErr }, { data: recentRows }] = await Promise.all([
    supabase
      .from('engagement_points')
      .select('wallet, source, points, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('engagement_points')
      .select('wallet, source, points, created_at')
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  if (allErr) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  const rows = allRows || [];

  // Aggregate stats
  const totalPoints = rows.reduce((s: number, r: any) => s + Number(r.points || 0), 0);
  const uniqueWallets = new Set(rows.map((r: any) => r.wallet).filter(Boolean)).size;

  const todayStartMs = todayStart.getTime();
  const todayPoints = rows
    .filter((r: any) => new Date(r.created_at).getTime() >= todayStartMs)
    .reduce((s: number, r: any) => s + Number(r.points || 0), 0);

  const pendingPoints = rows
    .filter((r: any) => String(r.source || '').startsWith('pending_'))
    .reduce((s: number, r: any) => s + Number(r.points || 0), 0);

  // Points by source
  const sourceMap: Record<string, number> = {};
  for (const r of rows) {
    const src = String(r.source || 'unknown');
    sourceMap[src] = (sourceMap[src] || 0) + Number(r.points || 0);
  }
  const bySource = Object.entries(sourceMap)
    .map(([source, points]) => ({ source, points }))
    .sort((a, b) => b.points - a.points);

  // Daily totals for last 30 days
  const thirtyDaysAgoMs = thirtyDaysAgo.getTime();
  const dayMap: Record<string, number> = {};
  for (const r of rows) {
    const ts = new Date(r.created_at).getTime();
    if (ts < thirtyDaysAgoMs) continue;
    const day = new Date(r.created_at).toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + Number(r.points || 0);
  }
  // Fill all 30 days (0 for missing days)
  const daily: Array<{ day: string; points: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    daily.push({ day, points: dayMap[day] || 0 });
  }

  return withPublicCache(
    NextResponse.json({
      ok: true,
      stats: {
        total_points: totalPoints,
        unique_wallets: uniqueWallets,
        points_today: todayPoints,
        pending_points: pendingPoints,
      },
      by_source: bySource,
      daily,
      recent: recentRows || [],
    }),
    { sMaxAge: 300, staleWhileRevalidate: 600 },
  );
}
