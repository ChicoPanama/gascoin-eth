import { describe, it, expect, beforeAll } from 'vitest';
import { feeMath, isMarketplaceLive, getVerifierAddress } from '@/lib/marketplace';

describe('feeMath', () => {
  it('matches the locked-in 3%+3% split at 500 USDC', () => {
    const m = feeMath(500);
    expect(m.brandTotal).toBeCloseTo(515, 5);
    expect(m.brandFee).toBeCloseTo(15, 5);
    expect(m.creatorPayout).toBeCloseTo(485, 5);
    expect(m.creatorFee).toBeCloseTo(15, 5);
    expect(m.treasuryTotal).toBeCloseTo(15, 5);
    expect(m.opsTotal).toBeCloseTo(15, 5);
  });

  it('treasury + ops = brand fee + creator fee', () => {
    const m = feeMath(1234);
    expect(m.treasuryTotal + m.opsTotal).toBeCloseTo(m.brandFee + m.creatorFee, 5);
  });

  it('scales linearly', () => {
    const a = feeMath(1000);
    const b = feeMath(2000);
    expect(b.brandFee).toBeCloseTo(a.brandFee * 2, 5);
    expect(b.creatorPayout).toBeCloseTo(a.creatorPayout * 2, 5);
  });

  it('zero amount → zero everywhere', () => {
    const m = feeMath(0);
    expect(m.brandFee).toBe(0);
    expect(m.creatorFee).toBe(0);
    expect(m.brandTotal).toBe(0);
    expect(m.creatorPayout).toBe(0);
  });
});

describe('isMarketplaceLive', () => {
  it('returns false when env var unset', () => {
    delete process.env.GAS_NETWORK_MARKETPLACE_LIVE;
    expect(isMarketplaceLive()).toBe(false);
  });
  it('returns false when env var is something other than "true"', () => {
    process.env.GAS_NETWORK_MARKETPLACE_LIVE = 'yes';
    expect(isMarketplaceLive()).toBe(false);
  });
  it('returns true only for literal "true"', () => {
    process.env.GAS_NETWORK_MARKETPLACE_LIVE = 'true';
    expect(isMarketplaceLive()).toBe(true);
  });
  it('case-insensitive', () => {
    process.env.GAS_NETWORK_MARKETPLACE_LIVE = 'TRUE';
    expect(isMarketplaceLive()).toBe(true);
  });
});

describe('getVerifierAddress', () => {
  it('returns null without key', () => {
    delete process.env.GASCOIN_MARKETPLACE_VERIFIER_KEY;
    expect(getVerifierAddress()).toBeNull();
  });

  it('derives address from a valid hex key', () => {
    process.env.GASCOIN_MARKETPLACE_VERIFIER_KEY =
      '0x0000000000000000000000000000000000000000000000000000000000000001';
    const addr = getVerifierAddress();
    expect(addr).toBeTruthy();
    expect(addr?.startsWith('0x')).toBe(true);
    expect(addr?.length).toBe(42);
  });

  it('returns null for malformed key', () => {
    process.env.GASCOIN_MARKETPLACE_VERIFIER_KEY = '0xdeadbeef';
    expect(getVerifierAddress()).toBeNull();
  });
});
