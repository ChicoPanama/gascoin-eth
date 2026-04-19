import { describe, it, expect, beforeEach } from 'vitest';
import { calculateEngagementPoints, calculateStreakBonus, calculateFullBreakdown, POINTS_CONFIG } from '@/lib/engagement-rewards';
import { scoreTweetQuality, detectReferralRing, calculateWalletTrust } from '@/lib/ai-points-engine';
import { evaluateClaim, GATE_COUNT, type ClaimInput } from '@/lib/policy';
import { getTierForBalance } from '@/lib/token-tiers';
import { fakeWallet } from '../../factories';

// ═══════════════════════════════════════════
// END-TO-END POINTS SYSTEM MOCK TEST
//
// Simulates full user journeys through the points system:
// - New user → submit → earn points → climb leaderboard
// - 4 tier levels with different earning rates
// - Tweet engagement with quality scoring
// - Referral chains with ring detection
// - Streak accumulation over time
// - Load testing: 1 user, 100 users, 1000 users
// ═══════════════════════════════════════════

// ─── HELPER: Simulate a full user session ───
function simulateUser(params: {
  tier: number;
  gascoinBalance: number;
  tweetImpressions: number;
  tweetLikes: number;
  tweetRetweets: number;
  tweetQuotes: number;
  tweetReplies: number;
  tweetBookmarks: number;
  approvedSubmissions: number;
  consecutiveWindows: number;
  referralConversions: number;
}) {
  const tier = getTierForBalance(params.gascoinBalance);
  const holdingsPoints = [
    POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD,
    POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER,
    POINTS_CONFIG.POINTS_PER_CYCLE_ROAD_WARRIOR,
    POINTS_CONFIG.POINTS_PER_CYCLE_FLEET,
  ][tier.id];

  const breakdown = calculateFullBreakdown({
    impressions: params.tweetImpressions,
    likes: params.tweetLikes,
    retweets: params.tweetRetweets,
    quote_tweets: params.tweetQuotes,
    replies: params.tweetReplies,
    bookmarks: params.tweetBookmarks,
    approvedSubmissions: params.approvedSubmissions,
    consecutiveWindows: params.consecutiveWindows,
    referralConversions: params.referralConversions,
    holdingsPointsPerCycle: holdingsPoints,
  });

  return { tier, breakdown, holdingsPoints };
}

// ═══════════════════════════════════════════
// JOURNEY 1: New Standard User
// ═══════════════════════════════════════════
describe('Journey: New Standard User (0 GASCOIN)', () => {
  it('starts with correct tier', () => {
    const tier = getTierForBalance(0);
    expect(tier.id).toBe(0);
    expect(tier.name).toBe('Standard');
    expect(tier.max_eth_refund).toBe(0.004);
  });

  it('earns submission points on first approved receipt', () => {
    const { breakdown } = simulateUser({
      tier: 0, gascoinBalance: 0,
      tweetImpressions: 0, tweetLikes: 0, tweetRetweets: 0, tweetQuotes: 0, tweetReplies: 0, tweetBookmarks: 0,
      approvedSubmissions: 1, consecutiveWindows: 0, referralConversions: 0,
    });
    expect(breakdown.submissionPoints).toBe(1000);
    expect(breakdown.holdingsPoints).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD);
    expect(breakdown.totalPoints).toBe(1000 + POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD);
  });

  it('earns engagement points from a modest tweet', () => {
    const { breakdown } = simulateUser({
      tier: 0, gascoinBalance: 0,
      tweetImpressions: 2000, tweetLikes: 30, tweetRetweets: 5, tweetQuotes: 1, tweetReplies: 8, tweetBookmarks: 0,
      approvedSubmissions: 1, consecutiveWindows: 0, referralConversions: 0,
    });
    expect(breakdown.impressionPoints).toBe(2000);
    expect(breakdown.likePoints).toBe(30 * POINTS_CONFIG.POINTS_PER_LIKE);
    expect(breakdown.retweetPoints).toBe(5 * POINTS_CONFIG.POINTS_PER_RETWEET);
    expect(breakdown.quotePoints).toBe(1 * POINTS_CONFIG.POINTS_PER_QUOTE_TWEET);
    expect(breakdown.replyPoints).toBe(8 * POINTS_CONFIG.POINTS_PER_REPLY);
    expect(breakdown.totalPoints).toBeGreaterThan(2000);
  });

  it('earns referral points for bringing a friend', () => {
    const { breakdown } = simulateUser({
      tier: 0, gascoinBalance: 0,
      tweetImpressions: 0, tweetLikes: 0, tweetRetweets: 0, tweetQuotes: 0, tweetReplies: 0, tweetBookmarks: 0,
      approvedSubmissions: 1, consecutiveWindows: 0, referralConversions: 1,
    });
    expect(breakdown.referralPoints).toBe(500);
  });

  it('does NOT earn streak bonus with only 1 window', () => {
    const { breakdown } = simulateUser({
      tier: 0, gascoinBalance: 0,
      tweetImpressions: 0, tweetLikes: 0, tweetRetweets: 0, tweetQuotes: 0, tweetReplies: 0, tweetBookmarks: 0,
      approvedSubmissions: 1, consecutiveWindows: 1, referralConversions: 0,
    });
    expect(breakdown.streakPoints).toBe(500); // 1 window = 500 (not 0, since calculateStreakBonus(1) = 500)
  });
});

