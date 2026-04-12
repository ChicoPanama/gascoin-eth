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

import type { ContentType } from './x-api';

export const POINTS_CONFIG = {
  // ─── Tweet engagement points ───
  // Rebalanced to align with X algorithm: X rewards conversation
  // depth (replies), saves (bookmarks), and new content (quotes).
  // Passive engagement (likes) and reposting (retweets) devalued.
  POINTS_PER_IMPRESSION: 1,
  POINTS_PER_LIKE: 25,
  POINTS_PER_RETWEET: 50,
  POINTS_PER_QUOTE_TWEET: 500,
  POINTS_PER_REPLY: 300,
  POINTS_PER_BOOKMARK: 250,

  // ─── Content type multipliers (aligned with X algorithm) ───
  // X applies up to 90% impression deduction on reposts/third-party content.
  // Original videos with voiceover get maximum distribution.
  CONTENT_TYPE_MULTIPLIER_ORIGINAL_VIDEO: 3.0,
  CONTENT_TYPE_MULTIPLIER_ORIGINAL_IMAGE: 1.5,
  CONTENT_TYPE_MULTIPLIER_TEXT_ONLY: 1.0,
  CONTENT_TYPE_MULTIPLIER_QUOTE: 0.5,
  CONTENT_TYPE_MULTIPLIER_REPOST: 0.1,
  CONTENT_TYPE_MULTIPLIER_EXTERNAL_LINK: 0.3,

  // ─── Referral points ───
  // Flat conversion bonus replaced with ongoing passive model.
  // 100pt welcome bonus when referred user's first claim approved.
  // 2% ongoing passive income from referred users' points (capped).
  REFERRAL_WELCOME_BONUS: 100,
  REFERRAL_PASSIVE_RATE: 0.02,           // 2% of referred users' points
  REFERRAL_PASSIVE_CAP_MONTHLY: 10_000,  // Max passive income per month
  // Legacy — kept for backward compat in tests/types but no longer awarded
  POINTS_PER_REFERRAL_CONVERSION: 500,

  // ─── Submission points ───
  POINTS_PER_APPROVED_SUBMISSION: 1000,

  // ─── Streak bonus ───
  POINTS_PER_STREAK_WINDOW: 500,    // Per consecutive 30-day submission window
  MAX_STREAK_MULTIPLIER: 5,          // Cap at 5x

  // ─── GASCOIN holdings bonus ───
  // Scaled to properly reward token commitment.
  // Whales hold the price — without them the ecosystem is worthless.
  POINTS_PER_CYCLE_STANDARD: 100,
  POINTS_PER_CYCLE_COMMUTER: 500,
  POINTS_PER_CYCLE_ROAD_WARRIOR: 1_500,
  POINTS_PER_CYCLE_FLEET: 5_000,

  // ─── Anti-gaming caps ───
  // Tight caps so no single tweet or day eclipses long-term holders.
  // Fleet whale earns 150K/month from holdings alone — engagement
  // should complement, not dominate.
  MAX_POINTS_PER_TWEET: 5_000,
  MAX_ENGAGEMENT_POINTS_PER_DAY: 10_000,
  MAX_ENGAGEMENT_POINTS_PER_MONTH: 50_000,
} as const;

// ─── Content type multiplier ───

export function getContentTypeMultiplier(contentType: ContentType): number {
  const c = POINTS_CONFIG;
  switch (contentType) {
    case 'original_video': return c.CONTENT_TYPE_MULTIPLIER_ORIGINAL_VIDEO;
    case 'original_image': return c.CONTENT_TYPE_MULTIPLIER_ORIGINAL_IMAGE;
    case 'text_only': return c.CONTENT_TYPE_MULTIPLIER_TEXT_ONLY;
    case 'quote': return c.CONTENT_TYPE_MULTIPLIER_QUOTE;
    case 'repost': return c.CONTENT_TYPE_MULTIPLIER_REPOST;
    case 'has_external_link': return c.CONTENT_TYPE_MULTIPLIER_EXTERNAL_LINK;
    default: return 1.0;
  }
}

// ─── Points calculation ───

export function calculateEngagementPoints(metrics: {
  impressions: number;
  likes: number;
  retweets: number;
  quote_tweets: number;
  replies: number;
  bookmarks: number;
  content_type?: ContentType;
}): number {
  const c = POINTS_CONFIG;
  const base = (
    metrics.impressions * c.POINTS_PER_IMPRESSION +
    metrics.likes * c.POINTS_PER_LIKE +
    metrics.retweets * c.POINTS_PER_RETWEET +
    metrics.quote_tweets * c.POINTS_PER_QUOTE_TWEET +
    metrics.replies * c.POINTS_PER_REPLY +
    metrics.bookmarks * c.POINTS_PER_BOOKMARK
  );
  const contentMultiplier = metrics.content_type ? getContentTypeMultiplier(metrics.content_type) : 1.0;
  const raw = Math.round(base * contentMultiplier);
  return Math.min(raw, c.MAX_POINTS_PER_TWEET);
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
  bookmarkPoints: number;
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
  bookmarks: number;
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
  const bookmarkPoints = params.bookmarks * c.POINTS_PER_BOOKMARK;
  const submissionPoints = params.approvedSubmissions * c.POINTS_PER_APPROVED_SUBMISSION;
  const streakPoints = calculateStreakBonus(params.consecutiveWindows);
  const referralPoints = params.referralConversions * c.POINTS_PER_REFERRAL_CONVERSION;
  const holdingsPoints = params.holdingsPointsPerCycle;

  const totalPoints = impressionPoints + likePoints + retweetPoints +
    quotePoints + replyPoints + bookmarkPoints + submissionPoints + streakPoints +
    referralPoints + holdingsPoints;

  return {
    impressionPoints, likePoints, retweetPoints, quotePoints, replyPoints,
    bookmarkPoints, submissionPoints, streakPoints, referralPoints, holdingsPoints, totalPoints,
  };
}
