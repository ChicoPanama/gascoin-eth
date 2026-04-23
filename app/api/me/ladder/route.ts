/**
 * /api/me/ladder — the unified perks ladder, per wallet.
 *
 * Returns every rung of the creator pipeline in one response so /perks can
 * render without chaining five fetches. Read-only aggregation — no writes,
 * no side effects. Reuses existing libs; no new SQL.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getTokenBalanceServer } from '../../../../lib/token-balance';
import { TOKEN_TIERS, getTierForBalance, getNextTier, tokensNeededForNextTier } from '../../../../lib/token-tiers';
import { MILESTONES, type Milestone } from '../../../../lib/integrations/reach-certificate';
import { listBriefs, isMarketplaceLive } from '../../../../lib/marketplace';
import {
  mapCompositeToBand,
  getBandSpec,
  nextBand,
  eligibleBriefsForComposite,
  COMPOSITE_BANDS,
} from '../../../../lib/perks-ladder';

export const dynamic = 'force-dynamic';

interface LadderReachRung {
  slug: string;
  label: string;
  description: string;
  axis: Milestone['axis'];
  threshold: number;
  current: number;
  progressPct: number;
  minted: boolean;
  mintedAt: string | null;
  txHash: string | null;
}

interface LadderResponse {
  wallet: string;
  xHandle: string;
  hold: {
    balance: number;
    tier: { id: number; name: string; slug: string };
    nextTier: { id: number; name: string; slug: string; min_tokens: number } | null;
    tokensToNextTier: number;
    progressPct: number;
  };
  earn: {
    pointsLast30: number;
    pointsPrior30: number;
    pointsLifetime: number;
    pointsTrend: 'up' | 'down' | 'flat';
  };
  reach: LadderReachRung[];
  influence: {
    composite: number;
    band: { id: string; label: string; description: string };
    nextBand: { id: string; label: string; min: number } | null;
    axes: {
      payoutPct: number;
      engagementPct: number;
      consistencyPct: number;
      referralPct: number;
    };
    dampeners: { trust: number; recency: number };
    computedAt: string | null;
  };
  market: {
    live: boolean;
    eligibleBriefs: Array<{
      id: number;
      title: string;
      amountUsdc: number;
      deadline: string;
      minCreatorTier: string | null;
    }>;
  };
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(auth, undefined, req.headers.get('cookie'));
  if (!session || !session.xHandle) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const xHandle = session.xHandle.replace(/^@/, '').toLowerCase();
  const supabase = getSupabaseAdmin();

  let wallet = (session.wallet || '').toLowerCase();
  if (!wallet) {
    const { data: link } = await supabase
      .from('wallet_x_links')
      .select('wallet')
      .eq('x_handle', xHandle)
      .eq('is_active', true)
      .maybeSingle();
    wallet = String(link?.wallet || '').toLowerCase();
  }

  // ── Rung 1: Hold (token balance tier) ──────────────────────────────
  let balance = 0;
  if (wallet) {
    try {
      const bal = await getTokenBalanceServer(wallet);
      balance = Number(bal?.balance || 0);
    } catch {
      balance = 0;
    }
  }
  const tier = getTierForBalance(balance);
  const next = getNextTier(tier.id);
  const tokensToNext = tokensNeededForNextTier(balance, tier.id);
  const holdProgress = next
    ? Math.min(100, Math.round(((next.min_tokens - tokensToNext) / next.min_tokens) * 100))
    : 100;

  // ── Parallel fetches for the remaining rungs ───────────────────────
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    pointsLifetimeRes,
    pointsLast30Res,
    pointsPrior30Res,
    impressionsRes,
    paidConvRes,
    compositeRes,
    mintsRes,
    briefsPromise,
  ] = await Promise.all([
    wallet
      ? supabase.from('engagement_points').select('points').eq('wallet', wallet)
      : Promise.resolve({ data: [] as Array<{ points: number }> }),
    wallet
      ? supabase
          .from('engagement_points')
          .select('points')
          .eq('wallet', wallet)
          .gte('created_at', since30)
      : Promise.resolve({ data: [] as Array<{ points: number }> }),
    wallet
      ? supabase
          .from('engagement_points')
          .select('points')
          .eq('wallet', wallet)
          .gte('created_at', since60)
          .lt('created_at', since30)
      : Promise.resolve({ data: [] as Array<{ points: number }> }),
    wallet
      ? supabase.from('scored_tweets').select('impressions').eq('wallet', wallet)
      : Promise.resolve({ data: [] as Array<{ impressions: number }> }),
    wallet
      ? supabase
          .from('referral_summary_view')
          .select('paid_conversions')
          .eq('referrer_wallet', wallet)
          .maybeSingle()
      : Promise.resolve({ data: null as { paid_conversions: number } | null }),
    wallet
      ? supabase
          .from('composite_scores')
          .select('composite, payout_pct, engagement_pct, consistency_pct, referral_pct, trust_dampener, recency_mult, computed_at')
          .eq('wallet', wallet)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
    wallet
      ? supabase
          .from('certificate_mints')
          .select('milestone, status, tx_hash, minted_at')
          .eq('wallet', wallet)
      : Promise.resolve({ data: [] as Array<{ milestone: string; status: string; tx_hash: string | null; minted_at: string | null }> }),
    isMarketplaceLive() ? listBriefs('open') : Promise.resolve([]),
  ]);

  const sumPoints = (rows: Array<{ points: number }> | null | undefined) =>
    (rows || []).reduce((s, r) => s + Number(r.points || 0), 0);

  const pointsLifetime = sumPoints(pointsLifetimeRes.data as any);
  const pointsLast30 = sumPoints(pointsLast30Res.data as any);
  const pointsPrior30 = sumPoints(pointsPrior30Res.data as any);
  const pointsTrend: 'up' | 'down' | 'flat' =
    pointsLast30 > pointsPrior30 ? 'up' : pointsLast30 < pointsPrior30 ? 'down' : 'flat';

  const totalImpressions = ((impressionsRes.data as Array<{ impressions: number }>) || []).reduce(
    (s, r) => s + Number(r.impressions || 0),
    0,
  );
  const paidConversions = Number(
    ((paidConvRes.data as { paid_conversions: number } | null)?.paid_conversions) || 0,
  );

  const composite = Number((compositeRes.data as any)?.composite || 0);
  const band = mapCompositeToBand(composite);
  const bandSpec = getBandSpec(band);
  const nb = nextBand(composite);

  // ── Rung 3: Reach (five certificate milestones) ────────────────────
  const axisValue: Record<Milestone['axis'], number> = {
    total_impressions: totalImpressions,
    composite,
    paid_conversions: paidConversions,
  };
  const mintsByMilestone = new Map<string, { status: string; txHash: string | null; mintedAt: string | null }>(
    ((mintsRes.data as Array<{ milestone: string; status: string; tx_hash: string | null; minted_at: string | null }>) || []).map((m) => [
      String(m.milestone),
      { status: String(m.status), txHash: m.tx_hash ?? null, mintedAt: m.minted_at ?? null },
    ]),
  );
  const reach: LadderReachRung[] = MILESTONES.map((m) => {
    const current = axisValue[m.axis];
    const mint = mintsByMilestone.get(m.slug);
    const minted = mint?.status === 'paid';
    return {
      slug: m.slug,
      label: m.label,
      description: m.description,
      axis: m.axis,
      threshold: m.threshold,
      current,
      progressPct: m.threshold > 0 ? Math.min(100, Math.round((current / m.threshold) * 100)) : 0,
      minted,
      mintedAt: mint?.mintedAt ?? null,
      txHash: mint?.txHash ?? null,
    };
  });

  // ── Rung 5: Marketplace briefs this creator qualifies for ──────────
  const allOpenBriefs = (briefsPromise as Awaited<ReturnType<typeof listBriefs>>) || [];
  const eligible = eligibleBriefsForComposite(composite, allOpenBriefs).slice(0, 10);

  const body: LadderResponse = {
    wallet,
    xHandle,
    hold: {
      balance,
      tier: { id: tier.id, name: tier.name, slug: tier.slug },
      nextTier: next ? { id: next.id, name: next.name, slug: next.slug, min_tokens: next.min_tokens } : null,
      tokensToNextTier: tokensToNext,
      progressPct: holdProgress,
    },
    earn: {
      pointsLast30,
      pointsPrior30,
      pointsLifetime,
      pointsTrend,
    },
    reach,
    influence: {
      composite,
      band: { id: bandSpec.id, label: bandSpec.label, description: bandSpec.description },
      nextBand: nb ? { id: nb.id, label: nb.label, min: nb.min } : null,
      axes: {
        payoutPct: Number((compositeRes.data as any)?.payout_pct || 0),
        engagementPct: Number((compositeRes.data as any)?.engagement_pct || 0),
        consistencyPct: Number((compositeRes.data as any)?.consistency_pct || 0),
        referralPct: Number((compositeRes.data as any)?.referral_pct || 0),
      },
      dampeners: {
        trust: Number((compositeRes.data as any)?.trust_dampener || 1),
        recency: Number((compositeRes.data as any)?.recency_mult || 1),
      },
      computedAt: (compositeRes.data as any)?.computed_at || null,
    },
    market: {
      live: isMarketplaceLive(),
      eligibleBriefs: eligible.map((b) => ({
        id: b.id,
        title: b.title,
        amountUsdc: b.amountUsdc,
        deadline: b.deadline,
        minCreatorTier: b.minCreatorTier,
      })),
    },
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}

// Force referenced so tooling doesn't strip TOKEN_TIERS / COMPOSITE_BANDS.
export const __metadata = { tiers: TOKEN_TIERS.length, bands: COMPOSITE_BANDS.length };
