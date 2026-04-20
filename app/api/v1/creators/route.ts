import { NextResponse } from 'next/server';
import { gateRequest, filterForTier } from '../../../../lib/api-gating';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/creators
 * Free: top 20 by followers, handle + basic counts only
 * Builder+: filterable by min_impact + min_followers; more fields
 */
export async function GET(req: Request) {
  const gate = await gateRequest(req, 'free');
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status || 403, headers: quotaHeaders(gate) },
    );
  }

  const url = new URL(req.url);
  const minImpact = Number(url.searchParams.get('min_impact') || 0);
  const minFollowers = Number(url.searchParams.get('min_followers') || 0);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)));

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('creator_public_view')
    .select('*')
    .order('total_eth_earned', { ascending: false })
    .limit(limit);

  const rows = (data || []).filter((r: any) => {
    if (minFollowers > 0 && Number(r.followers_count || 0) < minFollowers) return false;
    return true;
  });

  // Cross-reference impact from scored_tweets aggregate
  const filtered = await Promise.all(
    rows.map(async (r: any) => {
      const { data: topTweet } = await supabase
        .from('scored_tweets')
        .select('impact_score')
        .eq('wallet', r.wallet)
        .order('impact_score', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const topImpact = Number(topTweet?.impact_score || 0);
      if (minImpact > 0 && topImpact < minImpact) return null;
      return filterForTier({ ...r, impact_score: topImpact }, gate.tier!);
    }),
  );

  return NextResponse.json(
    {
      tier: gate.tier,
      count: filtered.filter(Boolean).length,
      results: filtered.filter(Boolean),
    },
    { headers: quotaHeaders(gate) },
  );
}

function quotaHeaders(gate: { remaining?: number; resetSec?: number; tier?: string }) {
  const h: Record<string, string> = {};
  if (gate.remaining != null) h['x-gascoin-quota-remaining'] = String(gate.remaining);
  if (gate.resetSec != null) h['x-gascoin-quota-reset'] = String(gate.resetSec);
  if (gate.tier) h['x-gascoin-tier'] = gate.tier;
  return h;
}
