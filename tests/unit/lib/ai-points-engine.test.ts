import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabase } from '@/tests/mocks/supabase';

// ── Mocks (must precede all imports) ─────────────────────────────────────────

const mockStore = createMockSupabase().store;

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => createMockSupabase(mockStore),
}));

vi.mock('@/lib/integrations/ai-gateway', () => ({
  isAiGatewayAvailable: vi.fn().mockReturnValue(true),
  generateAIText: vi.fn().mockResolvedValue({ ok: true, text: '{"quality":0.8,"spam_probability":0.1,"bot_engagement_probability":0.1,"reason":"looks genuine"}' }),
  AI_MODELS: { GROK: 'grok-3', GEMINI_FAST: 'gemini-flash' },
}));

vi.mock('@/lib/cache', () => ({
  cacheGetOrFetch: vi.fn().mockImplementation(async (_key: string, fn: () => unknown) => fn()),
}));

vi.mock('@/lib/engagement-rewards', () => ({
  POINTS_CONFIG: {
    MAX_ENGAGEMENT_POINTS_PER_DAY: 10_000,
    MAX_ENGAGEMENT_POINTS_PER_MONTH: 50_000,
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  scoreTweetQuality,
  detectReferralRing,
  calculateWalletTrust,
  verifyPointAward,
  awardVerifiedPoints,
  generateAuditSummary,
  type WalletTrustScore,
  type TweetQualityScore,
} from '@/lib/ai-points-engine';
import { isAiGatewayAvailable, generateAIText } from '@/lib/integrations/ai-gateway';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const WALLET = 'GAsWalletTestEngine1';

const TRUSTED_WALLET: WalletTrustScore = {
  score: 70,
  level: 'trusted',
  multiplier: 1.0,
  factors: ['Multiple approved submissions'],
};

const SUSPICIOUS_WALLET: WalletTrustScore = {
  score: 20,
  level: 'suspicious',
  multiplier: 0.5,
  factors: ['High rejection rate'],
};

const VETERAN_WALLET: WalletTrustScore = {
  score: 85,
  level: 'veteran',
  multiplier: 1.2,
  factors: ['5+ approved submissions', 'Account 90+ days old'],
};

// ── scoreTweetQuality ─────────────────────────────────────────────────────────

describe('scoreTweetQuality — heuristic pre-checks', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('marks hashtag-only tweet as spam without calling AI', async () => {
    const result = await scoreTweetQuality({
      tweetText: '#gascoin #gas #refund #sol #crypto',
      impressions: 1000,
      likes: 10,
      retweets: 5,
      replies: 2,
      followerCount: 500,
    });

    expect(result.isSpam).toBe(true);
    expect(result.multiplier).toBeLessThanOrEqual(0.2);
    expect(generateAIText).not.toHaveBeenCalled();
  });

  it('flags bot engagement for small account with high engagement rate', async () => {
    // 50 followers, 15 likes+RTs = 30% engagement (> 20% threshold for tiny accounts)
    const result = await scoreTweetQuality({
      tweetText: 'Just filled up the tank and used GASCOIN to get a refund!',
      impressions: 200,
      likes: 10,
      retweets: 5,
      replies: 0,
      followerCount: 50,
    });

    expect(result.isBotEngagement).toBe(true);
    expect(result.multiplier).toBeLessThanOrEqual(0.3);
    expect(generateAIText).not.toHaveBeenCalled();
  });

  it('happy path: clean tweet passes to AI and returns AI-derived quality score', async () => {
    vi.mocked(generateAIText).mockResolvedValueOnce({
      ok: true,
      text: '{"quality":0.9,"spam_probability":0.05,"bot_engagement_probability":0.05,"reason":"Original content about gas refunds"}',
    });

    const result = await scoreTweetQuality({
      tweetText: 'Love GASCOIN! Just got a 0.02 SOL refund on my last fill-up. Highly recommend.',
      impressions: 500,
      likes: 8,
      retweets: 2,
      replies: 1,
      followerCount: 800,
    });

    expect(result.quality).toBeCloseTo(0.9, 1);
    expect(result.isSpam).toBe(false);
    expect(result.isBotEngagement).toBe(false);
    expect(result.reason).toContain('Original content');
  });

  it('returns conservative fallback when AI response is unparseable', async () => {
    vi.mocked(generateAIText).mockResolvedValueOnce({ ok: true, text: 'not json at all' });

    const result = await scoreTweetQuality({
      tweetText: 'GASCOIN is amazing! Best gas refund platform ever built on Solana.',
      impressions: 300,
      likes: 5,
      retweets: 1,
      replies: 0,
      followerCount: 600,
    });

    expect(result.quality).toBe(0.5);
    expect(result.multiplier).toBe(0.5);
  });

  it('returns conservative fallback when AI gateway is unavailable', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);

    const result = await scoreTweetQuality({
      tweetText: 'Filled my tank today, used GASCOIN to claim a partial refund. 10/10.',
      impressions: 400,
      likes: 6,
      retweets: 2,
      replies: 1,
      followerCount: 700,
    });

    expect(result.quality).toBe(0.5);
  });

  it('uses cache key with impression bucket when tweetId provided', async () => {
    const { cacheGetOrFetch } = await import('@/lib/cache');

    await scoreTweetQuality({
      tweetText: 'GASCOIN refund received!',
      impressions: 1500,
      likes: 5,
      retweets: 1,
      replies: 0,
      followerCount: 1000,
      tweetId: 'tweet-abc-123',
    });

    expect(cacheGetOrFetch).toHaveBeenCalledWith(
      'tweetquality:tweet-abc-123:1', // bucket = floor(1500/1000) = 1
      expect.any(Function),
      3600,
    );
  });
});

