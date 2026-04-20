/**
 * Gas Network — Composite Influence Score v2 (adversarial-hardened).
 *
 * Per-account 0–100 influence rating. Unlike per-tweet impact
 * (lib/content-impact.ts), this rolls up an entire wallet's Gas Network
 * footprint into a single number used for creator leaderboards and the
 * marketplace ranking layer.
 *
 * Formula:
 *
 *   rawComposite = 0.40 · Payout_ring_discounted
 *                + 0.30 · Engagement
 *                + 0.15 · Consistency
 *                + 0.15 · Referrals_ring_discounted
 *
 *   Composite = clamp(rawComposite · TrustDampener · RecencyMultiplier, 0, 100)
 *
 * Dampeners (both global, multiplicative):
 *   TrustDampener    0.4–1.0   = 0.4 + (walletTrust/100) · 0.6
 *   RecencyMultiplier 0.5–1.5  = exp(-ln2 · ageDays / 60), scaled to [0.5, 1.5]
 *
 * Self-payout discount: 0.3× for ETH from claimant wallets inside the
 * creator's ring cluster (or equal to the creator). Cross-cluster payouts
 * count at 1.0×. Referral counts are scaled by (1 − ringDensity).
 */

export interface CompositeInput {
  /** Raw engagement points this creator has accumulated (all time). */
  engagementPoints: number;

  /** ETH paid on claims CITING this creator's posts, from claimants NOT in the creator's ring cluster. */
  crossClusterPayoutEth: number;

  /** ETH paid on claims citing this creator's posts, from claimants IN the creator's ring cluster or the creator itself. */
  selfClusterPayoutEth: number;

  /** Unique verified referrals count. */
  referralCount: number;

  /** Ring density 0–1 (see calculateRingDensity). 0 = legit, 1 = tight farming ring. */
  ringDensity: number;

  /** 30-day standard deviation of daily engagement points. Lower σ → higher consistency. */
  dailyEngagementStdDev: number;

  /** 30-day mean of daily engagement points. Used for normalizing σ. */
  dailyEngagementMean: number;

  /** Wallet trust score 0–100 (from calculateWalletTrust). */
  walletTrust: number;

  /** Days since most recent scored activity (tweet, claim, referral). */
  daysSinceLastActivity: number;
}

