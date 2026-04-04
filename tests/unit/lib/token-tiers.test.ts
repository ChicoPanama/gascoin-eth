import { describe, it, expect } from 'vitest';
import { getTierForBalance, getNextTier, tokensNeededForNextTier, TOKEN_TIERS } from '@/lib/token-tiers';

describe('getTierForBalance', () => {
  it('returns Standard for 0', () => { expect(getTierForBalance(0).id).toBe(0); });
  it('returns Standard for 99999', () => { expect(getTierForBalance(99_999).id).toBe(0); });
  it('returns Commuter at 100000', () => { expect(getTierForBalance(100_000).id).toBe(1); });
  it('returns Road Warrior at 500000', () => { expect(getTierForBalance(500_000).id).toBe(2); });
  it('returns Fleet at 2000000', () => { expect(getTierForBalance(2_000_000).id).toBe(3); });
  it('returns Fleet for large balance', () => { expect(getTierForBalance(999_999_999).id).toBe(3); });
});

describe('getNextTier', () => {
  it('returns Commuter after Standard', () => { expect(getNextTier(0)?.id).toBe(1); });
  it('returns null after Fleet', () => { expect(getNextTier(3)).toBeNull(); });
});

describe('tokensNeededForNextTier', () => {
  it('100000 from 0 balance', () => { expect(tokensNeededForNextTier(0, 0)).toBe(100_000); });
  it('50000 from 50000 balance', () => { expect(tokensNeededForNextTier(50_000, 0)).toBe(50_000); });
  it('0 at max tier', () => { expect(tokensNeededForNextTier(2_000_000, 3)).toBe(0); });
});

describe('TOKEN_TIERS', () => {
  it('has 4 tiers', () => { expect(TOKEN_TIERS).toHaveLength(4); });
  it('ordered by min_tokens', () => {
    for (let i = 1; i < TOKEN_TIERS.length; i++) expect(TOKEN_TIERS[i].min_tokens).toBeGreaterThan(TOKEN_TIERS[i - 1].min_tokens);
  });
  it('max_sol_refund increases', () => {
    for (let i = 1; i < TOKEN_TIERS.length; i++) expect(TOKEN_TIERS[i].max_sol_refund).toBeGreaterThan(TOKEN_TIERS[i - 1].max_sol_refund);
  });
  it('queue_priority decreases', () => {
    for (let i = 1; i < TOKEN_TIERS.length; i++) expect(TOKEN_TIERS[i].queue_priority).toBeLessThan(TOKEN_TIERS[i - 1].queue_priority);
  });
});