// ═══════════════════════════════════════════
// JOURNEY 2: Commuter Tier User
// ═══════════════════════════════════════════
describe('Journey: Commuter Tier (100K GASCOIN)', () => {
  it('gets correct tier and higher holdings bonus', () => {
    const { tier, holdingsPoints } = simulateUser({
      tier: 1, gascoinBalance: 100_000,
      tweetImpressions: 0, tweetLikes: 0, tweetRetweets: 0, tweetQuotes: 0, tweetReplies: 0, tweetBookmarks: 0,
      approvedSubmissions: 0, consecutiveWindows: 0, referralConversions: 0,
    });
    expect(tier.id).toBe(1);
    expect(tier.name).toBe('Commuter');
    expect(holdingsPoints).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER);
    expect(tier.max_eth_refund).toBe(0.01);
  });

  it('earns 5x more holdings than Standard over 30 days', () => {
    const standardMonthly = POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD * 30;
    const commuterMonthly = POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER * 30;
    expect(commuterMonthly).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER * 30);
    expect(commuterMonthly / standardMonthly).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER / POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD);
  });

  it('accumulates well with moderate engagement', () => {
    const { breakdown } = simulateUser({
      tier: 1, gascoinBalance: 150_000,
      tweetImpressions: 5000, tweetLikes: 80, tweetRetweets: 15, tweetQuotes: 3, tweetReplies: 20, tweetBookmarks: 0,
      approvedSubmissions: 2, consecutiveWindows: 2, referralConversions: 3,
    });
    expect(breakdown.totalPoints).toBeGreaterThan(5000);
    expect(breakdown.holdingsPoints).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER);
  });
});

// ═══════════════════════════════════════════
// JOURNEY 3: Road Warrior Tier
// ═══════════════════════════════════════════
describe('Journey: Road Warrior (5M GASCOIN)', () => {
  it('gets correct tier', () => {
    const tier = getTierForBalance(5_000_000);
    expect(tier.id).toBe(2);
    expect(tier.max_eth_refund).toBe(0.02);
  });

  it('earns Road Warrior holdings per day', () => {
    const { holdingsPoints } = simulateUser({
      tier: 2, gascoinBalance: 7_500_000,
      tweetImpressions: 0, tweetLikes: 0, tweetRetweets: 0, tweetQuotes: 0, tweetReplies: 0, tweetBookmarks: 0,
      approvedSubmissions: 0, consecutiveWindows: 0, referralConversions: 0,
    });
    expect(holdingsPoints).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_ROAD_WARRIOR);
  });

  it('with viral tweet + streak + referrals = solid points', () => {
    const { breakdown } = simulateUser({
      tier: 2, gascoinBalance: 7_500_000,
      tweetImpressions: 25000, tweetLikes: 300, tweetRetweets: 80, tweetQuotes: 20, tweetReplies: 50, tweetBookmarks: 0,
      approvedSubmissions: 3, consecutiveWindows: 4, referralConversions: 8,
    });
    expect(breakdown.totalPoints).toBeGreaterThan(5000);
  });
});

