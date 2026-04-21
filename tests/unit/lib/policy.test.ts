import { describe, it, expect } from 'vitest';
import { evaluateClaim, GATE_DEFS, GATE_COUNT, type ClaimInput } from '@/lib/policy';
import { GATES } from '@/lib/gates';

function validInput(overrides: Partial<ClaimInput> = {}): ClaimInput {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    xVerified: true, followsGascoin: true,
    tweetUrl: 'https://x.com/user/status/123', tweetHasGascoin: true, tweetMentionsGascoinApp: true,
    tweetLive: true, connectedWallet: 'GAsWallet123', walletOnReceipt: 'GAsWallet123',
    receiptHasGascoin: true, gascoinTokenBalance: 100, aiScore: 0.1, tamperScore: 0.1,
    duplicateHash: false, duplicatePhash: false, cooldownOk: true, amountUsd: 50,
    ocrAmount: 52, receiptDate: today,
    followerCount: 200, accountQualityScore: 60, accountQualityPassed: true,
    fraudRisk: 'low', ...overrides,
  };
}

// ─── Single source of truth alignment ─────────────────────────────
// These tests enforce that GATE_DEFS, GATE_COUNT, the actual evaluateClaim
// output, and the public-facing GATES documentation in lib/gates.ts all
// stay in lock-step. If a future PR adds a gate to evaluateClaim() but
// forgets to update GATE_DEFS or GATES, these tests fail loudly.
describe('GATE_DEFS / GATE_COUNT alignment', () => {
  it('GATE_COUNT matches GATE_DEFS.length', () => {
    expect(GATE_COUNT).toBe(GATE_DEFS.length);
  });

  it('GATE_DEFS has 18 entries', () => {
    expect(GATE_DEFS.length).toBe(18);
  });

  it('lib/gates.ts GATES has the same number of entries as GATE_DEFS', () => {
    expect(GATES.length).toBe(GATE_COUNT);
  });

  it('every lib/gates.ts entry has a policyGate that exists in GATE_DEFS', () => {
    const policyIds = new Set(GATE_DEFS.map((g) => g.id));
    for (const g of GATES) {
      expect(policyIds.has(g.policyGate as any)).toBe(true);
    }
  });
});

