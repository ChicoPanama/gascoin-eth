/**
 * Phase 5 Open Gas Net API — public standing primitive.
 *
 * A brand, a fellow protocol, a venture fund, or a curious reader hits
 * this endpoint with an X handle and gets back the creator's full
 * topographic position: Composite Score, derived band, Reach Certificates
 * held, and the five milestone progress bars. No wallet is exposed; the
 * canonical key is the lowercased X handle.
 *
 * This is the query layer the whitepaper's "Phase Five Open Gas Net API"
 * section promised. Cache is 5 minutes — the underlying composite is a
 * nightly rebuild, so a 5-minute CDN cache is aggressive enough without
 * serving stale Marketplace gates.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../../lib/supabase';
import { MILESTONES, type Milestone } from '../../../../../../lib/integrations/reach-certificate';
import { mapCompositeToBand, getBandSpec, nextBand } from '../../../../../../lib/perks-ladder';

export const dynamic = 'force-dynamic';

interface StandingReachRung {
  slug: string;
  label: string;
  description: string;
  axis: Milestone['axis'];
  threshold: number;
  current: number;
  progressPct: number;
  minted: boolean;
  mintedAt: string | null;
}

interface PublicStandingResponse {
  handle: string;
  isVerified: boolean;
  firstSeenAt: string | null;
  composite: number;
  band: { id: string; label: string; description: string };
  nextBand: { id: string; label: string; min: number } | null;
  axes: {
    payoutPct: number;
    engagementPct: number;
    consistencyPct: number;
    referralPct: number;
  };
  reach: StandingReachRung[];
  totals: {
    totalImpressions: number;
    totalPosts: number;
    totalPaidClaims: number;
  };
  lastComputedAt: string | null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const { handle: rawHandle } = await ctx.params;
  const handle = (rawHandle || '').replace(/^@/, '').toLowerCase();
  if (!handle) {
    return NextResponse.json({ error: 'handle_required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: creator } = await supabase
    .from('creator_public_view')
    .select('handle, wallet, is_verified, first_seen_at, total_impressions, total_posts, total_paid_claims')
    .eq('handle', handle)
    .maybeSingle();

  if (!creator) {
    return NextResponse.json({ error: 'creator_not_found' }, { status: 404 });
  }

  const wallet = String((creator as any).wallet || '').toLowerCase();

  const [composeRes, paidConvRes, mintsRes] = await Promise.all([
    wallet
      ? supabase
          .from('composite_scores')
          .select('composite, payout_pct, engagement_pct, consistency_pct, referral_pct, computed_at')
          .eq('wallet', wallet)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
    wallet
      ? supabase
          .from('referral_summary_view')
          .select('paid_conversions')
          .eq('referrer_wallet', wallet)
          .maybeSingle()
      : Promise.resolve({ data: null as { paid_conversions: number } | null }),
    wallet
      ? supabase
          .from('certificate_mints')
          .select('milestone, status, minted_at')
          .eq('wallet', wallet)
      : Promise.resolve({ data: [] as Array<{ milestone: string; status: string; minted_at: string | null }> }),
  ]);

  const composite = Number((composeRes.data as any)?.composite || 0);
  const band = mapCompositeToBand(composite);
  const bandSpec = getBandSpec(band);
  const nb = nextBand(composite);

  const totalImpressions = Number((creator as any).total_impressions || 0);
  const paidConversions = Number(
    ((paidConvRes.data as { paid_conversions: number } | null)?.paid_conversions) || 0,
  );

  const axisValue: Record<Milestone['axis'], number> = {
    total_impressions: totalImpressions,
    composite,
    paid_conversions: paidConversions,
  };

  const mintsByMilestone = new Map(
    ((mintsRes.data as Array<{ milestone: string; status: string; minted_at: string | null }>) || []).map((m) => [
      String(m.milestone),
      { status: String(m.status), mintedAt: m.minted_at ?? null },
    ]),
  );

  const reach: StandingReachRung[] = MILESTONES.map((m) => {
    const current = axisValue[m.axis];
    const mint = mintsByMilestone.get(m.slug);
    return {
      slug: m.slug,
      label: m.label,
      description: m.description,
      axis: m.axis,
      threshold: m.threshold,
      current,
      progressPct: m.threshold > 0 ? Math.min(100, Math.round((current / m.threshold) * 100)) : 0,
      minted: mint?.status === 'paid',
      mintedAt: mint?.mintedAt ?? null,
    };
  });

  const body: PublicStandingResponse = {
    handle,
    isVerified: Boolean((creator as any).is_verified),
    firstSeenAt: (creator as any).first_seen_at ?? null,
    composite,
    band: { id: bandSpec.id, label: bandSpec.label, description: bandSpec.description },
    nextBand: nb ? { id: nb.id, label: nb.label, min: nb.min } : null,
    axes: {
      payoutPct: Number((composeRes.data as any)?.payout_pct || 0),
      engagementPct: Number((composeRes.data as any)?.engagement_pct || 0),
      consistencyPct: Number((composeRes.data as any)?.consistency_pct || 0),
      referralPct: Number((composeRes.data as any)?.referral_pct || 0),
    },
    reach,
    totals: {
      totalImpressions,
      totalPosts: Number((creator as any).total_posts || 0),
      totalPaidClaims: Number((creator as any).total_paid_claims || 0),
    },
    lastComputedAt: (composeRes.data as any)?.computed_at || null,
  };

  return NextResponse.json(body, {
    headers: {
      // Public read, handle-keyed, composite rebuilds nightly so 5-min
      // CDN cache is aggressive without serving stale gate decisions.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
