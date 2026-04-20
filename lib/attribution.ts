/**
 * Gas Network Piece 5 — Conversion Attribution.
 *
 * Append-only event ledger that traces a user journey back to its source
 * tweet. Each stage is recorded once per (tweet × wallet) via
 * recordAttributionEvent(); buildFunnel() rolls them into a 5-stage
 * funnel view suitable for the admin dashboard and the v1 API
 * attribution block.
 *
 * Wired call sites (fire-and-forget — never block the hot path):
 *   - referral_clicks insert  → 'wallet_connect' stage
 *   - claims/submit           → 'submission' stage
 *   - payout-worker success   → 'payout' stage
 *   - score-engagement        → 'impression' stage (hourly snapshot)
 */

import { getSupabaseAdmin } from './supabase';

export type AttributionStage =
  | 'impression'
  | 'profile_click'
  | 'wallet_connect'
  | 'submission'
  | 'payout';

/** Canonical ordering of stages — never reorder without migrating the UI. */
export const STAGE_ORDER: readonly AttributionStage[] = [
  'impression',
  'profile_click',
  'wallet_connect',
  'submission',
  'payout',
] as const;

export interface AttributionEvent {
  stage: AttributionStage;
  referred_wallet: string | null;
  occurred_at: string;
  metadata?: Record<string, unknown>;
}

export interface FunnelStage {
  stage: AttributionStage;
  count: number;
  uniqueWallets: number;
  /** Fraction of stage[0] that reached this stage. 0–1. */
  conversionFromTop: number;
  /** Fraction of prior stage that advanced. 0–1. */
  conversionFromPrevious: number;
}

/**
 * Record a single attribution event. Always fire-and-forget — failures
 * never interrupt the calling flow.
 */
export async function recordAttributionEvent(
  sourceTweetId: string,
  stage: AttributionStage,
  referredWallet: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!sourceTweetId) return;
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('attribution_events').insert({
      source_tweet_id: sourceTweetId,
      stage,
      referred_wallet: referredWallet,
      metadata: metadata || null,
    });
  } catch {
    // Swallow. Attribution is telemetry, not business logic.
  }
}

/**
 * Pure funnel builder — takes a list of events and returns the 5-stage
 * summary. Deterministic + sync so it's easy to unit-test.
 */
export function buildFunnel(events: AttributionEvent[]): FunnelStage[] {
  const buckets: Record<AttributionStage, { count: number; wallets: Set<string> }> = {
    impression:     { count: 0, wallets: new Set() },
    profile_click:  { count: 0, wallets: new Set() },
    wallet_connect: { count: 0, wallets: new Set() },
    submission:     { count: 0, wallets: new Set() },
    payout:         { count: 0, wallets: new Set() },
  };

  for (const e of events) {
    if (!buckets[e.stage]) continue;
    buckets[e.stage].count++;
    if (e.referred_wallet) buckets[e.stage].wallets.add(e.referred_wallet);
  }

  const topCount = buckets.impression.count;
  let prevCount = topCount;

  return STAGE_ORDER.map((stage) => {
    const b = buckets[stage];
    const conversionFromTop = topCount > 0 ? b.count / topCount : 0;
    const conversionFromPrevious = prevCount > 0 ? b.count / prevCount : 0;
    prevCount = b.count;
    return {
      stage,
      count: b.count,
      uniqueWallets: b.wallets.size,
      conversionFromTop,
      conversionFromPrevious,
    };
  });
}

/**
 * Load the funnel for a specific tweet from Supabase.
 */
export async function getFunnelForTweet(tweetId: string): Promise<FunnelStage[]> {
  if (!tweetId) return buildFunnel([]);
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('attribution_events')
      .select('stage, referred_wallet, occurred_at, metadata')
      .eq('source_tweet_id', tweetId);
    return buildFunnel((data || []) as AttributionEvent[]);
  } catch {
    return buildFunnel([]);
  }
}