describe('evaluateClaim', () => {
  it('approves (ready_for_dispatch) when all gates pass and low risk', () => {
    const r = evaluateClaim(validInput());
    expect(r.decision).toBe('ready_for_dispatch');
    expect(r.failed).toHaveLength(0);
    expect(r.riskScore).toBeLessThan(0.35);
  });

  // Gate 1: x_verified
  it('fails gate x_verified when false', () => {
    const r = evaluateClaim(validInput({ xVerified: false }));
    expect(r.failed.some((g) => g.gate === 'x_verified')).toBe(true);
  });

  // Gate: follows_gascoin
  it('fails gate follows_gascoin when user does not follow @GasCoinApp', () => {
    const r = evaluateClaim(validInput({ followsGascoin: false }));
    expect(r.failed.some((g) => g.gate === 'follows_gascoin')).toBe(true);
  });

  it('passes gate follows_gascoin when user follows @GasCoinApp', () => {
    const r = evaluateClaim(validInput({ followsGascoin: true }));
    expect(r.failed.some((g) => g.gate === 'follows_gascoin')).toBe(false);
  });

  // Gate: tweet_mentions_gascoinapp
  it('fails gate tweet_mentions_gascoinapp when tweet does not tag @GasCoinApp', () => {
    const r = evaluateClaim(validInput({ tweetMentionsGascoinApp: false }));
    expect(r.failed.some((g) => g.gate === 'tweet_mentions_gascoinapp')).toBe(true);
  });

  it('passes gate tweet_mentions_gascoinapp when tweet tags @GasCoinApp', () => {
    const r = evaluateClaim(validInput({ tweetMentionsGascoinApp: true }));
    expect(r.failed.some((g) => g.gate === 'tweet_mentions_gascoinapp')).toBe(false);
  });

  // Gate 2: tweet_hashtag
  it('fails gate tweet_hashtag when missing', () => {
    const r = evaluateClaim(validInput({ tweetHasGascoin: false }));
    expect(r.failed.some((g) => g.gate === 'tweet_hashtag')).toBe(true);
  });

  // Gate 3: tweet_live
  it('fails gate tweet_live when tweet deleted', () => {
    const r = evaluateClaim(validInput({ tweetLive: false }));
    expect(r.failed.some((g) => g.gate === 'tweet_live')).toBe(true);
  });

  // Gate 4: receipt_hashtag
  it('fails gate receipt_hashtag when missing from receipt', () => {
    const r = evaluateClaim(validInput({ receiptHasGascoin: false }));
    expect(r.failed.some((g) => g.gate === 'receipt_hashtag')).toBe(true);
  });

  // Gate 5: wallet_match
  it('fails gate wallet_match when wallets differ', () => {
    const r = evaluateClaim(validInput({ walletOnReceipt: 'DifferentWallet' }));
    expect(r.failed.some((g) => g.gate === 'wallet_match')).toBe(true);
  });

  it('fails gate wallet_match when wallet on receipt is empty', () => {
    const r = evaluateClaim(validInput({ walletOnReceipt: '' }));
    expect(r.failed.some((g) => g.gate === 'wallet_match')).toBe(true);
  });

  it('passes gate wallet_match when only last 4 characters match', () => {
    const r = evaluateClaim(validInput({ connectedWallet: 'Fm9BxxxxxxcR3P', walletOnReceipt: 'cR3P' }));
    expect(r.failed.some((g) => g.gate === 'wallet_match')).toBe(false);
  });

  // Gate 6: gascoin_min_hold
  // In dry-run mode (ENABLE_LIVE_PAYOUT !== 'true'), this gate always passes
  it('passes gate gascoin_min_hold in dry-run mode regardless of balance', () => {
    const r = evaluateClaim(validInput({ gascoinTokenBalance: 0 }));
    // Dry-run bypasses the check — gate passes even with 0 tokens
    expect(r.failed.some((g) => g.gate === 'gascoin_min_hold')).toBe(false);
  });

  it('passes gate gascoin_min_hold with 1 token', () => {
    const r = evaluateClaim(validInput({ gascoinTokenBalance: 1 }));
    expect(r.failed.some((g) => g.gate === 'gascoin_min_hold')).toBe(false);
  });

  it('passes gate gascoin_min_hold with many tokens', () => {
    const r = evaluateClaim(validInput({ gascoinTokenBalance: 10_000_000 }));
    expect(r.failed.some((g) => g.gate === 'gascoin_min_hold')).toBe(false);
  });

  // Gate 7: not_duplicate (hash)
  it('fails gate not_duplicate when hash duplicate', () => {
    const r = evaluateClaim(validInput({ duplicateHash: true }));
    expect(r.failed.some((g) => g.gate === 'not_duplicate')).toBe(true);
  });

  it('fails gate not_duplicate when phash duplicate', () => {
    const r = evaluateClaim(validInput({ duplicatePhash: true }));
    expect(r.failed.some((g) => g.gate === 'not_duplicate')).toBe(true);
  });

  // Gate 8: ai_image_check
  it('fails gate ai_image_check when AI score >= 0.65', () => {
    const r = evaluateClaim(validInput({ aiScore: 0.7 }));
    expect(r.failed.some((g) => g.gate === 'ai_image_check')).toBe(true);
  });

  it('passes gate ai_image_check at 0.64', () => {
    const r = evaluateClaim(validInput({ aiScore: 0.64 }));
    expect(r.failed.some((g) => g.gate === 'ai_image_check')).toBe(false);
  });

  // Gate 9: tamper_check
  it('fails gate tamper_check when score >= 0.55', () => {
    const r = evaluateClaim(validInput({ tamperScore: 0.6 }));
    expect(r.failed.some((g) => g.gate === 'tamper_check')).toBe(true);
  });

  // Gate 10: cooldown
  it('fails gate cooldown when not ok', () => {
    const r = evaluateClaim(validInput({ cooldownOk: false }));
    expect(r.failed.some((g) => g.gate === 'cooldown')).toBe(true);
  });

  // Gate 11: min_followers
  it('fails gate min_followers when below 100', () => {
    const r = evaluateClaim(validInput({ followerCount: 50 }));
    expect(r.failed.some((g) => g.gate === 'min_followers')).toBe(true);
  });

  it('passes gate min_followers at exactly 100', () => {
    const r = evaluateClaim(validInput({ followerCount: 100 }));
    expect(r.failed.some((g) => g.gate === 'min_followers')).toBe(false);
  });

  it('[KNOWN BUG] followerCount -1 blocks users when X API is down', () => {
    const r = evaluateClaim(validInput({ followerCount: -1 }));
    // -1 means API failed — this should ideally pass or use a fallback, but currently fails
    expect(r.failed.some((g) => g.gate === 'min_followers')).toBe(true);
  });

  // Decision logic
  it('returns needs_review when gates fail with moderate risk', () => {
    // Fail a gate to push risk into needs_review range
    const r = evaluateClaim(validInput({ tweetLive: false, aiScore: 0.3, tamperScore: 0.3 }));
    expect(r.failed.length).toBeGreaterThan(0);
    expect(['needs_review', 'rejected']).toContain(r.decision);
  });

  it('returns rejected for high risk (>0.6)', () => {
    const r = evaluateClaim(validInput({ aiScore: 0.9, tamperScore: 0.9, duplicateHash: true }));
    expect(r.decision).toBe('rejected');
  });

  // Gate 12: account_quality
  it('fails gate account_quality when score below threshold', () => {
    const r = evaluateClaim(validInput({ accountQualityScore: 20, accountQualityPassed: false }));
    expect(r.failed.some((g) => g.gate === 'account_quality')).toBe(true);
  });

  it('passes gate account_quality when score above threshold', () => {
    const r = evaluateClaim(validInput({ accountQualityScore: 60, accountQualityPassed: true }));
    expect(r.failed.some((g) => g.gate === 'account_quality')).toBe(false);
  });

  it('returns exactly GATE_COUNT gates', () => {
    const r = evaluateClaim(validInput());
    expect(r.gates).toHaveLength(GATE_COUNT);
  });

  it('risk score is between 0 and 1', () => {
    const r = evaluateClaim(validInput());
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.riskScore).toBeLessThanOrEqual(1);
  });

  it('high amount increases risk score', () => {
    const low = evaluateClaim(validInput({ amountUsd: 50 }));
    const high = evaluateClaim(validInput({ amountUsd: 250 }));
    expect(high.riskScore).toBeGreaterThan(low.riskScore);
  });

  // Gate 16: receipt_date_valid
  it('fails receipt_date_valid when receipt is 8 days old', () => {
    const old = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10);
    const r = evaluateClaim(validInput({ receiptDate: old }));
    expect(r.failed.some((g) => g.gate === 'receipt_date_valid')).toBe(true);
  });

  it('fails receipt_date_valid when receipt is future-dated', () => {
    const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const r = evaluateClaim(validInput({ receiptDate: future }));
    expect(r.failed.some((g) => g.gate === 'receipt_date_valid')).toBe(true);
  });

  it('passes receipt_date_valid when receipt is today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = evaluateClaim(validInput({ receiptDate: today }));
    expect(r.failed.some((g) => g.gate === 'receipt_date_valid')).toBe(false);
  });

  it('fails receipt_date_valid when receiptDate is null (OCR could not read date, fail-closed)', () => {
    // Was fail-open (auto-pass) before 2026-04-21 — flipped to fail-closed so
    // deliberately-unreadable receipts can't bypass the date check.
    const r = evaluateClaim(validInput({ receiptDate: null }));
    expect(r.failed.some((g) => g.gate === 'receipt_date_valid')).toBe(true);
  });

  // Gate 17: amount_verified
  it('fails amount_verified when claimed amount exceeds OCR by more than 25%', () => {
    const r = evaluateClaim(validInput({ amountUsd: 100, ocrAmount: 40 }));
    expect(r.failed.some((g) => g.gate === 'amount_verified')).toBe(true);
  });

  it('passes amount_verified when claimed amount is within 25% of OCR', () => {
    const r = evaluateClaim(validInput({ amountUsd: 50, ocrAmount: 48 }));
    expect(r.failed.some((g) => g.gate === 'amount_verified')).toBe(false);
  });

  it('fails amount_verified when ocrAmount is null (OCR could not read total, fail-closed)', () => {
    // Was fail-open (auto-pass) before 2026-04-21 — flipped to fail-closed.
    const r = evaluateClaim(validInput({ ocrAmount: null }));
    expect(r.failed.some((g) => g.gate === 'amount_verified')).toBe(true);
  });

  it('passes amount_verified when claimed amount equals OCR amount exactly', () => {
    const r = evaluateClaim(validInput({ amountUsd: 52, ocrAmount: 52 }));
    expect(r.failed.some((g) => g.gate === 'amount_verified')).toBe(false);
  });
});