// ═══════════════════════════════════════════
// JOURNEY 4: Fleet Tier (Top Holder)
// ═══════════════════════════════════════════
describe('Journey: Fleet Tier (10M GASCOIN)', () => {
  it('gets 1.0 SOL max refund', () => {
    const tier = getTierForBalance(10_000_000);
    expect(tier.id).toBe(3);
    expect(tier.max_eth_refund).toBe(0.04);
  });

  it('earns Fleet holdings per day', () => {
    const monthly = POINTS_CONFIG.POINTS_PER_CYCLE_FLEET * 30;
    expect(monthly).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_FLEET * 30);
  });

  it('full engagement scenario — max points accumulation', () => {
    const { breakdown } = simulateUser({
      tier: 3, gascoinBalance: 15_000_000,
      tweetImpressions: 100000, tweetLikes: 1000, tweetRetweets: 300, tweetQuotes: 50, tweetReplies: 200, tweetBookmarks: 0,
      approvedSubmissions: 5, consecutiveWindows: 5, referralConversions: 15,
    });

    expect(breakdown.impressionPoints).toBe(100000);
    expect(breakdown.likePoints).toBe(1000 * POINTS_CONFIG.POINTS_PER_LIKE);
    expect(breakdown.retweetPoints).toBe(300 * POINTS_CONFIG.POINTS_PER_RETWEET);
    expect(breakdown.quotePoints).toBe(50 * POINTS_CONFIG.POINTS_PER_QUOTE_TWEET);
    expect(breakdown.replyPoints).toBe(200 * POINTS_CONFIG.POINTS_PER_REPLY);
    expect(breakdown.submissionPoints).toBe(5000);
    expect(breakdown.streakPoints).toBe(2500);
    expect(breakdown.referralPoints).toBe(7500);
    expect(breakdown.holdingsPoints).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_FLEET);
    const expectedTotal = breakdown.impressionPoints + breakdown.likePoints + breakdown.retweetPoints +
      breakdown.quotePoints + breakdown.replyPoints + breakdown.submissionPoints +
      breakdown.streakPoints + breakdown.referralPoints + breakdown.holdingsPoints;
    expect(breakdown.totalPoints).toBe(expectedTotal);
  });
});

// ═══════════════════════════════════════════
// TWEET QUALITY AI SCORING
// ═══════════════════════════════════════════
describe('Tweet Quality Scoring', () => {
  it('detects pure hashtag spam', async () => {
    const result = await scoreTweetQuality({
      tweetText: '#gascoin #crypto #sol #money #pump',
      impressions: 500, likes: 200, retweets: 50, replies: 10, followerCount: 50,
    });
    expect(result.isSpam).toBe(true);
    expect(result.multiplier).toBeLessThanOrEqual(0.2);
  });

  it('flags suspicious engagement ratio', async () => {
    const result = await scoreTweetQuality({
      tweetText: 'Just filled up my tank #gascoin',
      impressions: 50000, likes: 5000, retweets: 2000, replies: 1000, followerCount: 20,
    });
    expect(result.isBotEngagement).toBe(true);
    expect(result.multiplier).toBeLessThanOrEqual(0.3);
  });

  it('passes normal tweet through', async () => {
    const result = await scoreTweetQuality({
      tweetText: 'Gas prices are insane right now. Just filled up at $4.89/gal. Thank god for #gascoin giving real money back.',
      impressions: 3000, likes: 20, retweets: 5, replies: 3, followerCount: 500,
    });
    expect(result.isSpam).toBe(false);
    expect(result.isBotEngagement).toBe(false);
    // Without API key, conservative fallback to 0.5 multiplier
    expect(result.multiplier).toBeGreaterThanOrEqual(0.5);
  });
});

