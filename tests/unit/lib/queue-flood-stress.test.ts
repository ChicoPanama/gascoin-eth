/**
 * GASCOIN Queue Flood Stress Tests
 *
 * Simulates hundreds of borderline submissions hitting the system simultaneously.
 * Tests the PURE LOGIC of policy evaluation, account quality scoring, tier
 * assignment, and location intelligence under volume — no API calls, no database,
 * no fetch. Every test is deterministic and completes in <100ms.
 *
 * 20 tests across 5 categories:
 *   1. Review Queue Flood (5)
 *   2. Score Distribution Analysis (5)
 *   3. Account Quality Under Load (5)
 *   4. Tier System Under Volume (3)
 *   5. Location Intelligence at Scale (2)
 */

import { describe, it, expect } from 'vitest';
import { evaluateClaim, type ClaimInput, type ClaimDecision } from '@/lib/policy';
import { scoreAccountQuality, type HistoricalSignals } from '@/lib/account-quality';
import type { XUser } from '@/lib/x-api';
import {
  getTierForBalance,
  getCooldownForTier,
  TOKEN_TIERS,
} from '@/lib/token-tiers';
import { scoreLocationConsistency } from '@/lib/geo-config';
import { calculateEngagementPoints, POINTS_CONFIG } from '@/lib/engagement-rewards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A ClaimInput where every gate passes and risk is minimal. */
function validClaim(overrides: Partial<ClaimInput> = {}): ClaimInput {
  return {
    xVerified: true,
    followsGascoin: true,
    tweetUrl: 'https://x.com/user/status/123',
    tweetHasGascoin: true, tweetMentionsGascoinApp: true,
    tweetLive: true,
    connectedWallet: 'ABC123XYZ9abcd',
    walletOnReceipt: 'XXXXX9abcd',
    receiptHasGascoin: true,
    gascoinTokenBalance: 100,
    aiScore: 0.1,
    tamperScore: 0.1,
    duplicateHash: false,
    duplicatePhash: false,
    cooldownOk: true,
    amountUsd: 50,
    ocrAmount: null,
    receiptDate: null,
    followerCount: 500,
    accountQualityScore: 70,
    accountQualityPassed: true,
    ...overrides,
  };
}

/** Build an XUser suitable for scoreAccountQuality. */
function makeUser(overrides: Partial<XUser> = {}): XUser {
  return {
    id: '123456',
    username: 'testuser',
    name: 'Test User',
    protected: false,
    created_at: '2022-01-01T00:00:00Z',
    description: 'I love gas receipts and GASCOIN',
    profile_image_url: 'https://pbs.twimg.com/profile_images/custom/photo.jpg',
    verified: true,
    public_metrics: {
      followers_count: 500,
      following_count: 200,
      tweet_count: 300,
      listed_count: 5,
    },
    ...overrides,
  };
}

/**
 * Deterministic pseudo-random number generator (mulberry32).
 * Returns a function that yields values in [0, 1) on each call.
 */
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 1: Review Queue Flood
// ═══════════════════════════════════════════════════════════════════════════