// ── detectReferralRing ────────────────────────────────────────────────────────

describe('detectReferralRing — cycle detection', () => {
  it('happy path: no ring detected for clean referral pair', async () => {
    const result = await detectReferralRing({
      referrerWallet: 'walletA',
      referredWallet: 'walletB',
      allReferrals: [
        { referrer: 'walletA', referred: 'walletB', created_at: new Date().toISOString() },
      ],
    });

    expect(result.isSuspicious).toBe(false);
    expect(result.ringType).toBe('none');
  });

  it('detects circular ring: A→B→C→A', async () => {
    const result = await detectReferralRing({
      referrerWallet: 'walletA',
      referredWallet: 'walletB',
      allReferrals: [
        { referrer: 'walletA', referred: 'walletB', created_at: new Date().toISOString() },
        { referrer: 'walletB', referred: 'walletC', created_at: new Date().toISOString() },
        { referrer: 'walletC', referred: 'walletA', created_at: new Date().toISOString() },
      ],
    });

    expect(result.isSuspicious).toBe(true);
    expect(result.ringType).toBe('circular');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects chain farming: 3+ referrals within 7 days from same referrer', async () => {
    const now = Date.now();
    const result = await detectReferralRing({
      referrerWallet: 'walletFarmer',
      referredWallet: 'walletD',
      allReferrals: [
        { referrer: 'walletFarmer', referred: 'walletA', created_at: new Date(now - 1 * 86400000).toISOString() },
        { referrer: 'walletFarmer', referred: 'walletB', created_at: new Date(now - 2 * 86400000).toISOString() },
        { referrer: 'walletFarmer', referred: 'walletC', created_at: new Date(now - 3 * 86400000).toISOString() },
        { referrer: 'walletFarmer', referred: 'walletD', created_at: new Date(now - 4 * 86400000).toISOString() },
      ],
    });

    expect(result.isSuspicious).toBe(true);
    expect(result.ringType).toBe('chain');
  });

  it('does NOT flag chain farming when referrals are spread across >7 days', async () => {
    const now = Date.now();
    const result = await detectReferralRing({
      referrerWallet: 'walletLegit',
      referredWallet: 'walletD',
      allReferrals: [
        { referrer: 'walletLegit', referred: 'walletA', created_at: new Date(now - 1 * 86400000).toISOString() },
        { referrer: 'walletLegit', referred: 'walletB', created_at: new Date(now - 10 * 86400000).toISOString() },
        { referrer: 'walletLegit', referred: 'walletC', created_at: new Date(now - 20 * 86400000).toISOString() },
        { referrer: 'walletLegit', referred: 'walletD', created_at: new Date(now - 30 * 86400000).toISOString() },
      ],
    });

    expect(result.isSuspicious).toBe(false);
    expect(result.ringType).toBe('none');
  });
});