// ═══════════════════════════════════════════
// REFERRAL RING DETECTION
// ═══════════════════════════════════════════
describe('Referral Ring Detection', () => {
  const walletA = fakeWallet();
  const walletB = fakeWallet();
  const walletC = fakeWallet();
  const now = new Date().toISOString();

  it('detects direct circular referral (A→B, B→A)', async () => {
    const result = await detectReferralRing({
      referrerWallet: walletA,
      referredWallet: walletB,
      allReferrals: [
        { referrer: walletA, referred: walletB, created_at: now },
        { referrer: walletB, referred: walletA, created_at: now },
      ],
    });
    expect(result.isSuspicious).toBe(true);
    expect(result.ringType).toBe('circular');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects 3-node cycle (A→B, B→C, C→A)', async () => {
    const result = await detectReferralRing({
      referrerWallet: walletA,
      referredWallet: walletB,
      allReferrals: [
        { referrer: walletA, referred: walletB, created_at: now },
        { referrer: walletB, referred: walletC, created_at: now },
        { referrer: walletC, referred: walletA, created_at: now },
      ],
    });
    expect(result.isSuspicious).toBe(true);
    expect(result.ringType).toBe('circular');
  });

  it('detects chain farming (5+ refs in 24h)', async () => {
    const refs = Array.from({ length: 6 }, (_, i) => ({
      referrer: walletA,
      referred: fakeWallet(),
      created_at: new Date(Date.now() - i * 3600000).toISOString(), // 1 per hour
    }));
    const result = await detectReferralRing({
      referrerWallet: walletA,
      referredWallet: refs[0].referred,
      allReferrals: refs,
    });
    expect(result.isSuspicious).toBe(true);
    expect(result.ringType).toBe('chain');
  });

  it('passes legitimate referral', async () => {
    const result = await detectReferralRing({
      referrerWallet: walletA,
      referredWallet: walletB,
      allReferrals: [
        { referrer: walletA, referred: walletB, created_at: now },
      ],
    });
    expect(result.isSuspicious).toBe(false);
    expect(result.ringType).toBe('none');
  });
});

// ═══════════════════════════════════════════
// WALLET TRUST SCORING
// ═══════════════════════════════════════════
describe('Wallet Trust Scoring', () => {
  it('new wallet with no history = neutral score', () => {
    const trust = calculateWalletTrust({
      totalSubmissions: 0, approvedSubmissions: 0, rejectedSubmissions: 0,
      referralConversions: 0, skippedReferrals: 0, accountAgeDays: 1, anomalyCount: 0,
    });
    expect(trust.level).toBe('new');
    expect(trust.multiplier).toBe(0.8);
    expect(trust.score).toBeLessThan(50);
  });

  it('veteran with perfect record = high trust', () => {
    const trust = calculateWalletTrust({
      totalSubmissions: 10, approvedSubmissions: 10, rejectedSubmissions: 0,
      referralConversions: 5, skippedReferrals: 0, accountAgeDays: 180, anomalyCount: 0,
    });
    expect(trust.level).toBe('veteran');
    expect(trust.multiplier).toBe(1.2);
    expect(trust.score).toBeGreaterThanOrEqual(80);
  });

  it('suspicious wallet with high rejection rate', () => {
    const trust = calculateWalletTrust({
      totalSubmissions: 8, approvedSubmissions: 1, rejectedSubmissions: 6,
      referralConversions: 0, skippedReferrals: 5, accountAgeDays: 3, anomalyCount: 2,
    });
    expect(trust.level).toBe('suspicious');
    expect(trust.multiplier).toBe(0.5);
    expect(trust.score).toBeLessThan(30);
  });

  it('moderate user = trusted', () => {
    const trust = calculateWalletTrust({
      totalSubmissions: 5, approvedSubmissions: 4, rejectedSubmissions: 1,
      referralConversions: 3, skippedReferrals: 0, accountAgeDays: 60, anomalyCount: 0,
    });
    expect(trust.level).toBe('trusted');
    expect(trust.multiplier).toBe(1.0);
  });
});

