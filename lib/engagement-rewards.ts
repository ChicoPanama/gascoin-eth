// ═══════════════════════════════════════════
// GASCOIN Engagement Rewards System
//
// Option A: Leaderboard rank multiplier on receipt refunds (always active)
// Option C: Points-based engagement rewards (SOL payout toggled by admin)
//
// Points model inspired by X creator payouts but at treasury scale.
// Points accumulate → convert to SOL at admin-controlled rate.
// SOL payout is OFF by default. Points still accumulate and display.
// ═══════════════════════════════════════════

export const ENGAGEMENT_REWARDS_CONFIG = {
  // ─── Master switches ───
  POINTS_ENABLED: true,              // Points always accumulate
  PAYOUT_ENABLED: false,             // SOL payout OFF until admin flips this
  LEADERBOARD_MULTIPLIER_ENABLED: true,  // Rank-based refund multiplier always on

  // ─── Points earning rates ───
  // Aggressive rates — virality is the goal, make it worth chasing
  POINTS_PER_IMPRESSION: 1,           // 1000 impressions = 1,000 points
  POINTS_PER_LIKE: 50,               // Every like matters
  POINTS_PER_RETWEET: 250,           // Amplification is gold — 5x a like
  POINTS_PER_QUOTE_TWEET: 500,       // Original content + amplification — the holy grail
  POINTS_PER_REPLY: 100,             // Conversation drives algorithm visibility

  // ─── Streak bonuses ───
  POINTS_PER_STREAK_DAY: 500,        // Significant bonus for consistency
  MAX_STREAK_MULTIPLIER: 5,          // Up to 5 consecutive windows = 2,500 bonus

  // ─── Submission bonus ───
  POINTS_PER_APPROVED_SUBMISSION: 1000, // Big reward for actually submitting

  // ─── Referral bonus (on top of SOL reward) ───
  POINTS_PER_REFERRAL_CONVERSION: 500, // Referrals compound — points + SOL

  // ─── Points → SOL conversion ───
  // Anchored: 1 SOL ≈ a tank of gas in California (~$80-100)
  // Top engaged users should earn toward a tank through virality
  POINTS_TO_SOL_RATE: 2500,          // 2,500 points = 0.01 SOL
  MIN_POINTS_FOR_PAYOUT: 1000,       // Low barrier — first payout achievable fast
  MAX_WEEKLY_PAYOUT_SOL: 0.50,       // Half a tank per week from engagement alone
  PAYOUT_CYCLE: 'weekly' as const,   // Weekly settlement

  // ─── Leaderboard rank multiplier (Option A) ───
  // Applied to max_sol_refund at submission time
  // Fleet base is 1.0 SOL — rank 1 gets 1.5 SOL (more than a full tank)
  RANK_MULTIPLIERS: [
    { minRank: 1, maxRank: 1, multiplier: 1.5 },     // #1: 1.5x (Fleet = 1.5 SOL)
    { minRank: 2, maxRank: 5, multiplier: 1.3 },     // #2-5: 1.3x (Fleet = 1.3 SOL)
    { minRank: 6, maxRank: 10, multiplier: 1.2 },    // #6-10: 1.2x
    { minRank: 11, maxRank: 25, multiplier: 1.1 },   // #11-25: 1.1x
    { minRank: 26, maxRank: 50, multiplier: 1.05 },  // #26-50: 1.05x
  ] as const,
  DEFAULT_MULTIPLIER: 1.0,           // Everyone else: 1x
} as const;

// ─── Helper functions ───

export function calculateEngagementPoints(metrics: {
  impressions: number;
  likes: number;
  retweets: number;
  quote_tweets: number;
  replies: number;
}): number {
  const c = ENGAGEMENT_REWARDS_CONFIG;
  return (
    metrics.impressions * c.POINTS_PER_IMPRESSION +
    metrics.likes * c.POINTS_PER_LIKE +
    metrics.retweets * c.POINTS_PER_RETWEET +
    metrics.quote_tweets * c.POINTS_PER_QUOTE_TWEET +
    metrics.replies * c.POINTS_PER_REPLY
  );
}

export function calculateStreakBonus(consecutiveWindows: number): number {
  const c = ENGAGEMENT_REWARDS_CONFIG;
  const capped = Math.min(consecutiveWindows, c.MAX_STREAK_MULTIPLIER);
  return capped * c.POINTS_PER_STREAK_DAY;
}

export function getRankMultiplier(rank: number): number {
  const c = ENGAGEMENT_REWARDS_CONFIG;
  if (!c.LEADERBOARD_MULTIPLIER_ENABLED) return 1.0;

  for (const tier of c.RANK_MULTIPLIERS) {
    if (rank >= tier.minRank && rank <= tier.maxRank) {
      return tier.multiplier;
    }
  }
  return c.DEFAULT_MULTIPLIER;
}

export function pointsToSol(points: number): number {
  const c = ENGAGEMENT_REWARDS_CONFIG;
  if (!c.PAYOUT_ENABLED) return 0;
  if (points < c.MIN_POINTS_FOR_PAYOUT) return 0;
  const sol = points / c.POINTS_TO_SOL_RATE * 0.01;
  return Math.min(sol, c.MAX_WEEKLY_PAYOUT_SOL);
}

export function getMaxRefundWithMultiplier(baseSolRefund: number, rank: number): number {
  const multiplier = getRankMultiplier(rank);
  return +(baseSolRefund * multiplier).toFixed(4);
}

// ─── Points breakdown for display ───

export interface PointsBreakdown {
  impressionPoints: number;
  likePoints: number;
  retweetPoints: number;
  quotePoints: number;
  replyPoints: number;
  submissionPoints: number;
  streakPoints: number;
  referralPoints: number;
  totalPoints: number;
  solValue: number;
  payoutEnabled: boolean;
}

export function calculateFullBreakdown(params: {
  impressions: number;
  likes: number;
  retweets: number;
  quote_tweets: number;
  replies: number;
  approvedSubmissions: number;
  consecutiveWindows: number;
  referralConversions: number;
}): PointsBreakdown {
  const c = ENGAGEMENT_REWARDS_CONFIG;

  const impressionPoints = params.impressions * c.POINTS_PER_IMPRESSION;
  const likePoints = params.likes * c.POINTS_PER_LIKE;
  const retweetPoints = params.retweets * c.POINTS_PER_RETWEET;
  const quotePoints = params.quote_tweets * c.POINTS_PER_QUOTE_TWEET;
  const replyPoints = params.replies * c.POINTS_PER_REPLY;
  const submissionPoints = params.approvedSubmissions * c.POINTS_PER_APPROVED_SUBMISSION;
  const streakPoints = calculateStreakBonus(params.consecutiveWindows);
  const referralPoints = params.referralConversions * c.POINTS_PER_REFERRAL_CONVERSION;

  const totalPoints = impressionPoints + likePoints + retweetPoints +
    quotePoints + replyPoints + submissionPoints + streakPoints + referralPoints;

  return {
    impressionPoints,
    likePoints,
    retweetPoints,
    quotePoints,
    replyPoints,
    submissionPoints,
    streakPoints,
    referralPoints,
    totalPoints,
    solValue: pointsToSol(totalPoints),
    payoutEnabled: c.PAYOUT_ENABLED,
  };
}
