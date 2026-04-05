import { describe, it, expect } from 'vitest';
import {
  calculateEngagementPoints, calculateStreakBonus, getRankMultiplier,
  pointsToSol, getMaxRefundWithMultiplier, calculateFullBreakdown,
  ENGAGEMENT_REWARDS_CONFIG,
} from '@/lib/engagement-rewards';

describe('calculateEngagementPoints', () => {
  it('returns 0 for zero metrics', () => {
    expect(calculateEngagementPoints({ impressions: 0, likes: 0, retweets: 0, quote_tweets: 0, replies: 0 })).toBe(0);
  });

  it('weights quote tweets highest', () => {
    const qt = calculateEngagementPoints({ impressions: 0, likes: 0, retweets: 0, quote_tweets: 1, replies: 0 });
    const rt = calculateEngagementPoints({ impressions: 0, likes: 0, retweets: 1, quote_tweets: 0, replies: 0 });
    const like = calculateEngagementPoints({ impressions: 0, likes: 1, retweets: 0, quote_tweets: 0, replies: 0 });
    expect(qt).toBeGreaterThan(rt);
    expect(rt).toBeGreaterThan(like);
  });

  it('calculates correctly for a viral tweet', () => {
    const pts = calculateEngagementPoints({ impressions: 50000, likes: 500, retweets: 200, quote_tweets: 50, replies: 100 });
    const c = ENGAGEMENT_REWARDS_CONFIG;
    const expected = 50000 * c.POINTS_PER_IMPRESSION + 500 * c.POINTS_PER_LIKE + 200 * c.POINTS_PER_RETWEET + 50 * c.POINTS_PER_QUOTE_TWEET + 100 * c.POINTS_PER_REPLY;
    expect(pts).toBe(expected);
  });
});

describe('calculateStreakBonus', () => {
  it('returns 0 for 0 windows', () => { expect(calculateStreakBonus(0)).toBe(0); });
  it('caps at MAX_STREAK_MULTIPLIER', () => {
    const capped = calculateStreakBonus(100);
    const max = calculateStreakBonus(ENGAGEMENT_REWARDS_CONFIG.MAX_STREAK_MULTIPLIER);
    expect(capped).toBe(max);
  });
});

describe('getRankMultiplier', () => {
  it('rank 1 gets highest multiplier', () => {
    expect(getRankMultiplier(1)).toBe(ENGAGEMENT_REWARDS_CONFIG.RANK_MULTIPLIERS[0].multiplier);
  });
  it('rank 100 gets default', () => {
    expect(getRankMultiplier(100)).toBe(ENGAGEMENT_REWARDS_CONFIG.DEFAULT_MULTIPLIER);
  });
  it('rank 5 gets tier 2 multiplier', () => {
    expect(getRankMultiplier(5)).toBe(ENGAGEMENT_REWARDS_CONFIG.RANK_MULTIPLIERS[1].multiplier);
  });
});

describe('pointsToSol', () => {
  it('returns 0 when payout disabled', () => {
    // PAYOUT_ENABLED is false by default
    expect(pointsToSol(100000)).toBe(0);
  });
  it('returns 0 below minimum', () => {
    expect(pointsToSol(ENGAGEMENT_REWARDS_CONFIG.MIN_POINTS_FOR_PAYOUT - 1)).toBe(0);
  });
});

describe('getMaxRefundWithMultiplier', () => {
  it('applies multiplier to base refund', () => {
    const result = getMaxRefundWithMultiplier(1.0, 1); // Fleet base, rank 1
    expect(result).toBeGreaterThan(1.0);
  });
  it('returns base for unranked', () => {
    expect(getMaxRefundWithMultiplier(0.10, 999)).toBe(0.10);
  });
});

describe('calculateFullBreakdown', () => {
  it('sums all point sources', () => {
    const b = calculateFullBreakdown({
      impressions: 1000, likes: 10, retweets: 5, quote_tweets: 2, replies: 3,
      approvedSubmissions: 1, consecutiveWindows: 2, referralConversions: 1,
    });
    expect(b.totalPoints).toBeGreaterThan(0);
    expect(b.totalPoints).toBe(
      b.impressionPoints + b.likePoints + b.retweetPoints + b.quotePoints +
      b.replyPoints + b.submissionPoints + b.streakPoints + b.referralPoints
    );
  });
  it('reports payout disabled', () => {
    const b = calculateFullBreakdown({ impressions: 0, likes: 0, retweets: 0, quote_tweets: 0, replies: 0, approvedSubmissions: 0, consecutiveWindows: 0, referralConversions: 0 });
    expect(b.payoutEnabled).toBe(false);
  });
});
