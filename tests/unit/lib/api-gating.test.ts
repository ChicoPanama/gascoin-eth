import { describe, it, expect } from 'vitest';
import {
  tierForBalance,
  hasTierAccess,
  filterForTier,
  API_TIERS,
  type ApiTier,
} from '@/lib/api-gating';

describe('tierForBalance', () => {
  it('0 GASCOIN → free', () => {
    expect(tierForBalance(0)).toBe('free');
  });
  it('999 GASCOIN → free', () => {
    expect(tierForBalance(999)).toBe('free');
  });
  it('1000 GASCOIN → builder', () => {
    expect(tierForBalance(1_000)).toBe('builder');
  });
  it('99999 GASCOIN → builder', () => {
    expect(tierForBalance(99_999)).toBe('builder');
  });
  it('100000 GASCOIN → agency', () => {
    expect(tierForBalance(100_000)).toBe('agency');
  });
  it('999999 GASCOIN → agency', () => {
    expect(tierForBalance(999_999)).toBe('agency');
  });
  it('1000000 GASCOIN → enterprise', () => {
    expect(tierForBalance(1_000_000)).toBe('enterprise');
  });
  it('50M GASCOIN → enterprise', () => {
    expect(tierForBalance(50_000_000)).toBe('enterprise');
  });
});

describe('hasTierAccess', () => {
  it('enterprise user passes agency requirement', () => {
    expect(hasTierAccess('enterprise', 'agency')).toBe(true);
  });
  it('free user fails builder requirement', () => {
    expect(hasTierAccess('free', 'builder')).toBe(false);
  });
  it('builder passes builder', () => {
    expect(hasTierAccess('builder', 'builder')).toBe(true);
  });
  it('free passes free', () => {
    expect(hasTierAccess('free', 'free')).toBe(true);
  });
});

describe('filterForTier', () => {
  const fullRecord = {
    handle: 'alice',
    wallet: '0xABC',
    total_impressions: 50_000,
    total_eth_earned: 0.12,
    impact_score: 78,
    audience_signals: { country_breakdown: { US: 60, UK: 20 } },
    history: { week_1: 100 },
    sensitive_internal: 'never-exposed',
  };

  it('free tier drops all but handle + basic counts', () => {
    const r = filterForTier(fullRecord, 'free');
    expect(r).toHaveProperty('handle');
    expect(r).not.toHaveProperty('audience_signals');
    expect(r).not.toHaveProperty('history');
    expect(r).not.toHaveProperty('impact_score');
    expect(r).not.toHaveProperty('sensitive_internal');
  });

  it('builder tier adds impact + eth metrics', () => {
    const r = filterForTier(fullRecord, 'builder');
    expect(r.handle).toBe('alice');
    expect(r).toHaveProperty('impact_score');
    expect(r).toHaveProperty('total_eth_earned');
    expect(r).not.toHaveProperty('audience_signals');
    expect(r).not.toHaveProperty('sensitive_internal');
  });

  it('agency tier adds audience + history', () => {
    const r = filterForTier(fullRecord, 'agency');
    expect(r).toHaveProperty('audience_signals');
    expect(r).toHaveProperty('history');
    expect(r).not.toHaveProperty('sensitive_internal');
  });

  it('enterprise tier passes everything except sensitive_internal', () => {
    const r = filterForTier(fullRecord, 'enterprise');
    expect(r).toHaveProperty('audience_signals');
    expect(r).toHaveProperty('history');
    expect(r).not.toHaveProperty('sensitive_internal');
  });
});

describe('API_TIERS', () => {
  it('defines all four tiers with required shape', () => {
    const keys: ApiTier[] = ['free', 'builder', 'agency', 'enterprise'];
    for (const k of keys) {
      const cfg = API_TIERS[k];
      expect(cfg.minGascoin).toBeGreaterThanOrEqual(0);
      expect(cfg.dailyRequests).toBeGreaterThan(0);
      expect(cfg.rank).toBeGreaterThanOrEqual(0);
    }
  });

  it('rank is strictly increasing', () => {
    expect(API_TIERS.free.rank).toBeLessThan(API_TIERS.builder.rank);
    expect(API_TIERS.builder.rank).toBeLessThan(API_TIERS.agency.rank);
    expect(API_TIERS.agency.rank).toBeLessThan(API_TIERS.enterprise.rank);
  });

  it('daily request limits are strictly increasing', () => {
    expect(API_TIERS.free.dailyRequests).toBeLessThan(API_TIERS.builder.dailyRequests);
    expect(API_TIERS.builder.dailyRequests).toBeLessThan(API_TIERS.agency.dailyRequests);
    expect(API_TIERS.agency.dailyRequests).toBeLessThan(API_TIERS.enterprise.dailyRequests);
  });
});