// ── calculateWalletTrust ──────────────────────────────────────────────────────

describe('calculateWalletTrust — pure scoring function', () => {
  it('happy path: clean wallet with good history scores as trusted', () => {
    const result = calculateWalletTrust({
      totalSubmissions: 5,
      approvedSubmissions: 5,
      rejectedSubmissions: 0,
      referralConversions: 3,
      skippedReferrals: 0,
      accountAgeDays: 90,
      anomalyCount: 0,
    });

    expect(result.level).toBe('veteran');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.multiplier).toBe(1.2);
  });

  it('new account with no history starts at reduced score', () => {
    const result = calculateWalletTrust({
      totalSubmissions: 0,
      approvedSubmissions: 0,
      rejectedSubmissions: 0,
      referralConversions: 0,
      skippedReferrals: 0,
      accountAgeDays: 3,
      anomalyCount: 0,
    });

    // score = 50 - 10 (no approvals) - 10 (new account <7d) = 30 → 'new' level
    expect(result.level).toBe('new');
    expect(result.multiplier).toBe(0.8);
  });

  it('high rejection rate drops score', () => {
    const result = calculateWalletTrust({
      totalSubmissions: 6,
      approvedSubmissions: 1,
      rejectedSubmissions: 5,
      referralConversions: 0,
      skippedReferrals: 0,
      accountAgeDays: 30,
      anomalyCount: 0,
    });

    // rejectRate > 0.5 → -20, no approvals bonus → suspicious territory
    expect(result.score).toBeLessThan(50);
  });

  it('anomalies each reduce score by 10 points', () => {
    const clean = calculateWalletTrust({
      totalSubmissions: 3, approvedSubmissions: 3, rejectedSubmissions: 0,
      referralConversions: 0, skippedReferrals: 0, accountAgeDays: 30, anomalyCount: 0,
    });
    const withAnomalies = calculateWalletTrust({
      totalSubmissions: 3, approvedSubmissions: 3, rejectedSubmissions: 0,
      referralConversions: 0, skippedReferrals: 0, accountAgeDays: 30, anomalyCount: 2,
    });

    expect(clean.score - withAnomalies.score).toBe(20);
  });

  it('score is clamped to 0–100', () => {
    // Terrible wallet
    const bad = calculateWalletTrust({
      totalSubmissions: 10, approvedSubmissions: 0, rejectedSubmissions: 10,
      referralConversions: 0, skippedReferrals: 5, accountAgeDays: 1, anomalyCount: 10,
    });
    expect(bad.score).toBeGreaterThanOrEqual(0);
    expect(bad.score).toBeLessThanOrEqual(100);
    expect(bad.level).toBe('suspicious');
    expect(bad.multiplier).toBe(0.5);
  });

  it('returns required fields', () => {
    const result = calculateWalletTrust({
      totalSubmissions: 1, approvedSubmissions: 1, rejectedSubmissions: 0,
      referralConversions: 0, skippedReferrals: 0, accountAgeDays: 30, anomalyCount: 0,
    });

    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('level');
    expect(result).toHaveProperty('multiplier');
    expect(result).toHaveProperty('factors');
    expect(Array.isArray(result.factors)).toBe(true);
  });
});

// ── verifyPointAward ──────────────────────────────────────────────────────────

