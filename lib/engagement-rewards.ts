// ═══════════════════════════════════════════
// GASCOIN Points System
//
// SOL payouts are for gas receipts ONLY.
// Everything else earns POINTS:
//   - Tweet engagement (impressions, likes, RTs, quotes, replies)
//   - Referral conversions
//   - Submission streaks
//   - GASCOIN holdings bonus
//
// Points drive leaderboard rank, badges, and status.
// Points do NOT convert to SOL.
// ═══════════════════════════════════════════

export const POINTS_CONFIG = {
  // ─── Tweet engagement points ───
  POINTS_PER_IMPRESSION: 1,
  POINTS_PER_LIKE: 50,
  POINTS_PER_RETWEET: 250,
  POINTS_PER_QUOTE_TWEET: 500,
  POINTS_PER_REPLY: 100,

  // ─── Referral points ───
  POINTS_PER_REFERRAL_CONVERSION: 500,

  // ─── Submission points ───
  POINTS_PER_APPROVED_SUBMISSION: 1000,

  // ─── Streak bonus ───
  POINTS_PER_STREAK_WINDOW: 500,    // Per consecutive 30-day submission window
  MAX_STREAK_MULTIPLIER: 5,          // Cap at 5x

  // ─── GASCOIN holdings bonus ───
  // Bonus points per scoring cycle based on tier
  POINTS_PER_CYCLE_STANDARD: 0,
  POINTS_PER_CYCLE_COMMUTER: 100,
  POINTS_PER_CYCLE_ROAD_WARRIOR: 300,
  POINTS_PER_CYCLE_FLEET: 750,
} as const;

// ─── Points calculation ───

export function calculateEngagementPoints(metrics: {
  impressions: number;
  likes: number;
  retweets: number;
  quote_tweets: number;
  replies: number;
}): number {
  const c = POINTS_CONFIG;
  return (
    metrics.impressions * c.POINTS_PER_IMPRESSION +
    metrics.likes * c.POINTS_PER_LIKE +
    metrics.retweets * c.POINTS_PER_RETWEET +
    metrics.quote_tweets * c.POINTS_PER_QUOTE_TWEET +
    metrics.replies * c.POINTS_PER_REPLY
  );
}

export function calculateStreakBonus(consecutiveWindows: number): number {
  const capped = Math.min(consecutiveWindows, POINTS_CONFIG.MAX_STREAK_MULTIPLIER);
  return capped * POINTS_CONFIG.POINTS_PER_STREAK_WINDOW;
}

// ─── Full breakdown ───

export interface PointsBreakdown {
  impressionPoints: number;
  likePoints: number;
  retweetPoints: number;
  quotePoints: number;
  replyPoints: number;
  submissionPoints: number;
  streakPoints: number;
  referralPoints: number;
  holdingsPoints: number;
  totalPoints: number;
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
  holdingsPointsPerCycle: number;
}): PointsBreakdown {
  const c = POINTS_CONFIG;

  const impressionPoints = params.impressions * c.POINTS_PER_IMPRESSION;
  const likePoints = params.likes * c.POINTS_PER_LIKE;
  const retweetPoints = params.retweets * c.POINTS_PER_RETWEET;
  const quotePoints = params.quote_tweets * c.POINTS_PER_QUOTE_TWEET;
  const replyPoints = params.replies * c.POINTS_PER_REPLY;
  const submissionPoints = params.approvedSubmissions * c.POINTS_PER_APPROVED_SUBMISSION;
  const streakPoints = calculateStreakBonus(params.consecutiveWindows);
  const referralPoints = params.referralConversions * c.POINTS_PER_REFERRAL_CONVERSION;
  const holdingsPoints = params.holdingsPointsPerCycle;

  const totalPoints = impressionPoints + likePoints + retweetPoints +
    quotePoints + replyPoints + submissionPoints + streakPoints +
    referralPoints + holdingsPoints;

  return {
    impressionPoints, likePoints, retweetPoints, quotePoints, replyPoints,
    submissionPoints, streakPoints, referralPoints, holdingsPoints, totalPoints,
  };
}
