import { describe, it, expect } from 'vitest';
import { evaluateClaim, type ClaimInput } from '@/lib/policy';

function validInput(overrides: Partial<ClaimInput> = {}): ClaimInput {
  return {
    xVerified: true, tweetUrl: 'https://x.com/user/status/123', tweetHasGascoin: true,
    tweetLive: true, connectedWallet: 'GAsWallet123', walletOnReceipt: 'GAsWallet123',
    receiptHasGascoin: true, gascoinUsdValue: 2, aiScore: 0.1, tamperScore: 0.1,
    duplicateHash: false, duplicatePhash: false, cooldownOk: true, amountUsd: 50,
    followerCount: 200, ...overrides,
  };
}

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

  // Gate 6: gascoin_min_hold
  it('fails gate gascoin_min_hold when below $1', () => {
    const r = evaluateClaim(validInput({ gascoinUsdValue: 0.5 }));
    expect(r.failed.some((g) => g.gate === 'gascoin_min_hold')).toBe(true);
  });

  it('passes gate gascoin_min_hold at exactly $1', () => {
    const r = evaluateClaim(validInput({ gascoinUsdValue: 1 }));
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

  it('returns exactly 11 gates', () => {
    const r = evaluateClaim(validInput());
    expect(r.gates).toHaveLength(11);
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
});