describe('verifyPointAward — pre-award verification gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: AI approves cleanly
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":false,"reduce":false,"multiplier":1.0,"reason":"clean award"}',
    });
  });

  it('happy path: clean award below thresholds is approved without AI call', async () => {
    const result = await verifyPointAward({
      wallet: WALLET,
      source: 'submission_approved',
      rawPoints: 500,
      metadata: {},
      walletTrust: TRUSTED_WALLET,
      totalPointsToday: 100,
      totalPointsAllTime: 5000,
    });

    expect(result.approved).toBe(true);
    expect(result.holdForReview).toBe(false);
    expect(result.reason).toBe('clean');
    expect(generateAIText).not.toHaveBeenCalled();
  });

  it('applies trust multiplier to raw points', async () => {
    const result = await verifyPointAward({
      wallet: WALLET,
      source: 'submission_approved',
      rawPoints: 1000,
      metadata: {},
      walletTrust: VETERAN_WALLET, // multiplier 1.2
      totalPointsToday: 0,
      totalPointsAllTime: 0,
    });

    // 1000 * 1.2 = 1200; >1000 triggers AI call which returns clean
    expect(result.adjustedPoints).toBe(1200);
    expect(result.trustMultiplier).toBe(1.2);
  });

  it('holds suspicious wallet high-value award for review', async () => {
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":false,"reduce":false,"multiplier":1.0,"reason":"suspicious but not blocked"}',
    });

    const result = await verifyPointAward({
      wallet: WALLET,
      source: 'submission_approved',
      rawPoints: 2000, // suspicious wallet: 2000 * 0.5 = 1000 → > 500 → holdForReview
      metadata: {},
      walletTrust: SUSPICIOUS_WALLET,
      totalPointsToday: 0,
      totalPointsAllTime: 0,
    });

    expect(result.holdForReview).toBe(true);
    expect(result.flags).toContain('suspicious_wallet');
    expect(result.flags).toContain('high_value_suspicious');
  });

  it('zeroes out points when referral ring is detected', async () => {
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":true,"reduce":false,"multiplier":0,"reason":"ring detected"}',
    });

    const result = await verifyPointAward({
      wallet: WALLET,
      source: 'referral_conversion',
      rawPoints: 100,
      metadata: {},
      walletTrust: TRUSTED_WALLET,
      ringDetection: {
        isSuspicious: true,
        ringType: 'circular',
        confidence: 0.95,
        wallets: ['walletA', 'walletB'],
        reason: 'ring detected',
      },
      totalPointsToday: 0,
      totalPointsAllTime: 0,
    });

    expect(result.adjustedPoints).toBe(0);
    expect(result.holdForReview).toBe(true);
    expect(result.flags).toContain('referral_ring_circular');
  });

  it('flags daily velocity when today total + award > 50K', async () => {
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":false,"reduce":false,"multiplier":1.0,"reason":"ok"}',
    });

    const result = await verifyPointAward({
      wallet: WALLET,
      source: 'submission_approved',
      rawPoints: 5000,
      metadata: {},
      walletTrust: TRUSTED_WALLET,
      totalPointsToday: 46000, // 46000 + 5000 = 51000 > 50000
      totalPointsAllTime: 100000,
    });

    expect(result.flags).toContain('daily_velocity_high');
    expect(result.holdForReview).toBe(true);
  });

  it('veteran wallet: daily velocity flag but NOT held for review', async () => {
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":false,"reduce":false,"multiplier":1.0,"reason":"veteran ok"}',
    });

    const result = await verifyPointAward({
      wallet: WALLET,
      source: 'submission_approved',
      rawPoints: 5000,
      metadata: {},
      walletTrust: VETERAN_WALLET, // veteran bypasses velocity hold
      totalPointsToday: 46000,
      totalPointsAllTime: 500000,
    });

    expect(result.flags).toContain('daily_velocity_high');
    expect(result.holdForReview).toBe(false);
    expect(result.approved).toBe(true);
  });
});

// ── awardVerifiedPoints ───────────────────────────────────────────────────────