describe('Category 1: Review Queue Flood', () => {
  // Test 1: 200 borderline claims — all should get needs_review, zero dispatched.
  // AI=0.63 just under the 0.65 gate threshold, tamper=0.53 just under 0.55.
  // Both gates pass, but the risk formula:
  //   risk = (0 * 0.09) + (0.63 * 0.35) + (0.53 * 0.25) + 0 = 0.2205 + 0.1325 = 0.353
  // 0.353 > 0.35 decision boundary => needs_review even with 0 failed gates.
  it('Test 1: 200 borderline claims (AI=0.63, tamper=0.53) all get needs_review', () => {
    const results: ClaimDecision[] = [];
    for (let i = 0; i < 200; i++) {
      const r = evaluateClaim(validClaim({ aiScore: 0.63, tamperScore: 0.53 }));
      results.push(r.decision);
    }

    const reviewCount = results.filter((d) => d === 'needs_review').length;
    const dispatchCount = results.filter((d) => d === 'ready_for_dispatch').length;

    // All 200 should be needs_review — risk 0.353 > 0.35 threshold
    expect(reviewCount).toBe(200);
    // Zero should accidentally slip through to dispatch
    expect(dispatchCount).toBe(0);
  });

  // Test 2: 500 claims with deterministic "randomized" scores near thresholds.
  // Use modulo-based variation to create a reproducible spread across
  // approve / review / reject buckets. Verify distribution is reasonable.
  it('Test 2: 500 claims with varied scores produce sensible decision distribution', () => {
    const rng = seededRng(42);
    const counts: Record<ClaimDecision, number> = {
      ready_for_dispatch: 0,
      needs_review: 0,
      rejected: 0,
      retry_later: 0,
    };

    for (let i = 0; i < 500; i++) {
      const ai = rng() * 0.95;         // 0 to 0.95
      const tamper = rng() * 0.85;     // 0 to 0.85
      const amount = rng() > 0.5 ? 220 : 50; // half over $200
      const followers = Math.floor(rng() * 300); // 0 to 299
      const qualityScore = 30 + Math.floor(rng() * 60); // 30 to 89
      const qualityPassed = qualityScore >= 40;
      const cooldownOk = rng() > 0.1;
      const xVerified = rng() > 0.15;
      const tweetLive = rng() > 0.05;

      const r = evaluateClaim(
        validClaim({
          aiScore: ai,
          tamperScore: tamper,
          amountUsd: amount,
          followerCount: followers,
          accountQualityScore: qualityScore,
          accountQualityPassed: qualityPassed,
          cooldownOk,
          xVerified,
          tweetLive,
        }),
      );
      counts[r.decision]++;
    }

    // With this spread we expect all three main buckets to be populated
    expect(counts.ready_for_dispatch).toBeGreaterThan(0);
    expect(counts.needs_review).toBeGreaterThan(0);
    expect(counts.rejected).toBeGreaterThan(0);
    // No retry_later since followerCount is always >= 0
    expect(counts.retry_later).toBe(0);
    // No single bucket should contain everything
    expect(counts.ready_for_dispatch).toBeLessThan(500);
    expect(counts.rejected).toBeLessThan(500);
  });

  // Test 3: 100 identical perfect claims — determinism check.
  // Same input must always produce the same output with identical risk scores.
  it('Test 3: 100 identical perfect claims are all ready_for_dispatch with identical risk', () => {
    const results = Array.from({ length: 100 }, () => evaluateClaim(validClaim()));
    const decisions = new Set(results.map((r) => r.decision));
    const riskScores = new Set(results.map((r) => r.riskScore));

    // Every single one should be dispatched
    expect(decisions.size).toBe(1);
    expect(decisions.has('ready_for_dispatch')).toBe(true);
    // All risk scores should be identical (determinism)
    expect(riskScores.size).toBe(1);
    // And zero failed gates
    for (const r of results) {
      expect(r.failed.length).toBe(0);
    }
  });

  // Test 4: 50 API-failure claims (followerCount=-1) and 50 legit claims.
  // Verify exactly 50 get retry_later and 50 get evaluated normally.
  it('Test 4: 50 API failures get retry_later, 50 legit get normal evaluation', () => {
    const apiFailResults: ReturnType<typeof evaluateClaim>[] = [];
    const legitResults: ReturnType<typeof evaluateClaim>[] = [];

    for (let i = 0; i < 50; i++) {
      apiFailResults.push(evaluateClaim(validClaim({ followerCount: -1 })));
    }
    for (let i = 0; i < 50; i++) {
      legitResults.push(evaluateClaim(validClaim()));
    }

    // All API failure claims must be retry_later
    expect(apiFailResults.every((r) => r.decision === 'retry_later')).toBe(true);
    expect(apiFailResults.length).toBe(50);
    // All API failure claims should have riskScore of 0 (not evaluated)
    expect(apiFailResults.every((r) => r.riskScore === 0)).toBe(true);

    // All legit claims should NOT be retry_later
    expect(legitResults.every((r) => r.decision !== 'retry_later')).toBe(true);
    expect(legitResults.length).toBe(50);
    // Specifically, valid claims should be dispatched
    expect(legitResults.every((r) => r.decision === 'ready_for_dispatch')).toBe(true);
  });

  // Test 5: 100 claims from same "wallet" pattern — simulate a fraud ring.
  // First 2 would pass normally. The rest share identical wallet patterns.
  // Verify that the wallet_match gate logic is deterministic and that
  // duplicate-hash detection would flag subsequent submissions.
  it('Test 5: 100 fraud-ring claims — duplicates flagged after first 2', () => {
    const sharedWallet = 'FraudRingWalletXYZ1234';
    const sharedReceipt = 'RECEIPT_XXXX1234';

    // First 2 claims: no duplicate flags
    const first2 = [0, 1].map(() =>
      evaluateClaim(
        validClaim({
          connectedWallet: sharedWallet,
          walletOnReceipt: sharedReceipt,
          duplicateHash: false,
          duplicatePhash: false,
        }),
      ),
    );

    // Both should pass (wallet last-4 match: "1234" === "1234")
    for (const r of first2) {
      expect(r.decision).toBe('ready_for_dispatch');
      expect(r.failed.every((g) => g.gate !== 'wallet_match')).toBe(true);
    }

    // Remaining 98: duplicate detection would have flagged these
    const rest = Array.from({ length: 98 }, () =>
      evaluateClaim(
        validClaim({
          connectedWallet: sharedWallet,
          walletOnReceipt: sharedReceipt,
          duplicateHash: true,  // flagged by upstream dedup
          duplicatePhash: false,
        }),
      ),
    );

    // All 98 should NOT be ready_for_dispatch (duplicate gate fails)
    for (const r of rest) {
      expect(r.decision).not.toBe('ready_for_dispatch');
      expect(r.failed.some((g) => g.gate === 'not_duplicate')).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 2: Score Distribution Analysis
// ═══════════════════════════════════════════════════════════════════════════

describe('Category 2: Score Distribution Analysis', () => {
  // Test 6: 1000 random claim inputs — risk score always in [0, 1].
  // Catches any overflow/underflow in the risk formula.
  it('Test 6: 1000 random claims always produce risk in [0, 1]', () => {
    const rng = seededRng(7777);

    for (let i = 0; i < 1000; i++) {
      const r = evaluateClaim(
        validClaim({
          aiScore: rng() * 2 - 0.5,      // -0.5 to 1.5 (test clamping)
          tamperScore: rng() * 2 - 0.5,   // -0.5 to 1.5
          amountUsd: rng() * 500,
          followerCount: Math.floor(rng() * 1000),
          accountQualityScore: Math.floor(rng() * 100),
          accountQualityPassed: rng() > 0.5,
          xVerified: rng() > 0.3,
          tweetLive: rng() > 0.1,
          cooldownOk: rng() > 0.2,
          duplicateHash: rng() > 0.8,
          duplicatePhash: rng() > 0.9,
        }),
      );
      expect(r.riskScore).toBeGreaterThanOrEqual(0);
      expect(r.riskScore).toBeLessThanOrEqual(1);
    }
  });

  // Test 7: Monotonicity — adding more failed gates always increases risk.
  // Start with a perfect claim and progressively fail gates.
  it('Test 7: More failed gates always increases risk score', () => {
    // Baseline: all gates pass, low AI/tamper
    const base = evaluateClaim(validClaim({ aiScore: 0.1, tamperScore: 0.1 }));

    // Fail one gate: xVerified
    const fail1 = evaluateClaim(validClaim({ aiScore: 0.1, tamperScore: 0.1, xVerified: false }));

    // Fail two gates: xVerified + tweetLive
    const fail2 = evaluateClaim(
      validClaim({ aiScore: 0.1, tamperScore: 0.1, xVerified: false, tweetLive: false }),
    );

    // Fail three gates: + cooldown
    const fail3 = evaluateClaim(
      validClaim({
        aiScore: 0.1,
        tamperScore: 0.1,
        xVerified: false,
        tweetLive: false,
        cooldownOk: false,
      }),
    );

    // Fail four gates: + follower count
    const fail4 = evaluateClaim(
      validClaim({
        aiScore: 0.1,
        tamperScore: 0.1,
        xVerified: false,
        tweetLive: false,
        cooldownOk: false,
        followerCount: 10, // below 100 threshold
      }),
    );

    expect(fail1.riskScore).toBeGreaterThan(base.riskScore);
    expect(fail2.riskScore).toBeGreaterThan(fail1.riskScore);
    expect(fail3.riskScore).toBeGreaterThan(fail2.riskScore);
    expect(fail4.riskScore).toBeGreaterThan(fail3.riskScore);
  });

  // Test 8: Verify decision boundaries are reachable.
  // Find the minimum number of failed gates to reach needs_review (risk >= 0.35)
  // and rejected (risk >= 0.6).
  it('Test 8: Decision boundaries 0.35 and 0.6 are mathematically reachable', () => {
    // Risk formula: min(1, failed.length * 0.09 + aiClamped * 0.35 + tamperClamped * 0.25 + amountBonus)
    // With ai=0, tamper=0, amount<=200: risk = failed * 0.09
    // needs_review (0.35): ceil(0.35 / 0.09) = 4 failed gates
    // rejected (0.6): ceil(0.6 / 0.09) = 7 failed gates

    // 4 failed gates should reach needs_review. Note: we explicitly keep
    // tweetMentionsGascoinApp: true so only the 4 gates we select fail.
    const fourFailed = evaluateClaim(
      validClaim({
        aiScore: 0,
        tamperScore: 0,
        amountUsd: 50,
        xVerified: false,                                       // fail 1
        tweetHasGascoin: false, tweetMentionsGascoinApp: true,  // fail 2 (only hashtag)
        tweetLive: false,                                       // fail 3
        cooldownOk: false,                                      // fail 4
      }),
    );
    // 4 * 0.09 = 0.36 > 0.35 => needs_review
    expect(fourFailed.riskScore).toBeGreaterThanOrEqual(0.35);
    expect(fourFailed.decision).toBe('needs_review');

    // 3 failed gates should NOT reach needs_review (0.27 < 0.35)
    // but decision depends on failed.length > 0 => goes to needs_review anyway
    // because the decision rule is: failed.length===0 && riskScore<0.35 => dispatch
    // So even 1 failed gate means NOT dispatch. Let's verify 3 fails gives < 0.35 risk
    const threeFailed = evaluateClaim(
      validClaim({
        aiScore: 0,
        tamperScore: 0,
        amountUsd: 50,
        xVerified: false,
        tweetHasGascoin: false, tweetMentionsGascoinApp: true,
        tweetLive: false,
      }),
    );
    // 3 * 0.09 = 0.27 < 0.35, but still needs_review because failed.length > 0
    expect(threeFailed.riskScore).toBeLessThan(0.35);
    expect(threeFailed.decision).toBe('needs_review');

    // 7 failed gates should reach rejected (risk >= 0.6)
    const sevenFailed = evaluateClaim(
      validClaim({
        aiScore: 0,
        tamperScore: 0,
        amountUsd: 50,
        xVerified: false,
        tweetHasGascoin: false, tweetMentionsGascoinApp: false,
        tweetLive: false,
        cooldownOk: false,
        receiptHasGascoin: false,
        duplicateHash: true,
        followerCount: 10, // below 100
      }),
    );
    // 7 * 0.09 = 0.63 >= 0.6 => rejected
    expect(sevenFailed.riskScore).toBeGreaterThanOrEqual(0.6);
    expect(sevenFailed.decision).toBe('rejected');
  });

  // Test 9: Exact risk score verification for near-threshold inputs.
  // AI=0.64, tamper=0.54, amount=$250 (all near thresholds).
  // All gates pass => failed.length=0.
  // risk = min(1, 0*0.09 + 0.64*0.35 + 0.54*0.25 + 0.08) = 0.224 + 0.135 + 0.08 = 0.439
  it('Test 9: Near-threshold claim produces exact expected risk score', () => {
    const r = evaluateClaim(
      validClaim({ aiScore: 0.64, tamperScore: 0.54, amountUsd: 250 }),
    );

    // Formula breakdown:
    // failed gates: 0 (ai < 0.65, tamper < 0.55, all others pass)
    // risk = (0 * 0.09) + (0.64 * 0.35) + (0.54 * 0.25) + 0.08 (amount > 200)
    //       = 0 + 0.224 + 0.135 + 0.08
    //       = 0.439
    const expected = +(0 + 0.64 * 0.35 + 0.54 * 0.25 + 0.08).toFixed(4);
    expect(r.riskScore).toBe(expected);
    expect(r.failed.length).toBe(0);
    // 0.439 > 0.35 but failed.length===0 => still needs_review because risk >= 0.35
    // Actually: decision = failed.length===0 && riskScore<0.35 ? dispatch : (risk<0.6 ? review : rejected)
    // failed=0 but risk=0.439 >= 0.35 => NOT dispatch => needs_review
    expect(r.decision).toBe('needs_review');
  });

  // Test 10: Maximum risk — all inputs at their worst.
  // AI=1, tamper=1, 12 failed gates, amount=$250. Should clamp at 1.0.
  it('Test 10: Maximum inputs produce risk clamped at 1.0', () => {
    const r = evaluateClaim(
      validClaim({
        aiScore: 1.0,
        tamperScore: 1.0,
        amountUsd: 250,
        xVerified: false,
        tweetHasGascoin: false, tweetMentionsGascoinApp: false,
        tweetLive: false,
        receiptHasGascoin: false,
        connectedWallet: 'AAAA',
        walletOnReceipt: 'BBBB', // mismatch
        duplicateHash: true,
        duplicatePhash: true,
        cooldownOk: false,
        followerCount: 0,
        accountQualityPassed: false,
      }),
    );

    // risk = min(1, failed*0.09 + 1.0*0.35 + 1.0*0.25 + 0.08)
    // With many failed gates this easily exceeds 1.0, so clamped to 1.0
    expect(r.riskScore).toBe(1);
    expect(r.decision).toBe('rejected');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 3: Account Quality Under Load
// ═══════════════════════════════════════════════════════════════════════════

describe('Category 3: Account Quality Under Load', () => {
  // Test 11: 500 accounts with random signals — score always in [0, 100].
  it('Test 11: 500 random accounts always score between 0 and 100', () => {
    const rng = seededRng(1234);

    for (let i = 0; i < 500; i++) {
      const user = makeUser({
        created_at: rng() > 0.3 ? '2022-06-15T00:00:00Z' : '2025-12-01T00:00:00Z',
        description: rng() > 0.2 ? 'A real person bio here' : '',
        profile_image_url: rng() > 0.3 ? 'https://pbs.twimg.com/custom.jpg' : undefined,
        public_metrics: {
          followers_count: Math.floor(rng() * 2000),
          following_count: Math.floor(rng() * 5000),
          tweet_count: Math.floor(rng() * 1000),
          listed_count: Math.floor(rng() * 20),
        },
      });

      const history: HistoricalSignals = {
        previousFollowerCount: rng() > 0.5 ? Math.floor(rng() * 2000) : null,
        avgQualityScore: rng() > 0.4 ? rng() : null,
        isProtected: rng() > 0.9,
        ipCountry: rng() > 0.5 ? 'US' : 'NG',
        xLocation: rng() > 0.5 ? 'New York' : 'Lagos',
        snapshotAge: Math.floor(rng() * 400),
      };

      const result = scoreAccountQuality(user, history);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  // Test 12: All negative signals simultaneously — should clamp to 0.
  it('Test 12: All negative signals produce score clamped at 0', () => {
    const user = makeUser({
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 days old
      description: '',
      profile_image_url: 'https://pbs.twimg.com/default_profile.png',
      public_metrics: {
        followers_count: 5,          // < 50
        following_count: 5000,       // 5000 > 5*10 => suspicious ratio
        tweet_count: 3,              // < 10
        listed_count: 0,             // never listed
      },
    });

    const history: HistoricalSignals = {
      previousFollowerCount: 1000, // dropped from 1000 to 5 => 99.5% drop
      avgQualityScore: 0.05,       // low quality trend
      isProtected: true,           // went private
      ipCountry: 'US',
      xLocation: 'Lagos Nigeria',  // mismatch
      snapshotAge: 30,             // recent => full decay weight
    };

    const result = scoreAccountQuality(user, history);
    // Baseline 50, minus: 25 (new) + 20 (ratio) + 15 (low followers) + 20 (few tweets)
    // + 5 (never listed) + 10 (empty bio) + 10 (default avatar) + 20 (follower drop)
    // + 15 (went private) + 5 (location mismatch) + 10 (low quality trend)
    // = 50 - 155 = -105, clamped to 0
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.flags.length).toBeGreaterThan(5);
  });

  // Test 13: All positive signals — verify max achievable score.
  it('Test 13: All positive signals produce maximum possible score', () => {
    const user = makeUser({
      created_at: '2018-01-01T00:00:00Z', // >365 days old => +10
      description: 'Detailed bio about crypto and gas receipts',
      profile_image_url: 'https://pbs.twimg.com/custom_avatar.jpg',
      public_metrics: {
        followers_count: 1000,   // >= 500 => +5
        following_count: 200,    // no suspicious ratio
        tweet_count: 500,        // >= 200 => +5
        listed_count: 10,        // > 0 => +10
      },
    });

    const history: HistoricalSignals = {
      avgQualityScore: 0.9, // > 0.7 => +5
      isProtected: false,
      snapshotAge: 30,
    };

    const result = scoreAccountQuality(user, history);
    // Baseline 50 + 10 (age) + 5 (followers) + 5 (tweets) + 10 (listed) + 5 (quality)
    // = 85, no penalties
    expect(result.score).toBe(85);
    expect(result.passed).toBe(true);
    expect(result.flags.length).toBe(0);
  });

  // Test 14: Decay weight consistency — same signals at different snapshot ages.
  // Penalty decreases as snapshot ages: 30d full, 90d full, 180d 0.6, 365d 0.3.
  // So the score should INCREASE (less penalty) as data ages.
  it('Test 14: Older snapshots produce monotonically increasing scores (less penalty)', () => {
    const baseUser = makeUser({
      created_at: '2022-01-01T00:00:00Z',
      public_metrics: {
        followers_count: 200,   // current
        following_count: 200,
        tweet_count: 300,
        listed_count: 5,
      },
    });

    // Historical: previous follower count was 1000, dropped to 200 => 80% drop
    // Also isProtected=true (penalty with decay)
    const ages = [30, 90, 180, 365];
    const scores = ages.map((age) => {
      const history: HistoricalSignals = {
        previousFollowerCount: 1000,
        isProtected: true,
        snapshotAge: age,
      };
      return scoreAccountQuality(baseUser, history).score;
    });

    // 30d and 90d: decay=1.0 (same penalty)
    expect(scores[0]).toBe(scores[1]);
    // 90d -> 180d: decay drops from 1.0 to 0.6, score increases
    expect(scores[2]).toBeGreaterThan(scores[1]);
    // 180d -> 365d: decay drops from 0.6 to 0.3, score increases
    expect(scores[3]).toBeGreaterThan(scores[2]);
  });

  // Test 15: 100 accounts with identical live data but varying historical signals.
  // Measures the RANGE of possible scores — how much do historical signals shift?
  it('Test 15: Historical signals produce a meaningful range of score variation', () => {
    const rng = seededRng(9999);
    const baseUser = makeUser(); // fixed live data

    const scores: number[] = [];
    for (let i = 0; i < 100; i++) {
      const history: HistoricalSignals = {
        previousFollowerCount: rng() > 0.5 ? Math.floor(rng() * 3000) : null,
        avgQualityScore: rng() > 0.4 ? rng() : null,
        isProtected: rng() > 0.85,
        ipCountry: ['US', 'NG', 'IN', 'GB', 'PH'][Math.floor(rng() * 5)],
        xLocation: ['New York', 'Lagos', 'Mumbai', 'London', 'Manila'][Math.floor(rng() * 5)],
        snapshotAge: Math.floor(rng() * 400),
      };
      scores.push(scoreAccountQuality(baseUser, history).score);
    }

    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore;

    // Historical signals should create meaningful variation (at least 10 points range)
    expect(range).toBeGreaterThanOrEqual(10);
    // But not dominate entirely — the base user is healthy, so max should still be high
    expect(maxScore).toBeGreaterThanOrEqual(60);
    // All scores still clamped properly
    expect(minScore).toBeGreaterThanOrEqual(0);
    expect(maxScore).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 4: Tier System Under Volume
// ═══════════════════════════════════════════════════════════════════════════

describe('Category 4: Tier System Under Volume', () => {
  // Test 16: 10,000 random balances — every one maps to exactly one tier.
  it('Test 16: 10,000 random balances each map to exactly one valid tier', () => {
    const rng = seededRng(5555);
    const tierCounts: Record<string, number> = {};

    for (let i = 0; i < 10_000; i++) {
      // Balances from 0 to 100M, weighted toward lower end
      const balance = Math.floor(rng() * rng() * 100_000_000);
      const tier = getTierForBalance(balance);

      expect(tier).toBeDefined();
      expect(tier.id).toBeGreaterThanOrEqual(0);
      expect(tier.id).toBeLessThanOrEqual(3);
      expect(tier.name).toBeTruthy();

      tierCounts[tier.slug] = (tierCounts[tier.slug] || 0) + 1;
    }

    // All 4 tiers should be represented in 10K samples
    expect(Object.keys(tierCounts).length).toBe(4);
    // Standard (min=1) should have the most since rng()*rng() is skewed low
    expect(tierCounts['standard']).toBeGreaterThan(0);
    expect(tierCounts['commuter']).toBeGreaterThan(0);
    expect(tierCounts['road-warrior']).toBeGreaterThan(0);
    expect(tierCounts['fleet']).toBeGreaterThan(0);
  });

  // Test 17: Cooldown math — max weekly SOL payout per tier.
  // submissions_per_week = 7 / cooldown_days, then * max_sol_refund.
  // Fleet should be the highest earner.
  it('Test 17: Fleet tier has highest weekly SOL earning potential', () => {
    const weeklyPayouts = TOKEN_TIERS.map((tier) => {
      const submissionsPerWeek = 7 / tier.cooldown_days;
      const weeklyMax = submissionsPerWeek * tier.max_sol_refund;
      return { slug: tier.slug, submissionsPerWeek, weeklyMax };
    });

    // Fleet: 7/1.75 = 4 subs/week * 1.0 SOL = 4.0 SOL/week
    const fleet = weeklyPayouts.find((p) => p.slug === 'fleet')!;
    expect(fleet.submissionsPerWeek).toBe(4);
    expect(fleet.weeklyMax).toBe(4.0);

    // Road Warrior: 7/3.5 = 2 subs/week * 0.50 = 1.0 SOL/week
    const rw = weeklyPayouts.find((p) => p.slug === 'road-warrior')!;
    expect(rw.submissionsPerWeek).toBe(2);
    expect(rw.weeklyMax).toBe(1.0);

    // Commuter: 7/7 = 1 sub/week * 0.25 = 0.25 SOL/week
    const commuter = weeklyPayouts.find((p) => p.slug === 'commuter')!;
    expect(commuter.submissionsPerWeek).toBe(1);
    expect(commuter.weeklyMax).toBe(0.25);

    // Standard: 7/7 = 1 sub/week * 0.10 = 0.10 SOL/week
    const standard = weeklyPayouts.find((p) => p.slug === 'standard')!;
    expect(standard.submissionsPerWeek).toBe(1);
    expect(standard.weeklyMax).toBe(0.10);

    // Fleet should be the highest earner
    const maxPayout = Math.max(...weeklyPayouts.map((p) => p.weeklyMax));
    expect(fleet.weeklyMax).toBe(maxPayout);

    // Verify monotonically increasing payout potential by tier
    expect(fleet.weeklyMax).toBeGreaterThan(rw.weeklyMax);
    expect(rw.weeklyMax).toBeGreaterThan(commuter.weeklyMax);
    expect(commuter.weeklyMax).toBeGreaterThan(standard.weeklyMax);
  });

  // Test 18: Balance drops between submission and payout.
  // Submit at Fleet (10M), balance drops to Commuter range (100K).
  // Tier lookup should return the lower tier.
  it('Test 18: Balance drop returns correct lower tier at payout time', () => {
    // At submission time: Fleet
    const submitTier = getTierForBalance(10_000_000);
    expect(submitTier.slug).toBe('fleet');

    // At payout time: balance dropped to 100K => Commuter
    const payoutTier = getTierForBalance(100_000);
    expect(payoutTier.slug).toBe('commuter');
    expect(payoutTier.max_sol_refund).toBe(0.25);
    expect(payoutTier.max_sol_refund).toBeLessThan(submitTier.max_sol_refund);

    // Edge: dropped to 0 => Standard (min_tokens=1, but 0 < 1)
    // Actually, getTierForBalance(0) should still return Standard as fallback
    const zeroTier = getTierForBalance(0);
    expect(zeroTier.slug).toBe('standard');

    // Edge: dropped to exactly the boundary
    const exactBoundary = getTierForBalance(5_000_000);
    expect(exactBoundary.slug).toBe('road-warrior');

    // Just below boundary
    const justBelow = getTierForBalance(4_999_999);
    expect(justBelow.slug).toBe('commuter');

    // Cooldown still uses tier ID correctly
    expect(getCooldownForTier(submitTier.id)).toBe(1.75);
    expect(getCooldownForTier(payoutTier.id)).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 5: Location Intelligence at Scale
// ═══════════════════════════════════════════════════════════════════════════

describe('Category 5: Location Intelligence at Scale', () => {
  // Test 19: 100 random country combinations — risk adjustment always in [0, 0.20].
  it('Test 19: 100 country combos always produce risk adjustment between 0 and 0.20', () => {
    const countries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'MX', 'IN', 'NG', 'PH'];
    const currencies = ['USD', 'GBP', 'CAD', 'AUD', 'EUR', 'JPY', 'BRL', 'MXN', 'INR', null];
    const rng = seededRng(3333);

    for (let i = 0; i < 100; i++) {
      const ipCountry = countries[Math.floor(rng() * countries.length)];
      const ocrCountry = rng() > 0.3 ? countries[Math.floor(rng() * countries.length)] : null;
      const ocrCurrency = rng() > 0.4 ? currencies[Math.floor(rng() * currencies.length)] : null;
      const exifHasGps = rng() > 0.6;

      const result = scoreLocationConsistency({
        ipCountry,
        ocrCountry,
        ocrCurrency,
        exifHasGps,
      });

      expect(result.riskAdjustment).toBeGreaterThanOrEqual(0);
      expect(result.riskAdjustment).toBeLessThanOrEqual(0.20);
    }
  });

  // Test 20: Country code format variations — lowercase, uppercase, mixed, null, empty.
  it('Test 20: All country code formats handled without errors', () => {
    const formats: Array<{ ipCountry: string | null; label: string }> = [
      { ipCountry: 'US', label: 'uppercase' },
      { ipCountry: 'us', label: 'lowercase' },
      { ipCountry: 'Us', label: 'mixed case' },
      { ipCountry: 'GB', label: '2-char uppercase' },
      { ipCountry: 'gb', label: '2-char lowercase' },
      { ipCountry: null, label: 'null' },
      { ipCountry: '', label: 'empty string' },
    ];

    for (const { ipCountry } of formats) {
      // Should never throw, regardless of format
      const result = scoreLocationConsistency({
        ipCountry,
        ocrCountry: 'US',
        ocrCurrency: 'USD',
        exifHasGps: false,
      });

      expect(result.riskAdjustment).toBeGreaterThanOrEqual(0);
      expect(result.riskAdjustment).toBeLessThanOrEqual(0.20);
      expect(Array.isArray(result.flags)).toBe(true);
    }

    // Null ipCountry should always return 0 adjustment (early return in the function)
    const nullResult = scoreLocationConsistency({
      ipCountry: null,
      ocrCountry: 'US',
      ocrCurrency: 'USD',
      exifHasGps: false,
    });
    expect(nullResult.riskAdjustment).toBe(0);
    expect(nullResult.flags.length).toBe(0);
  });
});
