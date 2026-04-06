// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateEngagementPoints, POINTS_CONFIG } from '@/lib/engagement-rewards';
import { scoreTweetQuality, calculateWalletTrust, verifyPointAward, type TweetQualityScore, type WalletTrustScore } from '@/lib/ai-points-engine';

// ═══════════════════════════════════════════
// END-TO-END USER FLOW TEST
// Simulates: sign in → link X → tweet → engagement scored → points awarded
// ═══════════════════════════════════════════

describe('User Flow: Sign in → Tweet → Engagement Points', () => {
  // Mock a standard trust score for clean users
  const cleanTrust: WalletTrustScore = { score: 60, level: 'trusted', multiplier: 1.0, factors: [] };
  const newTrust: WalletTrustScore = { score: 35, level: 'new', multiplier: 0.8, factors: ['New account (<7 days)'] };
  const suspiciousTrust: WalletTrustScore = { score: 15, level: 'suspicious', multiplier: 0.5, factors: ['High rejection rate'] };
  const veteranTrust: WalletTrustScore = { score: 85, level: 'veteran', multiplier: 1.2, factors: ['5+ approved submissions'] };

  describe('Step 1: Engagement Point Calculation', () => {
    it('calculates points for a real tweet with moderate engagement', () => {
      const pts = calculateEngagementPoints({
        impressions: 3000, likes: 45, retweets: 8, quote_tweets: 2, replies: 12,
      });
      const expected = 3000 * 1 + 45 * 50 + 8 * 250 + 2 * 500 + 12 * 100;
      expect(pts).toBe(expected);
      expect(pts).toBe(9450);
    });

    it('zero engagement = zero points', () => {
      expect(calculateEngagementPoints({ impressions: 0, likes: 0, retweets: 0, quote_tweets: 0, replies: 0 })).toBe(0);
    });

    it('impressions alone earn points', () => {
      const pts = calculateEngagementPoints({ impressions: 10000, likes: 0, retweets: 0, quote_tweets: 0, replies: 0 });
      expect(pts).toBe(10000);
    });
  });

  describe('Step 2: Tweet Quality Scoring (heuristic layer)', () => {
    it('detects hashtag-only spam', async () => {
      const result = await scoreTweetQuality({
        tweetText: '#gascoin #crypto #sol',
        impressions: 100, likes: 5, retweets: 1, replies: 0, followerCount: 50,
      });
      expect(result.isSpam).toBe(true);
      expect(result.multiplier).toBeLessThanOrEqual(0.2);
    });

    it('detects bot engagement (low followers, massive likes)', async () => {
      const result = await scoreTweetQuality({
        tweetText: 'Submitting my gas receipt now #gascoin',
        impressions: 100000, likes: 50000, retweets: 10000, replies: 5000, followerCount: 30,
      });
      expect(result.isBotEngagement).toBe(true);
      expect(result.multiplier).toBeLessThanOrEqual(0.3);
    });

    it('passes genuine tweet with normal engagement', async () => {
      const result = await scoreTweetQuality({
        tweetText: 'Gas prices at $4.89 today, at least #gascoin is giving real money back. Submitted my receipt.',
        impressions: 2000, likes: 30, retweets: 5, replies: 3, followerCount: 400,
      });
      expect(result.isSpam).toBe(false);
      expect(result.isBotEngagement).toBe(false);
      expect(result.multiplier).toBeGreaterThanOrEqual(0.7);
    });

    it('handles empty tweet text', async () => {
      const result = await scoreTweetQuality({
        tweetText: '',
        impressions: 100, likes: 5, retweets: 1, replies: 0, followerCount: 100,
      });
      // Empty text shouldn't crash, returns default
      expect(result.multiplier).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('Step 3: Pre-Award Verification Gate', () => {
    it('clean award from trusted wallet passes instantly', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsWallet1111111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: 5000,
        metadata: { tweet_id: '123' },
        walletTrust: cleanTrust,
        totalPointsToday: 0,
        totalPointsAllTime: 10000,
      });
      expect(result.approved).toBe(true);
      expect(result.holdForReview).toBe(false);
      expect(result.adjustedPoints).toBe(5000); // 1.0x trust multiplier
      expect(result.flags).toHaveLength(0);
    });

    it('new wallet gets 0.8x multiplier', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsNewWallet1111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: 1000,
        metadata: {},
        walletTrust: newTrust,
        totalPointsToday: 0,
        totalPointsAllTime: 0,
      });
      expect(result.adjustedPoints).toBe(800); // 1000 * 0.8
    });

    it('veteran wallet gets 1.2x multiplier', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsVeteran11111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: 1000,
        metadata: {},
        walletTrust: veteranTrust,
        totalPointsToday: 0,
        totalPointsAllTime: 50000,
      });
      expect(result.adjustedPoints).toBe(1200); // 1000 * 1.2
    });

    it('suspicious wallet with high value held for review', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsSuspicious111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: 2000,
        metadata: {},
        walletTrust: suspiciousTrust,
        totalPointsToday: 0,
        totalPointsAllTime: 100,
      });
      expect(result.adjustedPoints).toBe(1000); // 1000 * 0.5
      expect(result.holdForReview).toBe(true);
      expect(result.flags).toContain('suspicious_wallet');
      expect(result.flags).toContain('high_value_suspicious');
    });

    it('suspicious wallet with small value passes (not held)', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsSuspicious111111111111111111111111111111111',
        source: 'holdings_bonus',
        rawPoints: 25, // Standard tier daily
        metadata: {},
        walletTrust: suspiciousTrust,
        totalPointsToday: 0,
        totalPointsAllTime: 100,
      });
      // 25 * 0.5 = 12.5 → 13 (rounded), which is < 500, so NOT held
      expect(result.adjustedPoints).toBeLessThanOrEqual(25);
      expect(result.holdForReview).toBe(false);
    });

    it('spam tweet gets held for review', async () => {
      const spamQuality: TweetQualityScore = {
        quality: 0.1, isSpam: true, isBotEngagement: false, multiplier: 0.2, reason: 'spam',
      };
      const result = await verifyPointAward({
        wallet: 'GAsWallet1111111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: 10000,
        metadata: {},
        walletTrust: cleanTrust,
        tweetQuality: spamQuality,
        totalPointsToday: 0,
        totalPointsAllTime: 5000,
      });
      expect(result.holdForReview).toBe(true);
      expect(result.flags).toContain('spam_tweet');
      expect(result.adjustedPoints).toBeLessThan(10000);
    });

    it('referral ring gets blocked (0 points)', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsRingWallet1111111111111111111111111111111111',
        source: 'referral_conversion',
        rawPoints: 500,
        metadata: {},
        walletTrust: cleanTrust,
        ringDetection: {
          isSuspicious: true, ringType: 'circular', confidence: 0.95,
          wallets: ['a', 'b'], reason: 'A→B→A',
        },
        totalPointsToday: 0,
        totalPointsAllTime: 0,
      });
      expect(result.adjustedPoints).toBe(0);
      expect(result.holdForReview).toBe(true);
      expect(result.flags).toContain('referral_ring_circular');
    });

    it('daily velocity >50K flags non-veteran', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsHighEarner111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: 5000,
        metadata: {},
        walletTrust: cleanTrust,
        totalPointsToday: 48000,
        totalPointsAllTime: 100000,
      });
      expect(result.holdForReview).toBe(true);
      expect(result.flags).toContain('daily_velocity_high');
    });

    it('daily velocity >50K does NOT hold veteran', async () => {
      const result = await verifyPointAward({
        wallet: 'GAsVeteranHigh11111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: 5000,
        metadata: {},
        walletTrust: veteranTrust,
        totalPointsToday: 48000,
        totalPointsAllTime: 500000,
      });
      // Veteran: flagged but NOT held
      expect(result.flags).toContain('daily_velocity_high');
      expect(result.holdForReview).toBe(false);
    });
  });

  describe('Step 4: Full Pipeline Scenarios', () => {
    it('Scenario A: New user, first tweet, modest engagement', async () => {
      // Calculate raw points
      const rawPoints = calculateEngagementPoints({
        impressions: 1500, likes: 20, retweets: 3, quote_tweets: 0, replies: 5,
      });
      expect(rawPoints).toBe(1500 + 1000 + 750 + 0 + 500);
      expect(rawPoints).toBe(3750);

      // Quality check passes
      const quality = await scoreTweetQuality({
        tweetText: 'Just submitted my first gas receipt on #gascoin. This is legit.',
        impressions: 1500, likes: 20, retweets: 3, replies: 5, followerCount: 200,
      });
      expect(quality.isSpam).toBe(false);

      // Verification passes
      const verified = await verifyPointAward({
        wallet: 'NewUser111111111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: Math.round(rawPoints * quality.multiplier),
        metadata: {},
        walletTrust: newTrust,
        totalPointsToday: 0,
        totalPointsAllTime: 0,
      });
      expect(verified.approved).toBe(true);
      // New user: 0.8x trust
      expect(verified.adjustedPoints).toBeLessThanOrEqual(rawPoints);
      expect(verified.adjustedPoints).toBeGreaterThan(0);
    });

    it('Scenario B: Veteran user, viral tweet', async () => {
      const rawPoints = calculateEngagementPoints({
        impressions: 50000, likes: 500, retweets: 150, quote_tweets: 30, replies: 80,
      });

      const quality = await scoreTweetQuality({
        tweetText: 'Gas just hit $5.20 in LA. #gascoin literally saved me $90 this month. Here is how...',
        impressions: 50000, likes: 500, retweets: 150, replies: 80, followerCount: 5000,
      });
      expect(quality.isSpam).toBe(false);
      expect(quality.isBotEngagement).toBe(false);

      const verified = await verifyPointAward({
        wallet: 'VeteranViral1111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: Math.round(rawPoints * quality.multiplier),
        metadata: {},
        walletTrust: veteranTrust,
        totalPointsToday: 5000,
        totalPointsAllTime: 200000,
      });
      expect(verified.approved).toBe(true);
      // Veteran gets 1.2x
      expect(verified.adjustedPoints).toBeGreaterThan(rawPoints * 0.8);
    });

    it('Scenario C: Bot farmer gets caught', async () => {
      const rawPoints = calculateEngagementPoints({
        impressions: 200000, likes: 50000, retweets: 20000, quote_tweets: 5000, replies: 10000,
      });

      const quality = await scoreTweetQuality({
        tweetText: '#gascoin',
        impressions: 200000, likes: 50000, retweets: 20000, replies: 10000, followerCount: 15,
      });
      // Either spam (1 word) or bot engagement (insane ratio)
      expect(quality.isSpam || quality.isBotEngagement).toBe(true);
      expect(quality.multiplier).toBeLessThanOrEqual(0.3);

      const verified = await verifyPointAward({
        wallet: 'BotFarmer1111111111111111111111111111111111111',
        source: 'tweet_engagement',
        rawPoints: Math.round(rawPoints * quality.multiplier),
        metadata: {},
        walletTrust: suspiciousTrust,
        tweetQuality: quality,
        totalPointsToday: 0,
        totalPointsAllTime: 0,
      });
      expect(verified.holdForReview).toBe(true);
      expect(verified.adjustedPoints).toBeLessThan(rawPoints * 0.1);
    });
  });
});
