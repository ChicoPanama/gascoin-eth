import { describe, it, expect } from 'vitest';
import { getTierForBalance, getNextTier, tokensNeededForNextTier, getCooldownForTier, TOKEN_TIERS } from '@/lib/token-tiers';

describe('getTierForBalance', () => {
  it('returns Standard for 0', () => { expect(getTierForBalance(0).id).toBe(0); });
  it('returns Standard for 1', () => { expect(getTierForBalance(1).id).toBe(0); });
  it('returns Standard for 99999', () => { expect(getTierForBalance(99_999).id).toBe(0); });
  it('returns Commuter at 100000', () => { expect(getTierForBalance(100_000).id).toBe(1); });
  it('returns Commuter at 4999999', () => { expect(getTierForBalance(4_999_999).id).toBe(1); });
  it('returns Road Warrior at 5000000', () => { expect(getTierForBalance(5_000_000).id).toBe(2); });
  it('returns Fleet at 10000000', () => { expect(getTierForBalance(10_000_000).id).toBe(3); });
  it('returns Fleet for large balance', () => { expect(getTierForBalance(999_999_999).id).toBe(3); });
});

describe('getNextTier', () => {
  it('returns Commuter after Standard', () => { expect(getNextTier(0)?.id).toBe(1); });
  it('returns null after Fleet', () => { expect(getNextTier(3)).toBeNull(); });
});

describe('tokensNeededForNextTier', () => {
  it('100000 from 0 balance at Standard', () => { expect(tokensNeededForNextTier(0, 0)).toBe(100_000); });
  it('50000 from 50000 balance at Standard', () => { expect(tokensNeededForNextTier(50_000, 0)).toBe(50_000); });
  it('0 at max tier', () => { expect(tokensNeededForNextTier(10_000_000, 3)).toBe(0); });
});

describe('getCooldownForTier', () => {
  it('Standard = 7 days', () => { expect(getCooldownForTier(0)).toBe(7); });
  it('Commuter = 7 days', () => { expect(getCooldownForTier(1)).toBe(7); });
  it('Road Warrior = 3.5 days', () => { expect(getCooldownForTier(2)).toBe(3.5); });
  it('Fleet = 1.75 days', () => { expect(getCooldownForTier(3)).toBe(1.75); });
  it('unknown tier falls back to 7', () => { expect(getCooldownForTier(99)).toBe(7); });
});

describe('TOKEN_TIERS', () => {
  it('has 4 tiers', () => { expect(TOKEN_TIERS).toHaveLength(4); });
  it('ordered by min_tokens', () => {
    for (let i = 1; i < TOKEN_TIERS.length; i++) expect(TOKEN_TIERS[i].min_tokens).toBeGreaterThan(TOKEN_TIERS[i - 1].min_tokens);
  });
  it('max_eth_refund increases', () => {
    for (let i = 1; i < TOKEN_TIERS.length; i++) expect(TOKEN_TIERS[i].max_eth_refund).toBeGreaterThan(TOKEN_TIERS[i - 1].max_eth_refund);
  });
  it('queue_priority decreases', () => {
    for (let i = 1; i < TOKEN_TIERS.length; i++) expect(TOKEN_TIERS[i].queue_priority).toBeLessThan(TOKEN_TIERS[i - 1].queue_priority);
  });
  it('cooldown_days decreases or stays same', () => {
    for (let i = 1; i < TOKEN_TIERS.length; i++) expect(TOKEN_TIERS[i].cooldown_days).toBeLessThanOrEqual(TOKEN_TIERS[i - 1].cooldown_days);
  });
});
