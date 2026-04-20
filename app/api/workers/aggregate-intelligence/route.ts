import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { addMemory, searchMemories, refreshFlagCache } from '../../../../lib/mem0';
import { writeIntelligence } from '../../../../lib/knowledge-base';
import { callGrok, isGrokAvailable } from '../../../../lib/integrations/grok';

/**
 * Daily Intelligence Aggregator
 *
 * Runs daily at 7am UTC (after award-points at 6am).
 * Synthesizes cross-pipeline signals, refreshes Redis flag caches,
 * and generates weekly intelligence reports.
 *
 * Phase 1: Daily synthesis — active wallets → mem0 narratives
 * Phase 2: Cross-pipeline patterns — detect multi-pipeline anomalies
 * Phase 3: Weekly report (Sundays) — executive summary to knowledge_base
 * Phase 4: Cache refresh — warm Redis for next day's submission pipeline
 */

// Grok + mem0 synthesis calls — bump timeout to 60s
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  }

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const yesterdayStart = new Date(now.getTime() - 24 * 3600000).toISOString();

  // ─── Phase 1: Daily synthesis ───
  // Find all wallets with activity in last 24 hours
  const { data: activeClaims } = await supabase
    .from('claims')
    .select('wallet, status, risk_score')
    .gte('created_at', yesterdayStart);

  const { data: activePayouts } = await supabase
    .from('payouts')
    .select('wallet, amount_eth, status')
    .gte('created_at', yesterdayStart);

  const { data: activePoints } = await supabase
    .from('engagement_points')
    .select('wallet, source, points')
    .gte('created_at', yesterdayStart);

  const activeWallets = new Set<string>();
  for (const c of activeClaims || []) activeWallets.add(c.wallet);
  for (const p of activePayouts || []) activeWallets.add(p.wallet);
  for (const e of activePoints || []) activeWallets.add(e.wallet);

  let synthesized = 0;
  for (const wallet of activeWallets) {
    const claims = (activeClaims || []).filter((c: any) => c.wallet === wallet);
    const payouts = (activePayouts || []).filter((p: any) => p.wallet === wallet);
    const points = (activePoints || []).filter((e: any) => e.wallet === wallet);
    const totalPoints = points.reduce((s: number, e: any) => s + Number(e.points || 0), 0);
    const totalEth = payouts.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount_eth || 0), 0);

    addMemory('wallet', wallet,
      `Daily ${todayKey}: ${claims.length} claims, ${payouts.length} payouts (${totalEth} ETH), ${totalPoints} points. ` +
      `Statuses: ${claims.map((c: any) => c.status).join(',')}`,
      { pipeline: 'intelligence', date: todayKey },
    ).catch(() => {});

    synthesized++;
  }

  // ─── Phase 2: Cross-pipeline pattern detection ───
  // Check recent intelligence entries for escalations
  const { data: recentIntel } = await supabase
    .from('intelligence_entries')
    .select('entry_type, entity_type, entity_id, summary, severity')
    .gte('created_at', yesterdayStart)
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(100);

  // Group by entity to detect multi-pipeline signals
  const entitySignals = new Map<string, string[]>();
  for (const entry of recentIntel || []) {
    if (entry.entity_id) {
      const key = `${entry.entity_type}:${entry.entity_id}`;
      if (!entitySignals.has(key)) entitySignals.set(key, []);
      entitySignals.get(key)!.push(entry.entry_type);
    }
  }

  let crossPipelineAlerts = 0;
  for (const [entity, signals] of entitySignals) {
    const uniqueTypes = new Set(signals);
    if (uniqueTypes.size >= 2) {
      writeIntelligence({
        entry_type: 'cross_pipeline_alert',
        entity_type: entity.split(':')[0],
        entity_id: entity.split(':').slice(1).join(':'),
        summary: `Multi-signal alert: ${[...uniqueTypes].join(', ')} in last 24h`,
        detail_json: { signals: [...uniqueTypes], count: signals.length },
        severity: 'critical',
        pipeline_source: 'aggregate_intelligence',
      }).catch(() => {});
      crossPipelineAlerts++;
    }
  }

  // ─── Phase 3: Weekly report (Sundays only) ───
  let weeklyReport = '';
  if (now.getUTCDay() === 0 && isGrokAvailable()) {
    try {
      const { data: weekIntel } = await supabase
        .from('intelligence_entries')
        .select('entry_type, severity, summary')
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 3600000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      const criticals = (weekIntel || []).filter((e: any) => e.severity === 'critical').length;
      const warnings = (weekIntel || []).filter((e: any) => e.severity === 'warning').length;
      const types = [...new Set((weekIntel || []).map((e: any) => e.entry_type))];

      const grokRes = await callGrok(
        `Generate a 3-4 sentence executive intelligence summary for GASCOIN protocol week ending ${todayKey}. ` +
        `Stats: ${criticals} critical alerts, ${warnings} warnings. Alert types: ${types.join(', ')}. ` +
        `Top summaries: ${(weekIntel || []).slice(0, 10).map((e: any) => e.summary).join('; ')}. ` +
        `Focus on actionable patterns and risk trends.`,
        { maxTokens: 300 },
      );

      if (grokRes.ok) {
        weeklyReport = grokRes.content;
        await supabase.from('knowledge_base').upsert({
          category: 'intelligence_report',
          slug: `weekly-report-${todayKey}`,
          title: `Weekly Intelligence Report — ${todayKey}`,
          content: weeklyReport,
          tags: ['weekly', 'intelligence', 'automated'],
          source: 'pipeline',
          version: 1,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'slug' });
      }
    } catch {}
  }

  // ─── Phase 4: Refresh Redis flag caches ───
  // Warm cache for the most active wallets
  const walletsToRefresh = [...activeWallets].slice(0, 100);
  let cacheRefreshed = 0;
  for (const wallet of walletsToRefresh) {
    await refreshFlagCache(wallet);
    cacheRefreshed++;
  }

  return NextResponse.json({
    ok: true,
    date: todayKey,
    activeWallets: activeWallets.size,
    synthesized,
    crossPipelineAlerts,
    cacheRefreshed,
    weeklyReport: weeklyReport ? 'generated' : 'skipped',
  });
}

// Vercel Cron sends GET requests; delegate to the POST handler above.
export const GET = POST;
