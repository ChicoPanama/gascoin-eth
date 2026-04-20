/**
 * Gas Network Piece 2 — Content Impact Scoring.
 *
 * Computes a 0–100 composite "impact" score for every scored tweet,
 * combining three additive signals, each normalized against a
 * generous ceiling, then multiplied by a trust dampener:
 *
 *   1. Engagement — log-scaled weighted sum of impressions / likes /
 *      retweets / replies / quote tweets
 *   2. Payout    — direct ETH paid out on the claim that cited this
 *      tweet as proof
 *   3. Referral  — ETH earned via referral_conversions whose referral
 *      code matches the tweet's originating claim + # referred wallets
 *
 * Trust dampener: low wallet trust → output multiplied by 0.4 floor;
 * high trust → full 1.0. Stops farmers from inflating impact on throw-
 * away accounts. Quality score provides a secondary multiplier (AI-
 * scored content authenticity).
 *
 * Output is capped at 100 so the score is comparable across tweets.
 */

import { getSupabaseAdmin } from './supabase';

export interface ImpactInput {
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quoteTweets: number;
  directEth: number;
  referralEth: number;
  refSignups: number;
  /** 0–100 */
  trustScore: number;
  /** 0–1 */
  qualityScore: number;
}

export interface ImpactResult {
  /** 0–100 composite */
  impact: number;
  /** axis-specific raw scores (before trust multiplier) */
  engagementPct: number;
  payoutPct: number;
  referralPct: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const pos = (v: number) => (v > 0 ? v : 0);

/**
 * Log-scaled engagement component. Normalized such that:
 *   - 100k impressions + 1k likes + 100 retweets ≈ 50
 *   - 10M impressions + 100k likes + 10k retweets ≈ 100
 */
function engagementAxis(i: ImpactInput): number {
  const impressionsLog = Math.log10(1 + pos(i.impressions));      // 0 at 0, 7 at 10M
  const engagementsLog = Math.log10(
    1 + pos(i.likes) + 2 * pos(i.retweets) + 3 * pos(i.replies) + 2 * pos(i.quoteTweets),
  );
  const raw = impressionsLog * 6 + engagementsLog * 8;             // ~50 at ~100k/1k, ~100 at ~10M/100k
  return clamp(raw);
}

/**
 * Payout axis. Normalized against the current Fleet-tier max (0.04 ETH)
 * × a typical multi-submission run. 0.04 ETH ≈ 50; 0.40 ETH = 100.
 */
function payoutAxis(i: ImpactInput): number {
  if (pos(i.directEth) === 0) return 0;
  const raw = (i.directEth / 0.4) * 100;
  return clamp(raw);
}

/**
 * Referral axis. Counts both signups and referral ETH. One signup ≈ 10pts,
 * capped; referral ETH uses same 0.4 ETH = 100 normalization.
 */
function referralAxis(i: ImpactInput): number {
  if (pos(i.refSignups) === 0 && pos(i.referralEth) === 0) return 0;
  const signupsPct = Math.min(50, pos(i.refSignups) * 10);
  const ethPct = Math.min(50, (pos(i.referralEth) / 0.4) * 100);
  return clamp(signupsPct + ethPct);
}

/**
 * Combine axes into a 0–100 composite with trust + quality dampeners.
 *
 * Trust dampener: maps trustScore 0–100 → multiplier 0.4–1.0. Even
 * untrusted accounts keep 40% of their raw score so legitimately new
 * users aren't erased by trust warm-up.
 *
 * Quality dampener: linear 0–1 → 0.6–1.0. Clearly low-quality content
 * (AI spam / farm) is capped at 60% of its raw score.
 */
export function computeImpactScore(input: ImpactInput): ImpactResult {
  const engagementPct = engagementAxis(input);
  const payoutPct = payoutAxis(input);
  const referralPct = referralAxis(input);

  // Additive combine with diminishing returns (all three max out at 100 each,
  // combined cap 100 via clamp).
  const combined = engagementPct * 0.45 + payoutPct * 0.35 + referralPct * 0.20;

  const trustMult = 0.4 + Math.min(1, Math.max(0, input.trustScore) / 100) * 0.6;
  const qualityMult = 0.6 + Math.min(1, Math.max(0, input.qualityScore)) * 0.4;

  const impact = clamp(combined * trustMult * qualityMult);

  return {
    impact,
    engagementPct,
    payoutPct,
    referralPct,
  };
}

// ─── Batch scorer ──────────────────────────────────────────────────────

export interface ScoreAllResult {
  scanned: number;
  scored: number;
  errors: number;
}

/**
 * Scores all tweets whose impact_computed_at is NULL or older than `staleMs`.
 * Pulls aggregates via a single join query per tweet to keep memory bounded.
 */
export async function scoreStaleTweets(limit = 200, staleMs = 60 * 60 * 1000): Promise<ScoreAllResult> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - staleMs).toISOString();

  const { data: stale } = await supabase
    .from('scored_tweets')
    .select('id,wallet,tweet_url,impressions,likes,retweets,replies,quote_tweets,quality_score,impact_computed_at')
    .or(`impact_computed_at.is.null,impact_computed_at.lt.${cutoff}`)
    .order('last_scored_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!stale || stale.length === 0) return { scanned: 0, scored: 0, errors: 0 };

  let scored = 0;
  let errors = 0;

  for (const t of stale) {
    try {
      // Per-wallet trust snapshot via existing helper. Read from
      // user_metrics_history if available for efficiency.
      const { data: trustRow } = await supabase
        .from('user_metrics_history')
        .select('account_quality_score')
        .eq('wallet', t.wallet)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const trustScore = Number(trustRow?.account_quality_score ?? 50);

      // Direct payout aggregate via claims.tweet_url → payouts.
      const { data: directRow } = await supabase
        .from('claims')
        .select('id, referral_code, payouts(amount_eth,status)')
        .eq('wallet', t.wallet)
        .eq('tweet_url', t.tweet_url)
        .maybeSingle();

      type ClaimJoin = { id: string; referral_code: string | null; payouts: Array<{ amount_eth: number; status: string }> };
      const directClaim = directRow as ClaimJoin | null;
      const directEth = (directClaim?.payouts || [])
        .filter((p) => p.status === 'paid')
        .reduce((s: number, p) => s + Number(p.amount_eth || 0), 0);

      // Referral aggregate via claim.referral_code → referral_conversions.
      let referralEth = 0;
      let refSignups = 0;
      if (directClaim?.referral_code) {
        const { data: refRows } = await supabase
          .from('referral_conversions')
          .select('referred_wallet,reward_eth,reward_status')
          .eq('referral_code', directClaim.referral_code);
        const confirmed = (refRows || []).filter((r: any) => r.reward_status === 'dispatched');
        refSignups = confirmed.length;
        referralEth = confirmed.reduce((s, r: any) => s + Number(r.reward_eth || 0), 0);
      }

      const result = computeImpactScore({
        impressions: Number(t.impressions || 0),
        likes: Number(t.likes || 0),
        retweets: Number(t.retweets || 0),
        replies: Number(t.replies || 0),
        quoteTweets: Number(t.quote_tweets || 0),
        directEth,
        referralEth,
        refSignups,
        trustScore,
        qualityScore: Number(t.quality_score || 0.5),
      });

      await supabase
        .from('scored_tweets')
        .update({
          direct_payout_eth: directEth,
          referral_payout_eth: referralEth,
          referred_wallets: refSignups,
          impact_score: result.impact,
          impact_computed_at: new Date().toISOString(),
        })
        .eq('id', t.id);

      scored++;
    } catch {
      errors++;
    }
  }

  return { scanned: stale.length, scored, errors };
}
