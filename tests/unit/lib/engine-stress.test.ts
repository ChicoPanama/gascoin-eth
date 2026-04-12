/**
 * GASCOIN Engine Stress Tests
 *
 * 40 tests designed to break the fraud detection system before production.
 * Covers every gate, scoring path, tier boundary, edge case, and
 * downstream pipeline behavior when gates pass but scoring is nuanced.
 *
 * No network calls, no database, no external dependencies.
 * Every test is deterministic and self-contained.
 */

import { describe, it, expect } from 'vitest';
import { evaluateClaim, type ClaimInput } from '@/lib/policy';
import { scoreAccountQuality, type HistoricalSignals } from '@/lib/account-quality';
import type { XUser } from '@/lib/x-api';
import {
  getTierForBalance,
  getCooldownForTier,
  TOKEN_TIERS,
} from '@/lib/token-tiers';
import {
  scoreLocationConsistency,
  isCountryBlocked,
  isElevatedScrutiny,
} from '@/lib/geo-config';
import {
  calculateEngagementPoints,
  calculateStreakBonus,
  POINTS_CONFIG,
} from '@/lib/engagement-rewards';

// ---------------------------------------------------------------------------
// Helpers — build valid inputs with overrides
// ---------------------------------------------------------------------------

/** A ClaimInput where every gate passes and risk is minimal. */
function validClaim(overrides: Partial<ClaimInput> = {}): ClaimInput {
  return {
    xVerified: true,
    tweetUrl: 'https://x.com/user/status/123',
    tweetHasGascoin: true,
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
    created_at: '2022-01-01T00:00:00Z', // >365 days old
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

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 1: Policy Engine Gate Bypass Attempts (8 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 1: Policy Engine Gate Bypass Attempts', () => {
  it('Test 1: All gates pass with low risk — should approve (baseline)', () => {
    // WHY: Confirms the happy path works end-to-end. If this fails, everything is broken.
    const result = evaluateClaim(validClaim());

    expect(result.gates).toHaveLength(13);
    expect(result.failed).toHaveLength(0);
    expect(result.decision).toBe('ready_for_dispatch');
    expect(result.riskScore).toBeLessThan(0.35);
  });

  it('Test 2: Only tweet_hashtag fails, everything else perfect — should NOT approve', () => {
    // WHY: Attackers will try submitting without the hashtag to game the system.
    // A single gate failure must block approval even when everything else is clean.
    const result = evaluateClaim(validClaim({ tweetHasGascoin: false }));

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].gate).toBe('tweet_hashtag');
    expect(result.decision).not.toBe('ready_for_dispatch');
  });

  it('Test 3: AI score at exact threshold (0.65) — should fail the gate', () => {
    // WHY: Boundary test. The gate uses strict < 0.65, so exactly 0.65 must FAIL.
    // Off-by-one at this threshold means AI-generated receipts slip through.
    const result = evaluateClaim(validClaim({ aiScore: 0.65 }));

    const aiGate = result.gates.find((g) => g.gate === 'ai_image_check');
    expect(aiGate?.passed).toBe(false);
    expect(result.decision).not.toBe('ready_for_dispatch');
  });

  it('Test 4: AI score at 0.649 — should pass the gate', () => {
    // WHY: Just below threshold must pass. Ensures we are not over-blocking legitimate users.
    const result = evaluateClaim(validClaim({ aiScore: 0.649 }));

    const aiGate = result.gates.find((g) => g.gate === 'ai_image_check');
    expect(aiGate?.passed).toBe(true);
  });

  it('Test 5: Tamper score at exact threshold (0.55) — should fail the gate', () => {
    // WHY: Tampered receipts (Photoshop edits, text overlays) must be caught.
    // The gate uses strict < 0.55, so exactly 0.55 is a failure.
    const result = evaluateClaim(validClaim({ tamperScore: 0.55 }));

    const tamperGate = result.gates.find((g) => g.gate === 'tamper_check');
    expect(tamperGate?.passed).toBe(false);
    expect(result.decision).not.toBe('ready_for_dispatch');
  });

  it('Test 6: Multiple gates fail simultaneously — risk score should compound correctly', () => {
    // WHY: Fraud attempts often fail multiple gates at once. The risk formula adds
    // 0.09 per failed gate + weighted AI/tamper scores. We verify the math.
    const input = validClaim({
      xVerified: false,       // gate 1 fails
      tweetHasGascoin: false, // gate 2 fails
      aiScore: 0.7,           // gate 3 fails (>= 0.65)
      tamperScore: 0.6,       // gate 4 fails (>= 0.55)
    });
    const result = evaluateClaim(input);

    expect(result.failed).toHaveLength(4);

    // Manual calculation:
    // failed.length=4 => 4*0.09 = 0.36
    // aiScore contribution => 0.7*0.35 = 0.245
    // tamperScore contribution => 0.6*0.25 = 0.15
    // amountUsd=50 (<= 200) => 0
    // Total = 0.36 + 0.245 + 0.15 = 0.755, capped at min(1, 0.755) = 0.755
    const expected = +(0.36 + 0.245 + 0.15).toFixed(4);
    expect(result.riskScore).toBeCloseTo(expected, 3);
    expect(result.decision).toBe('rejected'); // 0.755 >= 0.6
  });

  it('Test 7: All gates fail — should be rejected (not just needs_review)', () => {
    // WHY: If someone submits garbage that fails every check, we must hard-reject,
    // not leave it in review limbo.
    const input: ClaimInput = {
      xVerified: false,
      tweetUrl: '',
      tweetHasGascoin: false,
      tweetLive: false,
      connectedWallet: 'AAAA1111',
      walletOnReceipt: 'ZZZZ9999', // last 4 mismatch
      receiptHasGascoin: false,
      gascoinTokenBalance: 0,
      aiScore: 0.9,
      tamperScore: 0.9,
      duplicateHash: true,
      duplicatePhash: true,
      cooldownOk: false,
      amountUsd: 300,
      followerCount: 5,
      accountQualityScore: 10,
      accountQualityPassed: false,
    };
    const result = evaluateClaim(input);

    // In dry-run mode, gascoin_min_hold is bypassed, so 11 of 12 gates fail
    // (or 12 if ENABLE_LIVE_PAYOUT=true). Either way, the risk is extreme.
    expect(result.failed.length).toBeGreaterThanOrEqual(11);
    expect(result.decision).toBe('rejected');
    expect(result.riskScore).toBeGreaterThanOrEqual(0.6);
  });

  it('Test 8: Wallet match with case-insensitive last-4 chars', () => {
    // WHY: Wallets are case-sensitive but the matching uses toLowerCase().
    // An attacker might try to bypass by changing case.
    const result = evaluateClaim(
      validClaim({
        connectedWallet: 'SomeWalletABCD',
        walletOnReceipt: 'xxxabcd', // lowercase last 4
      }),
    );

    const walletGate = result.gates.find((g) => g.gate === 'wallet_match');
    expect(walletGate?.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 2: Account Quality Scoring with Historical Signals (6 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 2: Account Quality Scoring with Historical Signals', () => {
  it('Test 9: Brand new account (<30 days, 0 tweets, default avatar) — should fail hard', () => {
    // WHY: Sybil accounts are created in bulk and submit immediately.
    // New account + no tweets + default avatar = almost certainly fake.
    const thirtyDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString(); // 15 days old
    const user = makeUser({
      created_at: thirtyDaysAgo,
      description: '',
      profile_image_url: 'https://pbs.twimg.com/profile_images/default_profile_normal.png',
      public_metrics: {
        followers_count: 5,
        following_count: 2,
        tweet_count: 0,
        listed_count: 0,
      },
    });

    const result = scoreAccountQuality(user);

    // Baseline 50
    // -25 (under 30 days) -15 (low followers) -20 (almost no tweets)
    // -5 (never listed) -10 (empty bio) -10 (default avatar) = -85
    // 50 - 85 = -35, clamped to 0
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.flags).toContain('account_under_30_days');
    expect(result.flags).toContain('almost_no_tweets');
    expect(result.flags).toContain('default_avatar');
    expect(result.flags).toContain('empty_bio');
    expect(result.flags).toContain('low_followers');
  });

  it('Test 10: Bought followers dump — previousFollowerCount=10000, current=500 — massive penalty', () => {
    // WHY: Accounts buy 10K followers, submit claims, then followers get purged.
    // A 95% drop is a smoking gun for purchased followers.
    const user = makeUser({
      public_metrics: {
        followers_count: 500,
        following_count: 200,
        tweet_count: 300,
        listed_count: 5,
      },
    });
    const history: HistoricalSignals = {
      previousFollowerCount: 10000,
    };

    const result = scoreAccountQuality(user, history);

    // dropPct = (10000-500)/10000 = 0.95 > 0.5 => -20 penalty
    expect(result.flags).toContain('follower_drop_95pct');
    // Baseline 50 + 10 (age>365) + 5 (followers>=500) + 5 (tweets>=200) + 10 (listed>0) = 80
    // -20 (follower drop) = 60. The penalty brings it down significantly.
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it('Test 11: Bot follower injection — previous=100, current=5000 on small account — penalty', () => {
    // WHY: Going from 100 to 5000 followers (50x) on a small account screams bot injection.
    // spikePct = (5000-100)/100 = 49 > 5 AND followers < 5000 ... edge: followers=5000 is NOT <5000
    // Actually followers=5000 fails the <5000 check, so let's use 4999.
    const user = makeUser({
      public_metrics: {
        followers_count: 4999,
        following_count: 200,
        tweet_count: 300,
        listed_count: 5,
      },
    });
    const history: HistoricalSignals = {
      previousFollowerCount: 100,
    };

    const result = scoreAccountQuality(user, history);

    // spikePct = (4999-100)/100 = 48.99 > 5, followers 4999 < 5000 => -15 penalty
    expect(result.flags).toContain('follower_spike_4899pct');
  });

  it('Test 12: Account went private (isProtected=true) — penalty applied', () => {
    // WHY: Accounts that go private after submitting a claim are hiding evidence.
    // This is a classic fraud pattern — post, claim, then lock account.
    const user = makeUser();
    const history: HistoricalSignals = {
      isProtected: true,
    };

    const result = scoreAccountQuality(user, history);

    expect(result.flags).toContain('account_went_private');
    // -15 penalty from private, so should be lower than a clean account
    const cleanResult = scoreAccountQuality(makeUser());
    expect(result.score).toBe(cleanResult.score - 15);
  });

  it('Test 13: Location mismatch — IP says US, X profile says Nigeria — flag', () => {
    // WHY: If someone's IP is in the US but their X profile says Lagos, Nigeria,
    // it could be a VPN user or a fraud ring. We flag but don't hard-reject.
    const user = makeUser();
    const history: HistoricalSignals = {
      ipCountry: 'US',
      xLocation: 'Lagos, Nigeria',
    };

    const result = scoreAccountQuality(user, history);

    // The scorer checks if IP country names (US -> USA, UNITED STATES, AMERICA)
    // appear in the xLocation string. "LAGOS, NIGERIA" does not contain any of those.
    expect(result.flags).toContain('location_ip_mismatch');
  });

  it('Test 14: Veteran account with perfect history — should get bonus points', () => {
    // WHY: Legitimate long-time users should get rewarded, not punished.
    // A >365-day account with good metrics and high quality trend should score high.
    const user = makeUser({
      created_at: '2020-01-01T00:00:00Z', // >4 years old
      public_metrics: {
        followers_count: 2000,
        following_count: 300,
        tweet_count: 5000,
        listed_count: 20,
      },
    });
    const history: HistoricalSignals = {
      avgQualityScore: 0.85, // high quality => +5
    };

    const result = scoreAccountQuality(user, history);

    // Baseline 50 + 10 (age>365) + 5 (followers>=500) + 5 (tweets>=200) + 10 (listed>0) + 5 (quality>0.7) = 85
    expect(result.score).toBe(85);
    expect(result.passed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 3: Token Tier System (5 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 3: Token Tier System', () => {
  it('Test 15: Balance of 0 — should fall back to Standard (min_tokens=1)', () => {
    // WHY: A user with 0 tokens should still resolve to Standard tier via the
    // fallback (?? TOKEN_TIERS[0]). The gate gascoin_min_hold separately enforces the hold.
    const tier = getTierForBalance(0);

    // The function does [...TOKEN_TIERS].reverse().find(t => 0 >= t.min_tokens)
    // Fleet(10M), Road Warrior(5M), Commuter(100K), Standard(1) — 0 >= 1 is false for all
    // So it falls back to TOKEN_TIERS[0] = Standard
    expect(tier.name).toBe('Standard');
  });

  it('Test 16: Balance of 1 — Standard tier, 7-day cooldown', () => {
    // WHY: The absolute minimum hold to access the platform. Must map correctly.
    const tier = getTierForBalance(1);

    expect(tier.name).toBe('Standard');
    expect(tier.cooldown_days).toBe(7);
    expect(tier.max_sol_refund).toBe(0.10);
  });

  it('Test 17: Balance at exact tier boundaries — 100000=Commuter, 4999999=Commuter (not Road Warrior)', () => {
    // WHY: Off-by-one at tier boundaries could give users free upgrades or demotions.
    // 100K is the Commuter minimum; 5M-1 must NOT reach Road Warrior.
    const commuterExact = getTierForBalance(100_000);
    expect(commuterExact.name).toBe('Commuter');

    const justBelowRoadWarrior = getTierForBalance(4_999_999);
    expect(justBelowRoadWarrior.name).toBe('Commuter');

    const roadWarriorExact = getTierForBalance(5_000_000);
    expect(roadWarriorExact.name).toBe('Road Warrior');

    const justBelowFleet = getTierForBalance(9_999_999);
    expect(justBelowFleet.name).toBe('Road Warrior');
  });

  it('Test 18: Fleet tier — verify 10M tokens, 1.75-day cooldown, 1.0 SOL max refund', () => {
    // WHY: Fleet is the highest tier. Wrong values here mean whales get incorrect payouts.
    const tier = getTierForBalance(10_000_000);

    expect(tier.name).toBe('Fleet');
    expect(tier.min_tokens).toBe(10_000_000);
    expect(tier.cooldown_days).toBe(1.75);
    expect(tier.max_sol_refund).toBe(1.0);
    expect(tier.queue_priority).toBe(1); // highest priority
  });

  it('Test 19: getCooldownForTier returns correct days for all tiers', () => {
    // WHY: Cooldown enforcement is critical — wrong cooldown means users can
    // double-dip or get blocked longer than they should.
    expect(getCooldownForTier(0)).toBe(7);     // Standard
    expect(getCooldownForTier(1)).toBe(7);     // Commuter
    expect(getCooldownForTier(2)).toBe(3.5);   // Road Warrior
    expect(getCooldownForTier(3)).toBe(1.75);  // Fleet

    // Out-of-bounds tier ID should fallback to 7 days
    expect(getCooldownForTier(99)).toBe(7);
    expect(getCooldownForTier(-1)).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 4: Location Intelligence (4 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 4: Location Intelligence', () => {
  it('Test 20: IP matches OCR country, has EXIF GPS — zero risk adjustment', () => {
    // WHY: When all location signals agree, there is no reason to add risk.
    // This is the cleanest possible submission.
    const result = scoreLocationConsistency({
      ipCountry: 'US',
      ocrCountry: 'US',
      ocrCurrency: 'USD',
      exifHasGps: true,
    });

    expect(result.riskAdjustment).toBe(0);
    expect(result.flags).toHaveLength(0);
  });

  it('Test 21: IP does not match OCR country, no GPS — maximum risk adjustment', () => {
    // WHY: IP in one country + receipt from another + no GPS to verify = very suspicious.
    // This is a common pattern for receipt farms.
    const result = scoreLocationConsistency({
      ipCountry: 'US',
      ocrCountry: 'IN',
      ocrCurrency: 'INR',
      exifHasGps: false,
    });

    // ip_ocr_mismatch: +0.12
    // currency_country_mismatch: INR expected in ['IN'] but ocr is 'IN' — actually matches!
    // So only +0.12
    expect(result.riskAdjustment).toBe(0.12);
    expect(result.flags).toContain('ip_ocr_mismatch:US_vs_IN');
  });

  it('Test 22: Currency does not match country (USD in India) — risk flag', () => {
    // WHY: Finding USD on a receipt in India is suspicious. Mismatched currency
    // suggests a forged or foreign receipt.
    const result = scoreLocationConsistency({
      ipCountry: 'IN',
      ocrCountry: 'IN',
      ocrCurrency: 'USD', // USD expected in ['US'], but ocrCountry is 'IN'
      exifHasGps: true,
    });

    // IP matches OCR + has GPS => 0 from mismatch
    // But USD currency expected in US, not IN => +0.08
    expect(result.riskAdjustment).toBe(0.08);
    expect(result.flags).toContain('currency_country_mismatch:USD_in_IN');
  });

  it('Test 23: Null IP country — should skip all checks gracefully', () => {
    // WHY: In local dev or when the edge header is missing, ipCountry is null.
    // The system must not crash or flag anything when IP is unavailable.
    const result = scoreLocationConsistency({
      ipCountry: null,
      ocrCountry: 'NG',
      ocrCurrency: 'NGN',
      exifHasGps: false,
    });

    expect(result.riskAdjustment).toBe(0);
    expect(result.flags).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 5: Risk Score Math & Decision Logic (4 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 5: Risk Score Math & Decision Logic', () => {
  it('Test 24: Risk score formula verification — manually calculate expected risk', () => {
    // WHY: The risk formula is the heart of fraud detection. If the math is wrong,
    // real fraud gets approved or real users get blocked.
    //
    // Formula: min(1, (failed.length * 0.09) + (aiScore * 0.35) + (tamperScore * 0.25) + (amount>200 ? 0.08 : 0))
    const input = validClaim({
      aiScore: 0.3,
      tamperScore: 0.2,
      amountUsd: 50,
    });
    const result = evaluateClaim(input);

    // 0 failed gates => 0*0.09 = 0
    // aiScore: 0.3*0.35 = 0.105
    // tamperScore: 0.2*0.25 = 0.05
    // amount <= 200 => 0
    // Total: 0.155
    expect(result.riskScore).toBeCloseTo(0.155, 3);
    expect(result.decision).toBe('ready_for_dispatch');
  });

  it('Test 25: Borderline needs_review (riskScore exactly 0.35) — should be needs_review not approve', () => {
    // WHY: The threshold is strict < 0.35 for approval. At exactly 0.35, the claim
    // must NOT be auto-approved — it goes to review.
    //
    // We need: 0 failed gates, and (ai*0.35 + tamper*0.25) = 0.35
    // If aiScore=0.5, tamperScore=0.7: 0.5*0.35 + 0.7*0.25 = 0.175 + 0.175 = 0.35
    // But tamperScore=0.7 fails the tamper gate (>= 0.55), adding a failed gate.
    //
    // Better approach: aiScore=1.0, tamperScore=0.0 => 1.0*0.35 + 0 = 0.35
    // But aiScore=1.0 fails ai gate, adding 0.09.
    //
    // We need all gates to pass. With aiScore < 0.65 and tamperScore < 0.55:
    // Max from pure scores: 0.649*0.35 + 0.549*0.25 = 0.22715 + 0.13725 = 0.3644 (too high for control)
    //
    // Let's engineer it: aiScore=0.6, tamperScore=0.2 => 0.6*0.35 + 0.2*0.25 = 0.21 + 0.05 = 0.26
    // Need 0.09 more. One failed gate = +0.09. So fail one gate.
    // riskScore = 0.09 + 0.21 + 0.05 = 0.35, decision: failed>0 so NOT ready_for_dispatch, check <0.6: needs_review
    const input = validClaim({
      xVerified: false, // 1 gate fails
      aiScore: 0.6,
      tamperScore: 0.2,
      amountUsd: 50,
    });
    const result = evaluateClaim(input);

    // 1 failed * 0.09 + 0.6*0.35 + 0.2*0.25 + 0 = 0.09 + 0.21 + 0.05 = 0.35
    expect(result.riskScore).toBeCloseTo(0.35, 3);
    expect(result.decision).toBe('needs_review'); // failed.length > 0, and riskScore < 0.6
  });

  it('Test 26: Borderline rejected (riskScore exactly at 0.6) — should be needs_review', () => {
    // WHY: The threshold is riskScore < 0.6 for needs_review. At exactly 0.6, the claim
    // should be 'rejected' because the condition is riskScore < 0.6.
    //
    // We need riskScore = 0.6 with at least 1 failed gate.
    // 1 fail: 0.09 + ai*0.35 + tamper*0.25 = 0.6 => ai*0.35 + tamper*0.25 = 0.51
    // aiScore=0.6 (passes gate), tamperScore=0.54 (passes gate):
    // 0.09 + 0.6*0.35 + 0.54*0.25 = 0.09 + 0.21 + 0.135 = 0.435 (too low)
    //
    // 3 fails: 0.27 + ai*0.35 + tamper*0.25 = 0.6 => need 0.33
    // ai=0.6 (passes), tamper=0.54 (passes): 0.21 + 0.135 = 0.345 (too high)
    // ai=0.5, tamper=0.52: 0.175 + 0.13 = 0.305, total = 0.575 (close)
    //
    // Let's just verify the behavior near 0.6 instead of hitting it exactly.
    // 6 fails * 0.09 = 0.54, ai=0.1*0.35=0.035, tamper=0.1*0.25=0.025, total=0.6
    const input = validClaim({
      xVerified: false,       // fail 1
      tweetHasGascoin: false, // fail 2
      tweetLive: false,       // fail 3
      receiptHasGascoin: false, // fail 4
      cooldownOk: false,      // fail 5
      followerCount: 50,      // fail 6 (< 100)
      aiScore: 0.1,
      tamperScore: 0.1,
      amountUsd: 50,
    });
    const result = evaluateClaim(input);

    // 6 * 0.09 + 0.1*0.35 + 0.1*0.25 + 0 = 0.54 + 0.035 + 0.025 = 0.6
    expect(result.riskScore).toBeCloseTo(0.6, 3);
    // riskScore is NOT < 0.6, so the second condition fails => 'rejected'
    expect(result.decision).toBe('rejected');
  });

  it('Test 27: High amount (>$200) adds 0.08 to risk', () => {
    // WHY: Large refund claims are higher risk. The $200 threshold adds 0.08.
    // Fraudsters target big amounts for maximum payout per attempt.
    const lowAmount = evaluateClaim(validClaim({ amountUsd: 200 }));
    const highAmount = evaluateClaim(validClaim({ amountUsd: 200.01 }));

    expect(highAmount.riskScore - lowAmount.riskScore).toBeCloseTo(0.08, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 6: Edge Cases & System Integrity (3 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 6: Edge Cases & System Integrity', () => {
  it('Test 28: Empty/null-ish inputs — walletOnReceipt empty, connectedWallet empty', () => {
    // WHY: OCR might fail to extract a wallet address, returning empty string.
    // The system must not crash or accidentally approve on empty comparisons.
    const result = evaluateClaim(
      validClaim({
        connectedWallet: '',
        walletOnReceipt: '',
      }),
    );

    // wallet_match gate: !!'' is false, so the gate should fail because walletOnReceipt is falsy
    const walletGate = result.gates.find((g) => g.gate === 'wallet_match');
    expect(walletGate?.passed).toBe(false);
    expect(result.decision).not.toBe('ready_for_dispatch');
  });

  it('Test 29: Negative values — followerCount=-1 (API failure), aiScore=-0.1', () => {
    // WHY: API failures or data corruption can produce negative values.
    // The system must handle them without crashing. Negative followerCount (-1 < 100)
    // should fail the min_followers gate. Negative aiScore should pass AI gate (< 0.65).
    const result = evaluateClaim(
      validClaim({
        followerCount: -1,
        aiScore: -0.1,
      }),
    );

    const followerGate = result.gates.find((g) => g.gate === 'min_followers');
    expect(followerGate?.passed).toBe(false);

    const aiGate = result.gates.find((g) => g.gate === 'ai_image_check');
    expect(aiGate?.passed).toBe(true); // -0.1 < 0.65

    // Risk score should not be negative (clamped at min by the formula)
    // min(1, failed*0.09 + (-0.1*0.35) + 0.1*0.25) = min(1, 0.09 + (-0.035) + 0.025) = 0.08
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('Test 30: Extreme values — followerCount=999999999, aiScore=999, amountUsd=0', () => {
    // WHY: Stress test with absurd values. An aiScore of 999 is nonsensical but
    // should not cause overflow. amountUsd=0 is a legitimate zero-dollar receipt edge case.
    const result = evaluateClaim(
      validClaim({
        followerCount: 999_999_999,
        aiScore: 999,
        tamperScore: 999,
        amountUsd: 0,
      }),
    );

    // aiScore=999 => ai gate fails (999 >= 0.65)
    // tamperScore=999 => tamper gate fails (999 >= 0.55)
    const aiGate = result.gates.find((g) => g.gate === 'ai_image_check');
    expect(aiGate?.passed).toBe(false);

    // Scores are now clamped to 0-1 before risk calculation (P1 fix)
    // Risk: min(1, 3*0.09 + 1.0*0.35 + 1.0*0.25 + 0) = 0.87 (3 failed: ai + tamper + min_amount)
    expect(result.riskScore).toBe(0.87);
    expect(result.decision).toBe('rejected');

    // Verify clamp flags were set (audit trail for anomalous upstream values)
    expect(result.clampFlags).toBeDefined();
    expect(result.clampFlags).toContain('ai_clamped:999->1');
    expect(result.clampFlags).toContain('tamper_clamped:999->1');

    // followerCount is huge => min_followers gate passes
    const followerGate = result.gates.find((g) => g.gate === 'min_followers');
    expect(followerGate?.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 7: Pipeline Depth Tests — Pass Gates, Test Scoring (5 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 7: Pipeline Depth Tests — Pass Gates, Test Scoring', () => {
  it('Test 31: All gates pass, AI=0.64 + tamper=0.54 (just under thresholds) — risk should be HIGH despite gates passing', () => {
    // WHY: Gates are binary (pass/fail) but the SCORING ENGINE is continuous.
    // AI at 0.64 passes the < 0.65 gate. Tamper at 0.54 passes the < 0.55 gate.
    // But the risk formula still weighs these heavily:
    //   (0 * 0.09) + (0.64 * 0.35) + (0.54 * 0.25) + 0 = 0 + 0.224 + 0.135 = 0.359
    // 0.359 >= 0.35 AND failed.length === 0... but the decision logic is:
    //   failed.length === 0 && riskScore < 0.35 ? 'ready_for_dispatch' : ...
    // So riskScore 0.359 >= 0.35 means NOT ready_for_dispatch.
    // Then riskScore < 0.6 => 'needs_review'.
    const result = evaluateClaim(validClaim({
      aiScore: 0.64,
      tamperScore: 0.54,
    }));

    // All 12 gates pass
    expect(result.failed).toHaveLength(0);

    // But the risk score is elevated
    const expectedRisk = +(0 + 0.64 * 0.35 + 0.54 * 0.25).toFixed(4);
    expect(result.riskScore).toBeCloseTo(expectedRisk, 3);
    expect(result.riskScore).toBeCloseTo(0.359, 3);

    // Critical: despite 0 failed gates, should NOT be ready_for_dispatch
    expect(result.decision).toBe('needs_review');
    expect(result.decision).not.toBe('ready_for_dispatch');
  });

  it('Test 32: All gates pass, amount=$250 (>$200 threshold) — risk gets +0.08 surcharge', () => {
    // WHY: High-dollar claims add 0.08 to risk even when all gates pass.
    // With clean scores (ai=0.1, tamper=0.1) the base risk is:
    //   (0 * 0.09) + (0.1 * 0.35) + (0.1 * 0.25) + 0.08 = 0 + 0.035 + 0.025 + 0.08 = 0.14
    // Compare to amount=200 (no surcharge):
    //   0 + 0.035 + 0.025 + 0 = 0.06
    // The difference must be exactly 0.08.
    const lowAmount = evaluateClaim(validClaim({ amountUsd: 200 }));
    const highAmount = evaluateClaim(validClaim({ amountUsd: 250 }));

    expect(lowAmount.failed).toHaveLength(0);
    expect(highAmount.failed).toHaveLength(0);

    // Verify exact risk math for high amount
    const expectedHigh = +(0 + 0.1 * 0.35 + 0.1 * 0.25 + 0.08).toFixed(4);
    expect(highAmount.riskScore).toBeCloseTo(expectedHigh, 3);
    expect(highAmount.riskScore).toBeCloseTo(0.14, 3);

    // The surcharge is exactly 0.08
    expect(highAmount.riskScore - lowAmount.riskScore).toBeCloseTo(0.08, 3);

    // Both still under 0.35 so both approved (amount alone should not reject)
    expect(lowAmount.decision).toBe('ready_for_dispatch');
    expect(highAmount.decision).toBe('ready_for_dispatch');
  });

  it('Test 33: All gates pass with perfect scores — minimal risk, ready_for_dispatch', () => {
    // WHY: The golden path. A pristine submission with minimal AI/tamper scores
    // and low amount should have the lowest possible risk score and auto-approve.
    //   (0 * 0.09) + (0.01 * 0.35) + (0.01 * 0.25) + 0 = 0.0035 + 0.0025 = 0.006
    const result = evaluateClaim(validClaim({
      aiScore: 0.01,
      tamperScore: 0.01,
      amountUsd: 10,
    }));

    expect(result.failed).toHaveLength(0);
    expect(result.riskScore).toBeCloseTo(0.006, 3);
    expect(result.riskScore).toBeLessThan(0.05); // Well under any threshold
    expect(result.decision).toBe('ready_for_dispatch');
  });

  it('Test 34: Account quality — terrible historical signals tank the score even with OK live data', () => {
    // WHY: An account can have 500 followers TODAY but be a fraud. If historical
    // signals show a follower dump, private toggle, low quality trend, and location
    // mismatch, the score should crater even though live X data looks legitimate.
    //
    // Baseline: 50
    // +10 (age > 365 days, created 2022-01-01)
    // +5  (followers >= 500)
    // +5  (tweets >= 200)
    // +10 (listed > 0)
    // Subtotal before history: 80
    //
    // Historical penalties:
    // -20 (follower_drop: previous=10000, current=500 => drop 95% > 50%)
    // -15 (account_went_private)
    // -10 (low_quality_trend: avgQualityScore=0.1 < 0.2)
    // -5  (location_ip_mismatch: IP=US, xLocation='Lagos, Nigeria')
    // Total penalties: -50
    //
    // Final: 80 - 50 = 30, clamped to 30 (> 0, < 100)
    // 30 < 40 threshold => passed = false
    const user = makeUser(); // 500 followers, 300 tweets, listed=5, age > 365 days

    const history: HistoricalSignals = {
      previousFollowerCount: 10000, // massive drop from 10K to 500
      isProtected: true,            // went private
      avgQualityScore: 0.1,         // terrible quality trend (< 0.2)
      ipCountry: 'US',
      xLocation: 'Lagos, Nigeria',  // location mismatch with US IP
    };

    const result = scoreAccountQuality(user, history);

    // Score should be 30 — well below the 40 threshold
    expect(result.score).toBe(30);
    expect(result.passed).toBe(false);

    // All four historical flags should fire
    expect(result.flags).toContain('follower_drop_95pct');
    expect(result.flags).toContain('account_went_private');
    expect(result.flags).toContain('low_quality_trend');
    expect(result.flags).toContain('location_ip_mismatch');
  });

  it('Test 35: Repeat offender — pass all gates but previous rejections captured in risk context', () => {
    // WHY: The policy engine evaluates a single claim, but the caller is responsible
    // for passing accountQualityScore/accountQualityPassed based on history.
    // A repeat offender with 3+ rejections should have a low account quality score.
    // Even if all gates technically pass, a low quality score compounds with AI/tamper.
    //
    // Simulate: account quality score of 35 (below 40) — accountQualityPassed=false
    // This makes the account_quality gate fail, adding 1 * 0.09 to risk.
    // With moderate AI/tamper: (1 * 0.09) + (0.4 * 0.35) + (0.3 * 0.25) = 0.09 + 0.14 + 0.075 = 0.305
    const result = evaluateClaim(validClaim({
      accountQualityScore: 35,
      accountQualityPassed: false, // 3+ rejections tanked the quality score
      aiScore: 0.4,
      tamperScore: 0.3,
    }));

    // Only the account_quality gate fails
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].gate).toBe('account_quality');

    // Risk calculation
    const expectedRisk = +(1 * 0.09 + 0.4 * 0.35 + 0.3 * 0.25).toFixed(4);
    expect(result.riskScore).toBeCloseTo(expectedRisk, 3);
    expect(result.riskScore).toBeCloseTo(0.305, 3);

    // Has failed gates so cannot be ready_for_dispatch, and riskScore < 0.6 => needs_review
    expect(result.decision).toBe('needs_review');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 8: Tier + Cooldown Interaction (3 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 8: Tier + Cooldown Interaction', () => {
  it('Test 36: Standard tier at balance=1 gets 0.10 SOL max, 7-day cooldown', () => {
    // WHY: The absolute floor. A user with exactly 1 token should get the minimum
    // payout cap and the longest cooldown. This is the most restrictive tier.
    const tier = getTierForBalance(1);

    expect(tier.name).toBe('Standard');
    expect(tier.max_sol_refund).toBe(0.10);
    expect(tier.cooldown_days).toBe(7);

    // Verify cooldown math: 7 days = 168 hours = 1 submission per week
    const submissionsPerWeek = 7 / tier.cooldown_days;
    expect(submissionsPerWeek).toBe(1);

    // Verify via getCooldownForTier
    expect(getCooldownForTier(tier.id)).toBe(7);
  });

  it('Test 37: Fleet at 10M gets 1.0 SOL max and 1.75-day cooldown — verify the math', () => {
    // WHY: Fleet is the whale tier. 1.75-day cooldown means:
    //   1.75 days = 42 hours
    //   7 days / 1.75 = 4 submissions per week
    // This is the exact number stated in the tier perks.
    const tier = getTierForBalance(10_000_000);

    expect(tier.name).toBe('Fleet');
    expect(tier.max_sol_refund).toBe(1.0);
    expect(tier.cooldown_days).toBe(1.75);

    // Verify cooldown math
    const cooldownHours = tier.cooldown_days * 24;
    expect(cooldownHours).toBe(42);

    const submissionsPerWeek = 7 / tier.cooldown_days;
    expect(submissionsPerWeek).toBe(4);

    // Verify via getCooldownForTier
    expect(getCooldownForTier(tier.id)).toBe(1.75);

    // Verify queue priority is highest (1)
    expect(tier.queue_priority).toBe(1);
  });

  it('Test 38: Tier boundaries are EXCLUSIVE — 4,999,999 is Commuter not Road Warrior, 9,999,999 is Road Warrior not Fleet', () => {
    // WHY: The tier lookup uses >= min_tokens. So being 1 token short of the next
    // tier must NOT upgrade you. This prevents accidental tier inflation.
    //
    // Boundaries:
    //   Standard:     min_tokens = 1
    //   Commuter:     min_tokens = 100,000
    //   Road Warrior: min_tokens = 5,000,000
    //   Fleet:        min_tokens = 10,000,000

    // Just below Commuter boundary
    const justBelowCommuter = getTierForBalance(99_999);
    expect(justBelowCommuter.name).toBe('Standard');

    // Exact Commuter boundary
    const exactCommuter = getTierForBalance(100_000);
    expect(exactCommuter.name).toBe('Commuter');

    // Just below Road Warrior boundary
    const justBelowRoadWarrior = getTierForBalance(4_999_999);
    expect(justBelowRoadWarrior.name).toBe('Commuter');
    expect(justBelowRoadWarrior.name).not.toBe('Road Warrior');

    // Exact Road Warrior boundary
    const exactRoadWarrior = getTierForBalance(5_000_000);
    expect(exactRoadWarrior.name).toBe('Road Warrior');

    // Just below Fleet boundary
    const justBelowFleet = getTierForBalance(9_999_999);
    expect(justBelowFleet.name).toBe('Road Warrior');
    expect(justBelowFleet.name).not.toBe('Fleet');

    // Exact Fleet boundary
    const exactFleet = getTierForBalance(10_000_000);
    expect(exactFleet.name).toBe('Fleet');

    // Verify max_sol_refund at each boundary edge
    expect(justBelowCommuter.max_sol_refund).toBe(0.10);  // Standard cap
    expect(justBelowRoadWarrior.max_sol_refund).toBe(0.25); // Commuter cap
    expect(justBelowFleet.max_sol_refund).toBe(0.50);       // Road Warrior cap
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 9: Location Scoring Depth (2 tests)
// ═══════════════════════════════════════════════════════════════════════════

describe('CATEGORY 9: Location Scoring Depth', () => {
  it('Test 39: All signals misaligned — IP=NG, OCR country=US, currency=GBP, no GPS — maximum risk adjustment', () => {
    // WHY: The worst-case location scenario. IP in Nigeria, receipt says US with GBP,
    // no GPS to verify. This should stack multiple penalties:
    //   ip_ocr_mismatch: IP=NG, OCR=US, no EXIF GPS => +0.12
    //   currency_country_mismatch: GBP expected in ['GB'], OCR is 'US' not 'GB' => +0.08
    //   Total: 0.20 (capped at min(adj, 0.20) = 0.20)
    //
    // Note: using GBP instead of USD because USD maps to ['US'] and OCR IS 'US',
    // so USD would NOT trigger a currency mismatch. GBP maps to ['GB'] which
    // does not include 'US', so it correctly fires.
    const result = scoreLocationConsistency({
      ipCountry: 'NG',
      ocrCountry: 'US',
      ocrCurrency: 'GBP', // GBP expected in GB, not US
      exifHasGps: false,
    });

    // Both flags fire, total capped at 0.20
    expect(result.riskAdjustment).toBe(0.20);
    expect(result.flags).toContain('ip_ocr_mismatch:NG_vs_US');
    expect(result.flags).toContain('currency_country_mismatch:GBP_in_US');
    expect(result.flags).toHaveLength(2);
  });

  it('Test 40: IP=US, OCR=US, currency=USD, has GPS — zero risk adjustment (perfect alignment)', () => {
    // WHY: When every location signal agrees — IP, OCR country, currency, and GPS
    // all confirm the same story — there should be ZERO risk adjustment.
    // This is the ideal scenario for a legitimate domestic submission.
    //
    // ip_ocr_mismatch: IP=US, OCR=US => no mismatch (ip === ocr)
    // no_exif_gps: has GPS => does not fire
    // currency_country_mismatch: USD expected in ['US'], OCR is US => matches, no flag
    // elevated_scrutiny: US not in ELEVATED_SCRUTINY_COUNTRIES => no flag
    const result = scoreLocationConsistency({
      ipCountry: 'US',
      ocrCountry: 'US',
      ocrCurrency: 'USD',
      exifHasGps: true,
    });

    expect(result.riskAdjustment).toBe(0);
    expect(result.flags).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════
// CATEGORY 10: API Fault Tolerance & Retry
// ═══════════════════════════════════════════
describe('CATEGORY 10: API Fault Tolerance', () => {
  it('Test 41: followerCount=-1 (API failure) returns retry_later, not rejected', () => {
    const result = evaluateClaim(validClaim({ followerCount: -1 }));
    expect(result.decision).toBe('retry_later');
    expect(result.riskScore).toBe(0);
  });

  it('Test 42: followerCount=0 is NOT an API failure — fails gate normally', () => {
    const result = evaluateClaim(validClaim({ followerCount: 0 }));
    expect(result.decision).not.toBe('retry_later');
    const gate = result.gates.find((g) => g.gate === 'min_followers');
    expect(gate?.passed).toBe(false);
  });

  it('Test 43: Clamp flags generated for out-of-range scores', () => {
    const result = evaluateClaim(validClaim({ aiScore: 2.5, tamperScore: -0.5 }));
    expect(result.clampFlags).toBeDefined();
    expect(result.clampFlags).toContain('ai_clamped:2.5->1');
    expect(result.clampFlags).toContain('tamper_clamped:-0.5->0');
  });

  it('Test 44: Normal scores produce no clamp flags', () => {
    const result = evaluateClaim(validClaim({ aiScore: 0.3, tamperScore: 0.2 }));
    expect(result.clampFlags).toBeUndefined();
  });

  it('Test 45: Tamper=0.99 alone blocks even with perfect AI score', () => {
    const result = evaluateClaim(validClaim({ aiScore: 0.0, tamperScore: 0.99 }));
    const tamperGate = result.gates.find((g) => g.gate === 'tamper_check');
    expect(tamperGate?.passed).toBe(false);
    expect(result.failed.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// CATEGORY 11: Historical Signal Decay
// ═══════════════════════════════════════════
describe('CATEGORY 11: Historical Signal Decay', () => {
  it('Test 46: Recent snapshot (30d) — full penalty for follower dump', () => {
    const result = scoreAccountQuality(
      { username: 'test', public_metrics: { followers_count: 500, following_count: 100, tweet_count: 200, listed_count: 2 }, description: 'Real user', profile_image_url: 'https://img.com/pic.jpg', created_at: '2024-01-01T00:00:00Z' } as any,
      { previousFollowerCount: 10000, snapshotAge: 30 },
    );
    expect(result.flags).toContain('follower_drop_95pct');
    // Base 50 + age>365(+10) + listed(+10) + tweets>=200(+5) - drop(-20) + followers<100(-5) = 50
    // Exact score depends on all signals, but the drop flag MUST be present
    expect(result.score).toBeLessThan(65);
  });

  it('Test 47: Old snapshot (200d) — reduced penalty for same dump', () => {
    const result = scoreAccountQuality(
      { username: 'test', public_metrics: { followers_count: 500, following_count: 100, tweet_count: 200, listed_count: 2 }, description: 'Real user', profile_image_url: 'https://img.com/pic.jpg', created_at: '2024-01-01T00:00:00Z' } as any,
      { previousFollowerCount: 10000, snapshotAge: 200 },
    );
    expect(result.flags).toContain('follower_drop_95pct');
    expect(result.score).toBeGreaterThan(50);
  });

  it('Test 48: Private account penalty decays with snapshot age', () => {
    const recent = scoreAccountQuality(
      { username: 'test', public_metrics: { followers_count: 500, following_count: 100, tweet_count: 200, listed_count: 2 }, description: 'Real user', profile_image_url: 'https://img.com/pic.jpg', created_at: '2024-01-01T00:00:00Z' } as any,
      { isProtected: true, snapshotAge: 10 },
    );
    const old = scoreAccountQuality(
      { username: 'test', public_metrics: { followers_count: 500, following_count: 100, tweet_count: 200, listed_count: 2 }, description: 'Real user', profile_image_url: 'https://img.com/pic.jpg', created_at: '2024-01-01T00:00:00Z' } as any,
      { isProtected: true, snapshotAge: 200 },
    );
    expect(old.score).toBeGreaterThan(recent.score);
  });
});
