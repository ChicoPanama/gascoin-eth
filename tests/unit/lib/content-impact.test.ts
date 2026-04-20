import { describe, it, expect } from 'vitest';
import { computeImpactScore } from '@/lib/content-impact';

describe('computeImpactScore', () => {
  it('zero input produces zero score', () => {
    const s = computeImpactScore({
      impressions: 0,
      likes: 0,
      retweets: 0,
      replies: 0,
      quoteTweets: 0,
      directEth: 0,
      referralEth: 0,
      refSignups: 0,
      trustScore: 0,
      qualityScore: 0,
    });
    expect(s.engagementPct).toBe(0);
    expect(s.payoutPct).toBe(0);
    expect(s.referralPct).toBe(0);
    expect(s.impact).toBe(0);
  });

  it('pure engagement tweet scores on engagement axis only', () => {
    const s = computeImpactScore({
      impressions: 50_000, likes: 500, retweets: 50, replies: 20, quoteTweets: 5,
      directEth: 0, referralEth: 0, refSignups: 0,
      trustScore: 75, qualityScore: 0.8,
    });
    expect(s.engagementPct).toBeGreaterThan(0);
    expect(s.payoutPct).toBe(0);
    expect(s.referralPct).toBe(0);
    expect(s.impact).toBeGreaterThan(0);
  });

  it('pure payout tweet scores on payout axis only', () => {
    const s = computeImpactScore({
      impressions: 0, likes: 0, retweets: 0, replies: 0, quoteTweets: 0,
      directEth: 0.04, referralEth: 0, refSignups: 0,
      trustScore: 75, qualityScore: 0.5,
    });
    expect(s.engagementPct).toBe(0);
    expect(s.payoutPct).toBeGreaterThan(0);
    expect(s.referralPct).toBe(0);
    expect(s.impact).toBeGreaterThan(0);
  });

  it('pure referral tweet scores on referral axis only', () => {
    const s = computeImpactScore({
      impressions: 0, likes: 0, retweets: 0, replies: 0, quoteTweets: 0,
      directEth: 0, referralEth: 0.01, refSignups: 5,
      trustScore: 75, qualityScore: 0.5,
    });
    expect(s.engagementPct).toBe(0);
    expect(s.payoutPct).toBe(0);
    expect(s.referralPct).toBeGreaterThan(0);
    expect(s.impact).toBeGreaterThan(0);
  });

  it('all three signals combine additively with trust multiplier', () => {
    const withAll = computeImpactScore({
      impressions: 50_000, likes: 500, retweets: 50, replies: 20, quoteTweets: 5,
      directEth: 0.04, referralEth: 0.01, refSignups: 5,
      trustScore: 100, qualityScore: 1.0,
    });
    const onlyEngagement = computeImpactScore({
      impressions: 50_000, likes: 500, retweets: 50, replies: 20, quoteTweets: 5,
      directEth: 0, referralEth: 0, refSignups: 0,
      trustScore: 100, qualityScore: 1.0,
    });
    expect(withAll.impact).toBeGreaterThan(onlyEngagement.impact);
  });

  it('low trust score dampens final impact', () => {
    const trusted = computeImpactScore({
      impressions: 50_000, likes: 500, retweets: 50, replies: 20, quoteTweets: 5,
      directEth: 0.04, referralEth: 0, refSignups: 0,
      trustScore: 90, qualityScore: 1.0,
    });
    const distrusted = computeImpactScore({
      impressions: 50_000, likes: 500, retweets: 50, replies: 20, quoteTweets: 5,
      directEth: 0.04, referralEth: 0, refSignups: 0,
      trustScore: 20, qualityScore: 1.0,
    });
    expect(trusted.impact).toBeGreaterThan(distrusted.impact);
  });

  it('caps impact at 100', () => {
    const s = computeImpactScore({
      impressions: 100_000_000,
      likes: 1_000_000, retweets: 500_000, replies: 100_000, quoteTweets: 50_000,
      directEth: 10, referralEth: 5, refSignups: 1000,
      trustScore: 100, qualityScore: 1.0,
    });
    expect(s.impact).toBeLessThanOrEqual(100);
  });

  it('never returns negative values', () => {
    const s = computeImpactScore({
      impressions: -1, likes: -1, retweets: -1, replies: -1, quoteTweets: -1,
      directEth: -1, referralEth: -1, refSignups: -1,
      trustScore: -1, qualityScore: -1,
    });
    expect(s.impact).toBeGreaterThanOrEqual(0);
    expect(s.engagementPct).toBeGreaterThanOrEqual(0);
    expect(s.payoutPct).toBeGreaterThanOrEqual(0);
    expect(s.referralPct).toBeGreaterThanOrEqual(0);
  });
});