describe('awardVerifiedPoints — database integration', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    // Default: AI approves cleanly for low-value awards
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":false,"reduce":false,"multiplier":1.0,"reason":"clean"}',
    });
  });

  it('happy path: awards points and inserts engagement_points row', async () => {
    const supabase = createMockSupabase(mockStore);

    const result = await awardVerifiedPoints(supabase, {
      wallet: WALLET,
      source: 'submission_approved',
      rawPoints: 500,
      metadata: { claimId: 'claim-1' },
      walletTrust: TRUSTED_WALLET,
    });

    expect(result.awarded).toBe(true);
    expect(result.points).toBe(500);
    expect(result.heldForReview).toBe(false);

    const rows = mockStore.getTable('engagement_points');
    expect(rows).toHaveLength(1);
    expect(rows[0].wallet).toBe(WALLET);
    expect(rows[0].source).toBe('submission_approved');
    expect(rows[0].points).toBe(500);
  });

  it('holds suspicious high-value award and writes to pending_points', async () => {
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":false,"reduce":false,"multiplier":1.0,"reason":"suspicious but not blocked"}',
    });

    const supabase = createMockSupabase(mockStore);

    const result = await awardVerifiedPoints(supabase, {
      wallet: WALLET,
      source: 'submission_approved',
      rawPoints: 2000, // suspicious wallet: 2000 * 0.5 = 1000 → > 500 hold threshold
      metadata: {},
      walletTrust: SUSPICIOUS_WALLET,
    });

    expect(result.awarded).toBe(false);
    expect(result.heldForReview).toBe(true);

    const rows = mockStore.getTable('engagement_points');
    const pendingRow = rows.find((r) => r.source.startsWith('pending_'));
    expect(pendingRow).toBeDefined();
  });

  it('does not award when adjusted points are zero', async () => {
    vi.mocked(generateAIText).mockResolvedValue({
      ok: true,
      text: '{"block":true,"reduce":false,"multiplier":0,"reason":"ring blocked"}',
    });

    const supabase = createMockSupabase(mockStore);

    const result = await awardVerifiedPoints(supabase, {
      wallet: WALLET,
      source: 'referral_conversion',
      rawPoints: 100,
      metadata: {},
      walletTrust: TRUSTED_WALLET,
      ringDetection: {
        isSuspicious: true,
        ringType: 'circular',
        confidence: 0.95,
        wallets: ['walletA', 'walletB'],
        reason: 'circular ring',
      },
    });

    expect(result.awarded).toBe(false);
    expect(result.points).toBe(0);
    expect(mockStore.getTable('engagement_points').filter((r) => !r.source.startsWith('pending_'))).toHaveLength(0);
  });
});

// ── generateAuditSummary ──────────────────────────────────────────────────────

describe('generateAuditSummary', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns AI-generated summary when gateway is available', async () => {
    vi.mocked(generateAIText).mockResolvedValueOnce({
      ok: true,
      text: 'Today GASCOIN awarded 5000 points to 10 wallets. No anomalies detected.',
    });

    const result = await generateAuditSummary({
      date: '2026-04-16',
      submissionPoints: 2000,
      streakPoints: 500,
      holdingsPoints: 1000,
      engagementPoints: 1000,
      referralPoints: 500,
      totalWallets: 10,
      anomalies: [],
      flaggedWallets: 0,
    });

    expect(result).toContain('GASCOIN');
    expect(generateAIText).toHaveBeenCalledOnce();
  });

  it('returns fallback summary when AI returns empty string', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);

    const result = await generateAuditSummary({
      date: '2026-04-16',
      submissionPoints: 2000,
      streakPoints: 500,
      holdingsPoints: 1000,
      engagementPoints: 1000,
      referralPoints: 500,
      totalWallets: 10,
      anomalies: [],
      flaggedWallets: 0,
    });

    // Fallback includes date and basic numbers
    expect(result).toContain('2026-04-16');
  });
});
