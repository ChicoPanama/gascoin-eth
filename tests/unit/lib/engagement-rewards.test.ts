import { describe, it, expect } from 'vitest';
import {
  calculateEngagementPoints, calculateStreakBonus, calculateFullBreakdown,
  POINTS_CONFIG,
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
    const c = POINTS_CONFIG;
    const expected = 50000 * c.POINTS_PER_IMPRESSION + 500 * c.POINTS_PER_LIKE + 200 * c.POINTS_PER_RETWEET + 50 * c.POINTS_PER_QUOTE_TWEET + 100 * c.POINTS_PER_REPLY;
    expect(pts).toBe(expected);
  });
});

describe('calculateStreakBonus', () => {
  it('returns 0 for 0 windows', () => { expect(calculateStreakBonus(0)).toBe(0); });
  it('caps at MAX_STREAK_MULTIPLIER', () => {
    const capped = calculateStreakBonus(100);
    const max = calculateStreakBonus(POINTS_CONFIG.MAX_STREAK_MULTIPLIER);
    expect(capped).toBe(max);
  });
  it('scales linearly up to cap', () => {
    expect(calculateStreakBonus(3)).toBe(3 * POINTS_CONFIG.POINTS_PER_STREAK_WINDOW);
  });
});

describe('calculateFullBreakdown', () => {
  it('sums all point sources', () => {
    const b = calculateFullBreakdown({
      impressions: 1000, likes: 10, retweets: 5, quote_tweets: 2, replies: 3,
      approvedSubmissions: 1, consecutiveWindows: 2, referralConversions: 1,
      holdingsPointsPerCycle: 300,
    });
    expect(b.totalPoints).toBeGreaterThan(0);
    expect(b.totalPoints).toBe(
      b.impressionPoints + b.likePoints + b.retweetPoints + b.quotePoints +
      b.replyPoints + b.submissionPoints + b.streakPoints + b.referralPoints + b.holdingsPoints
    );
  });

  it('includes holdings bonus', () => {
    const b = calculateFullBreakdown({
      impressions: 0, likes: 0, retweets: 0, quote_tweets: 0, replies: 0,
      approvedSubmissions: 0, consecutiveWindows: 0, referralConversions: 0,
      holdingsPointsPerCycle: 750,
    });
    expect(b.holdingsPoints).toBe(750);
    expect(b.totalPoints).toBe(750);
  });

  it('has no SOL conversion — points only', () => {
    const b = calculateFullBreakdown({
      impressions: 100000, likes: 1000, retweets: 500, quote_tweets: 100, replies: 200,
      approvedSubmissions: 5, consecutiveWindows: 5, referralConversions: 10,
      holdingsPointsPerCycle: 750,
    });
    expect(b).not.toHaveProperty('solValue');
    expect(b).not.toHaveProperty('payoutEnabled');
  });
});
