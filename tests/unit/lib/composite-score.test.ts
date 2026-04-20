import { describe, it, expect } from 'vitest';
import {
  computeComposite,
  payoutAxis,
  engagementAxis,
  consistencyAxis,
  referralAxis,
  trustDampener,
  recencyMultiplier,
  type CompositeInput,
} from '../../../lib/composite-score';

const base: CompositeInput = {
  engagementPoints: 0,
  crossClusterPayoutEth: 0,
  selfClusterPayoutEth: 0,
  referralCount: 0,
  ringDensity: 0,
  dailyEngagementStdDev: 0,
  dailyEngagementMean: 0,
  walletTrust: 50,
  daysSinceLastActivity: 0,
};

describe('composite-score axes', () => {
  it('payoutAxis: cross-cluster 0.4 ETH → 100', () => {
    expect(payoutAxis({ ...base, crossClusterPayoutEth: 0.4 })).toBe(100);
  });

  it('payoutAxis: self-cluster at full ring density contributes 0', () => {
    const v = payoutAxis({ ...base, selfClusterPayoutEth: 1, ringDensity: 1 });
    expect(v).toBe(0);
  });

  it('payoutAxis: self-cluster at ringDensity=0 counts at 0.3×', () => {
    const v = payoutAxis({ ...base, selfClusterPayoutEth: 0.4, ringDensity: 0 });
    expect(v).toBeCloseTo(30, 0);
  });

  it('engagementAxis: 0 pts → 0; big pts saturates', () => {
    expect(engagementAxis({ ...base, engagementPoints: 0 })).toBe(0);
    expect(engagementAxis({ ...base, engagementPoints: 1_000_000 })).toBe(100);
  });

  it('consistencyAxis: σ=0 with mean>0 → 100; σ≥mean → 0', () => {
    expect(consistencyAxis({ ...base, dailyEngagementMean: 10, dailyEngagementStdDev: 0 })).toBe(100);
    expect(consistencyAxis({ ...base, dailyEngagementMean: 10, dailyEngagementStdDev: 10 })).toBe(0);
    expect(consistencyAxis({ ...base, dailyEngagementMean: 0, dailyEngagementStdDev: 5 })).toBe(0);
  });

  it('referralAxis: ringDensity discounts credit', () => {
    expect(referralAxis({ ...base, referralCount: 20, ringDensity: 0 })).toBe(100);
    expect(referralAxis({ ...base, referralCount: 20, ringDensity: 1 })).toBe(0);
    expect(referralAxis({ ...base, referralCount: 20, ringDensity: 0.5 })).toBe(50);
  });
});

describe('composite-score dampeners', () => {
  it('trustDampener: 0 → 0.4, 100 → 1.0, 50 → 0.7', () => {
    expect(trustDampener(0)).toBe(0.4);
    expect(trustDampener(100)).toBe(1.0);
    expect(trustDampener(50)).toBeCloseTo(0.7, 5);
  });

  it('trustDampener: clamps out-of-range input', () => {
    expect(trustDampener(-50)).toBe(0.4);
    expect(trustDampener(500)).toBe(1.0);
  });

  it('recencyMultiplier: day 0 → 1.5, day 60 → 1.0, day 180 → ~0.625', () => {
    expect(recencyMultiplier(0)).toBe(1.5);
    expect(recencyMultiplier(60)).toBeCloseTo(1.0, 5);
    expect(recencyMultiplier(180)).toBeCloseTo(0.625, 2);
  });
});

describe('computeComposite', () => {
  it('zeroes out when no activity', () => {
    const r = computeComposite(base);
    expect(r.composite).toBe(0);
  });

  it('rewards strong cross-cluster payout + engagement + consistency', () => {
    const r = computeComposite({
      ...base,
      engagementPoints: 100_000,
      crossClusterPayoutEth: 0.4,
      referralCount: 20,
      dailyEngagementMean: 10,
      dailyEngagementStdDev: 1,
      walletTrust: 100,
      daysSinceLastActivity: 0,
    });
    expect(r.composite).toBeGreaterThan(90);
  });

  it('heavy self-payout farm with low trust → near-zero composite', () => {
    const r = computeComposite({
      ...base,
      engagementPoints: 500,
      selfClusterPayoutEth: 5,
      referralCount: 50,
      ringDensity: 1,
      walletTrust: 10,
      daysSinceLastActivity: 0,
    });
    expect(r.composite).toBeLessThan(20);
  });

  it('recency decay halves old accounts', () => {
    const fresh = computeComposite({
      ...base,
      engagementPoints: 10_000,
      walletTrust: 100,
      daysSinceLastActivity: 0,
    });
    const old = computeComposite({
      ...base,
      engagementPoints: 10_000,
      walletTrust: 100,
      daysSinceLastActivity: 365,
    });
    expect(old.composite).toBeLessThan(fresh.composite * 0.5);
  });

  it('trust dampener floor keeps legit newcomers visible', () => {
    const r = computeComposite({
      ...base,
      engagementPoints: 100_000,
      crossClusterPayoutEth: 0.4,
      walletTrust: 0,
      daysSinceLastActivity: 0,
    });
    expect(r.composite).toBeGreaterThan(20);
    expect(r.trustDampener).toBe(0.4);
  });

  it('composite is capped at 100', () => {
    const r = computeComposite({
      ...base,
      engagementPoints: 10_000_000,
      crossClusterPayoutEth: 100,
      referralCount: 10000,
      dailyEngagementMean: 100,
      dailyEngagementStdDev: 0,
      walletTrust: 100,
      daysSinceLastActivity: 0,
    });
    expect(r.composite).toBe(100);
  });

  it('returns the axis breakdown for observability', () => {
    const r = computeComposite({
      ...base,
      engagementPoints: 10_000,
      crossClusterPayoutEth: 0.2,
      referralCount: 10,
      walletTrust: 70,
    });
    expect(r.payoutPct).toBeGreaterThan(0);
    expect(r.engagementPct).toBeGreaterThan(0);
    expect(r.referralPct).toBeGreaterThan(0);
    expect(r.trustDampener).toBeCloseTo(0.82, 2);
  });
});