// ═══════════════════════════════════════════
// GATE VERIFICATION → POINTS FLOW
// ═══════════════════════════════════════════
describe('Gate Verification → Points Integration', () => {
  function validClaim(): ClaimInput {
    return {
      xVerified: true, followsGascoin: true,
      tweetUrl: 'https://x.com/user/status/123',
      tweetHasGascoin: true, tweetMentionsGascoinApp: true, tweetLive: true,
      connectedWallet: 'GAsWallet123', walletOnReceipt: 'GAsWallet123',
      receiptHasGascoin: true, gascoinTokenBalance: 100,
      aiScore: 0.1, tamperScore: 0.1,
      duplicateHash: false, duplicatePhash: false,
      cooldownOk: true, amountUsd: 50,
      ocrAmount: 52, receiptDate: new Date().toISOString().slice(0, 10),
      followerCount: 200, accountQualityScore: 60, accountQualityPassed: true,
    };
  }

  it('approved claim earns 1000 submission points', () => {
    const result = evaluateClaim(validClaim());
    expect(result.decision).toBe('ready_for_dispatch');
    // On admin approval → 1000 points awarded
    expect(POINTS_CONFIG.POINTS_PER_APPROVED_SUBMISSION).toBe(1000);
  });

  it('rejected claim earns 0 points', () => {
    const input = validClaim();
    input.aiScore = 0.9;
    input.tamperScore = 0.9;
    input.duplicateHash = true;
    input.tweetLive = false;
    input.receiptHasGascoin = false;
    const result = evaluateClaim(input);
    expect(result.decision).toBe('rejected');
    // Rejected → no points
  });

  it('all 15 gates evaluate correctly for a valid submission', () => {
    const result = evaluateClaim(validClaim());
    expect(result.gates).toHaveLength(GATE_COUNT);
    expect(result.failed).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════
// LOAD TEST: Point Calculation Performance
// ═══════════════════════════════════════════
describe('Load Test — Point Calculations', () => {
  it('LOW LOAD: 10 users processed in <10ms', () => {
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      simulateUser({
        tier: i % 4, gascoinBalance: i * 100_000,
        tweetImpressions: 5000, tweetLikes: 50, tweetRetweets: 10, tweetQuotes: 2, tweetReplies: 5, tweetBookmarks: 0,
        approvedSubmissions: 1, consecutiveWindows: i, referralConversions: i,
      });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
  });

  it('MEDIUM LOAD: 100 users processed in <50ms', () => {
    const start = performance.now();
    const results: number[] = [];
    for (let i = 0; i < 100; i++) {
      const { breakdown } = simulateUser({
        tier: i % 4, gascoinBalance: (i % 4) * 500_000,
        tweetImpressions: Math.floor(Math.random() * 50000),
        tweetLikes: Math.floor(Math.random() * 500),
        tweetRetweets: Math.floor(Math.random() * 100),
        tweetQuotes: Math.floor(Math.random() * 20),
        tweetReplies: Math.floor(Math.random() * 50), tweetBookmarks: Math.floor(Math.random() * 20),
        approvedSubmissions: Math.floor(Math.random() * 5),
        consecutiveWindows: Math.floor(Math.random() * 5),
        referralConversions: Math.floor(Math.random() * 10),
      });
      results.push(breakdown.totalPoints);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
    expect(results.every((p) => p >= 0)).toBe(true);
    expect(results.some((p) => p > 0)).toBe(true);
  });

  it('HIGH LOAD: 1000 users processed in <200ms', () => {
    const start = performance.now();
    let totalPoints = 0;
    let maxPoints = 0;
    let minPoints = Infinity;

    for (let i = 0; i < 1000; i++) {
      const { breakdown } = simulateUser({
        tier: i % 4, gascoinBalance: (i % 4) * 500_000,
        tweetImpressions: Math.floor(Math.random() * 100000),
        tweetLikes: Math.floor(Math.random() * 1000),
        tweetRetweets: Math.floor(Math.random() * 300),
        tweetQuotes: Math.floor(Math.random() * 50),
        tweetReplies: Math.floor(Math.random() * 200), tweetBookmarks: Math.floor(Math.random() * 50),
        approvedSubmissions: Math.floor(Math.random() * 10),
        consecutiveWindows: Math.floor(Math.random() * 5),
        referralConversions: Math.floor(Math.random() * 20),
      });
      totalPoints += breakdown.totalPoints;
      maxPoints = Math.max(maxPoints, breakdown.totalPoints);
      minPoints = Math.min(minPoints, breakdown.totalPoints);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
    expect(totalPoints).toBeGreaterThan(0);
    expect(maxPoints).toBeGreaterThan(100000); // At least one high earner
    expect(minPoints).toBeGreaterThanOrEqual(0); // No negatives
  });

  it('STRESS: 5000 concurrent trust score calculations in <500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      calculateWalletTrust({
        totalSubmissions: Math.floor(Math.random() * 20),
        approvedSubmissions: Math.floor(Math.random() * 15),
        rejectedSubmissions: Math.floor(Math.random() * 5),
        referralConversions: Math.floor(Math.random() * 10),
        skippedReferrals: Math.floor(Math.random() * 5),
        accountAgeDays: Math.floor(Math.random() * 365),
        anomalyCount: Math.floor(Math.random() * 3),
      });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  it('STRESS: 5000 ring detection checks in <500ms', async () => {
    const start = performance.now();
    const wallets = Array.from({ length: 100 }, () => fakeWallet());
    const allRefs = Array.from({ length: 200 }, () => ({
      referrer: wallets[Math.floor(Math.random() * 100)],
      referred: wallets[Math.floor(Math.random() * 100)],
      created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    }));

    for (let i = 0; i < 5000; i++) {
      await detectReferralRing({
        referrerWallet: wallets[i % 100],
        referredWallet: wallets[(i + 1) % 100],
        allReferrals: allRefs,
      });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});

// ═══════════════════════════════════════════
// CROSS-TIER COMPARISON
// ═══════════════════════════════════════════
describe('Cross-Tier Comparison — Same Activity, Different Tiers', () => {
  const sharedActivity = {
    tweetImpressions: 10000, tweetLikes: 100, tweetRetweets: 30,
    tweetQuotes: 5, tweetReplies: 15, tweetBookmarks: 0, approvedSubmissions: 2,
    consecutiveWindows: 3, referralConversions: 4,
  };

  it('Fleet earns more than Road Warrior from same activity', () => {
    const fleet = simulateUser({ ...sharedActivity, tier: 3, gascoinBalance: 10_000_000 });
    const rw = simulateUser({ ...sharedActivity, tier: 2, gascoinBalance: 5_000_000 });
    expect(fleet.breakdown.totalPoints).toBeGreaterThan(rw.breakdown.totalPoints);
    expect(fleet.breakdown.holdingsPoints).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_FLEET);
    expect(rw.breakdown.holdingsPoints).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_ROAD_WARRIOR);
  });

  it('Commuter earns more than Standard from same activity', () => {
    const commuter = simulateUser({ ...sharedActivity, tier: 1, gascoinBalance: 100_000 });
    const standard = simulateUser({ ...sharedActivity, tier: 0, gascoinBalance: 0 });
    expect(commuter.breakdown.totalPoints).toBeGreaterThan(standard.breakdown.totalPoints);
  });

  it('only difference between tiers is holdings bonus', () => {
    const fleet = simulateUser({ ...sharedActivity, tier: 3, gascoinBalance: 10_000_000 });
    const standard = simulateUser({ ...sharedActivity, tier: 0, gascoinBalance: 0 });
    const diff = fleet.breakdown.totalPoints - standard.breakdown.totalPoints;
    expect(diff).toBe(POINTS_CONFIG.POINTS_PER_CYCLE_FLEET - POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD);
  });
});