export interface CompositeResult {
  composite: number;
  payoutPct: number;
  engagementPct: number;
  consistencyPct: number;
  referralPct: number;
  trustDampener: number;
  recencyMult: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const pos = (v: number) => (v > 0 ? v : 0);

export function payoutAxis(input: CompositeInput): number {
  const cross = pos(input.crossClusterPayoutEth);
  const self = pos(input.selfClusterPayoutEth);
  const discountedSelf = self * 0.3 * (1 - clamp(input.ringDensity, 0, 1));
  const effective = cross + discountedSelf;
  if (effective === 0) return 0;
  return clamp((effective / 0.4) * 100);
}

export function engagementAxis(input: CompositeInput): number {
  const pts = pos(input.engagementPoints);
  if (pts === 0) return 0;
  const raw = Math.log10(1 + pts) * 18;
  return clamp(raw);
}

export function consistencyAxis(input: CompositeInput): number {
  const mean = pos(input.dailyEngagementMean);
  const std = pos(input.dailyEngagementStdDev);
  if (mean === 0) return 0;
  const cv = std / mean;
  return clamp((1 - Math.min(1, cv)) * 100);
}

export function referralAxis(input: CompositeInput): number {
  const refs = pos(input.referralCount);
  if (refs === 0) return 0;
  const discounted = refs * (1 - clamp(input.ringDensity, 0, 1));
  return clamp((discounted / 20) * 100);
}

export function trustDampener(walletTrust: number): number {
  const t = Math.max(0, Math.min(100, walletTrust));
  return 0.4 + (t / 100) * 0.6;
}

export function recencyMultiplier(daysSinceLastActivity: number): number {
  const days = Math.max(0, daysSinceLastActivity);
  const decay = Math.pow(0.5, days / 60);
  return 0.5 + Math.min(1, decay) * 1.0;
}

export function computeComposite(input: CompositeInput): CompositeResult {
  const payoutPct = payoutAxis(input);
  const engagementPct = engagementAxis(input);
  const consistencyPct = consistencyAxis(input);
  const referralPct = referralAxis(input);

  const raw =
    payoutPct * 0.40 +
    engagementPct * 0.30 +
    consistencyPct * 0.15 +
    referralPct * 0.15;

  const td = trustDampener(input.walletTrust);
  const rm = recencyMultiplier(input.daysSinceLastActivity);

  const composite = clamp(raw * td * rm);

  return {
    composite,
    payoutPct,
    engagementPct,
    consistencyPct,
    referralPct,
    trustDampener: td,
    recencyMult: rm,
  };
}

import { getSupabaseAdmin } from './supabase';
import { calculateRingDensity, calculateWalletTrust } from './ai-points-engine';

export interface ComputeForWalletOptions {
  client?: ReturnType<typeof getSupabaseAdmin>;
}

export async function computeCompositeForWallet(
  wallet: string,
  opts: ComputeForWalletOptions = {},
): Promise<CompositeResult | null> {
  const supabase = opts.client ?? getSupabaseAdmin();
  const w = wallet.toLowerCase();

  const { data: tweets } = await supabase
    .from('scored_tweets')
    .select('adjusted_points, posted_at, last_scored_at, impact_score')
    .eq('wallet', w);

  const engagementPoints = (tweets || []).reduce(
    (s: number, t: any) => s + Number(t.adjusted_points || 0),
    0,
  );

  let lastActivityMs = 0;
  for (const t of tweets || []) {
    const ts = new Date(t.last_scored_at || t.posted_at || 0).getTime();
    if (ts > lastActivityMs) lastActivityMs = ts;
  }

  const { data: claimsData } = await supabase
    .from('claims')
    .select('id, wallet, tweet_url, referral_code, payouts(amount_eth,status,paid_at)')
    .eq('tweet_url_creator_wallet', w);

  let crossEth = 0;
  let selfEth = 0;
  for (const c of (claimsData as any[]) || []) {
    const claimantSelf = (c.wallet || '').toLowerCase() === w;
    const paid = (c.payouts || [])
      .filter((p: any) => p.status === 'paid')
      .reduce((s: number, p: any) => s + Number(p.amount_eth || 0), 0);
    if (paid > 0) {
      if (claimantSelf) selfEth += paid;
      else crossEth += paid;
      for (const p of c.payouts || []) {
        const ts = new Date(p.paid_at || 0).getTime();
        if (ts > lastActivityMs) lastActivityMs = ts;
      }
    }
  }

  if (!claimsData) {
    const tweetUrls = (tweets || []).map((t: any) => t.tweet_url).filter(Boolean);
    if (tweetUrls.length > 0) {
      const { data: fallback } = await supabase
        .from('claims')
        .select('id, wallet, referral_code, payouts(amount_eth,status,paid_at)')
        .in('tweet_url', tweetUrls);
      for (const c of (fallback as any[]) || []) {
        const claimantSelf = (c.wallet || '').toLowerCase() === w;
        const paid = (c.payouts || [])
          .filter((p: any) => p.status === 'paid')
          .reduce((s: number, p: any) => s + Number(p.amount_eth || 0), 0);
        if (paid > 0) (claimantSelf ? (selfEth += paid) : (crossEth += paid));
      }
    }
  }

  const { data: allRefsData } = await supabase
    .from('referral_conversions')
    .select('referrer_wallet, referred_wallet, created_at, reward_status');

  const allRefs = (allRefsData || []).map((r: any) => ({
    referrer: r.referrer_wallet || '',
    referred: r.referred_wallet || '',
    created_at: r.created_at,
  }));

  const referralCount = allRefs.filter(
    (r) => r.referrer.toLowerCase() === w && (r as any).reward_status !== 'skipped',
  ).length;
  const ringDensity = calculateRingDensity(w, allRefs);

  const cutoff = Date.now() - 30 * 86400000;
  const daily = new Map<string, number>();
  for (const t of tweets || []) {
    const ts = new Date(t.posted_at || 0).getTime();
    if (ts < cutoff) continue;
    const day = new Date(ts).toISOString().slice(0, 10);
    daily.set(day, (daily.get(day) || 0) + Number(t.impact_score || 0));
  }
  const values = Array.from(daily.values());
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const variance = values.length
    ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
    : 0;
  const dailyEngagementStdDev = Math.sqrt(variance);

  const { data: trustInputs } = await supabase
    .from('users')
    .select(
      'total_submissions, approved_submissions, rejected_submissions, referral_count, skipped_referrals, created_at, anomaly_count',
    )
    .eq('wallet', w)
    .maybeSingle();

  let walletTrust = 50;
  if (trustInputs) {
    const ageDays =
      (Date.now() - new Date((trustInputs as any).created_at || Date.now()).getTime()) / 86400000;
    walletTrust = calculateWalletTrust({
      totalSubmissions: Number((trustInputs as any).total_submissions || 0),
      approvedSubmissions: Number((trustInputs as any).approved_submissions || 0),
      rejectedSubmissions: Number((trustInputs as any).rejected_submissions || 0),
      referralConversions: Number((trustInputs as any).referral_count || 0),
      skippedReferrals: Number((trustInputs as any).skipped_referrals || 0),
      accountAgeDays: ageDays,
      anomalyCount: Number((trustInputs as any).anomaly_count || 0),
    }).score;
  }

  const daysSinceLastActivity =
    lastActivityMs > 0 ? (Date.now() - lastActivityMs) / 86400000 : 365;

  const result = computeComposite({
    engagementPoints,
    crossClusterPayoutEth: crossEth,
    selfClusterPayoutEth: selfEth,
    referralCount,
    ringDensity,
    dailyEngagementMean: mean,
    dailyEngagementStdDev,
    walletTrust,
    daysSinceLastActivity,
  });

  return result;
}

export async function persistComposite(
  wallet: string,
  result: CompositeResult,
  client?: ReturnType<typeof getSupabaseAdmin>,
): Promise<void> {
  const supabase = client ?? getSupabaseAdmin();
  await supabase.from('composite_scores').upsert(
    {
      wallet: wallet.toLowerCase(),
      composite: result.composite,
      payout_pct: result.payoutPct,
      engagement_pct: result.engagementPct,
      consistency_pct: result.consistencyPct,
      referral_pct: result.referralPct,
      trust_dampener: result.trustDampener,
      recency_mult: result.recencyMult,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'wallet' },
  );
}
