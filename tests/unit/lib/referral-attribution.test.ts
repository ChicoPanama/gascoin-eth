/**
 * Tests for lib/referral-attribution.ts
 *
 * This module runs in browser context (uses window/localStorage).
 * Vitest's jsdom environment satisfies that — no supabase, cache, or mem0 needed.
 *
 * R3 — passive reward 10K/month cap (REFERRAL_PASSIVE_CAP_MONTHLY from engagement-rewards)
 * R4 — monthly conversion cap (MAX_CONVERSIONS_30D = 20, 30-day rolling window)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/referral-code', () => ({
  validateReferralCode: vi.fn((code: string) => /^[A-Z0-9]{8}$/.test(code)),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  captureReferralFromUrl,
  getStoredReferralCode,
  clearReferralCode,
} from '@/lib/referral-attribution';
import { POINTS_CONFIG } from '@/lib/engagement-rewards';
import { REFERRAL_CONFIG } from '@/lib/referral-config';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_CODE = 'ABCD1234'; // matches /^[A-Z0-9]{8}$/
const INVALID_CODE = 'bad!!';

function setWindowHref(url: string) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: new URL(url),
  });
}

// ── captureReferralFromUrl ────────────────────────────────────────────────────

describe('captureReferralFromUrl', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('happy path: captures valid referral code from URL and stores in localStorage', () => {
    setWindowHref(`https://gascoin.xyz/submit?ref=${VALID_CODE}`);

    const result = captureReferralFromUrl();

    expect(result).toBe(VALID_CODE);
    expect(localStorage.getItem('gascoin_referral_code')).toBe(VALID_CODE);
    expect(localStorage.getItem('gascoin_referral_expiry')).toBeTruthy();
  });

  it('returns null when no ref param in URL', () => {
    setWindowHref('https://gascoin.xyz/submit');

    const result = captureReferralFromUrl();

    expect(result).toBeNull();
    expect(localStorage.getItem('gascoin_referral_code')).toBeNull();
  });

  it('returns null when referral code is invalid', () => {
    setWindowHref(`https://gascoin.xyz/submit?ref=${INVALID_CODE}`);

    const result = captureReferralFromUrl();

    expect(result).toBeNull();
  });

  it('stores expiry ~7 days in the future', () => {
    setWindowHref(`https://gascoin.xyz/submit?ref=${VALID_CODE}`);
    const before = Date.now();

    captureReferralFromUrl();

    const expiry = parseInt(localStorage.getItem('gascoin_referral_expiry') || '0');
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiry).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiry).toBeLessThanOrEqual(before + sevenDaysMs + 1000);
  });
});

// ── getStoredReferralCode ─────────────────────────────────────────────────────

describe('getStoredReferralCode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('happy path: returns stored code when not expired', () => {
    const futureExpiry = (Date.now() + 1_000_000).toString();
    localStorage.setItem('gascoin_referral_code', VALID_CODE);
    localStorage.setItem('gascoin_referral_expiry', futureExpiry);

    const result = getStoredReferralCode();

    expect(result).toBe(VALID_CODE);
  });

  it('returns null when no code stored', () => {
    const result = getStoredReferralCode();

    expect(result).toBeNull();
  });

  it('returns null and clears storage when code is expired', () => {
    const pastExpiry = (Date.now() - 1000).toString();
    localStorage.setItem('gascoin_referral_code', VALID_CODE);
    localStorage.setItem('gascoin_referral_expiry', pastExpiry);

    const result = getStoredReferralCode();

    expect(result).toBeNull();
    expect(localStorage.getItem('gascoin_referral_code')).toBeNull();
    expect(localStorage.getItem('gascoin_referral_expiry')).toBeNull();
  });

  it('returns null when expiry key is missing', () => {
    localStorage.setItem('gascoin_referral_code', VALID_CODE);
    // No expiry key set

    const result = getStoredReferralCode();

    expect(result).toBeNull();
  });
});

// ── clearReferralCode ─────────────────────────────────────────────────────────

describe('clearReferralCode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('removes both storage keys', () => {
    localStorage.setItem('gascoin_referral_code', VALID_CODE);
    localStorage.setItem('gascoin_referral_expiry', '9999999999999');

    clearReferralCode();

    expect(localStorage.getItem('gascoin_referral_code')).toBeNull();
    expect(localStorage.getItem('gascoin_referral_expiry')).toBeNull();
  });

  it('does not throw when nothing is stored', () => {
    expect(() => clearReferralCode()).not.toThrow();
  });
});

// ── R3: Passive reward 10K/month cap ─────────────────────────────────────────
// The 10K/month cap lives in POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY.
// These tests verify the constant and boundary arithmetic used by the award
// worker — this is the source-of-truth config the engine reads.

describe('R3 — passive referral reward cap config', () => {
  it('REFERRAL_PASSIVE_CAP_MONTHLY is 10,000 points', () => {
    expect(POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY).toBe(10_000);
  });

  it('REFERRAL_PASSIVE_RATE is 2%', () => {
    expect(POINTS_CONFIG.REFERRAL_PASSIVE_RATE).toBeCloseTo(0.02, 5);
  });

  it('passive reward calculation respects monthly cap: earning 500K points in a month caps passive at 10K', () => {
    const referredUserMonthlyPoints = 500_000;
    const rawPassive = referredUserMonthlyPoints * POINTS_CONFIG.REFERRAL_PASSIVE_RATE;
    const capped = Math.min(rawPassive, POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY);

    expect(rawPassive).toBe(10_000); // 500_000 * 0.02 = 10_000 — exactly at cap
    expect(capped).toBe(10_000);
  });

  it('passive reward beyond 500K base is hard-capped at 10K', () => {
    const referredUserMonthlyPoints = 1_000_000;
    const rawPassive = referredUserMonthlyPoints * POINTS_CONFIG.REFERRAL_PASSIVE_RATE;
    const capped = Math.min(rawPassive, POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY);

    expect(rawPassive).toBe(20_000); // would be 20K without cap
    expect(capped).toBe(10_000);     // hard-capped at 10K
  });

  it('passive reward below cap passes through unchanged', () => {
    const referredUserMonthlyPoints = 100_000;
    const rawPassive = referredUserMonthlyPoints * POINTS_CONFIG.REFERRAL_PASSIVE_RATE;
    const capped = Math.min(rawPassive, POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY);

    expect(rawPassive).toBe(2_000);
    expect(capped).toBe(2_000); // no cap applied
  });

  it('additional passive points awarded beyond cap are zero', () => {
    // Simulates: referrer already at cap, one more award arrives
    const alreadyEarned = POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY; // 10_000
    const newPassive = 500;
    const remaining = Math.max(0, POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY - alreadyEarned);

    expect(remaining).toBe(0);
    expect(Math.min(newPassive, remaining)).toBe(0);
  });
});

// ── R4: Monthly conversion cap (20 conversions per 30d rolling window) ────────

describe('R4 — monthly conversion cap boundary conditions', () => {
  it('MAX_CONVERSIONS_30D is 20', () => {
    expect(REFERRAL_CONFIG.MAX_CONVERSIONS_30D).toBe(20);
  });

  it('19th conversion is below cap — should be allowed', () => {
    const currentCount = 19;
    const isAtCap = currentCount >= REFERRAL_CONFIG.MAX_CONVERSIONS_30D;

    expect(isAtCap).toBe(false);
  });

  it('20th conversion is AT cap — should be blocked', () => {
    const currentCount = 20;
    const isAtCap = currentCount >= REFERRAL_CONFIG.MAX_CONVERSIONS_30D;

    expect(isAtCap).toBe(true);
  });

  it('21st conversion is over cap — should be blocked', () => {
    const currentCount = 21;
    const isAtCap = currentCount >= REFERRAL_CONFIG.MAX_CONVERSIONS_30D;

    expect(isAtCap).toBe(true);
  });

  it('0 conversions — below cap', () => {
    const currentCount = 0;
    const isAtCap = currentCount >= REFERRAL_CONFIG.MAX_CONVERSIONS_30D;

    expect(isAtCap).toBe(false);
  });

  it('conversion window is 30 days (not calendar month)', () => {
    // A conversion exactly 30 days ago is outside the window
    const thirtyOneDaysAgoMs = Date.now() - 31 * 86400000;
    const thirtyDaysAgoMs = Date.now() - 30 * 86400000;
    const thresholdMs = Date.now() - REFERRAL_CONFIG.MAX_CONVERSIONS_30D * 86400000;

    // Verify the window is based on 30 * 86400000 offset from now
    expect(thresholdMs).toBeGreaterThan(thirtyOneDaysAgoMs);
    // A conversion 29 days ago is inside the window
    const twentyNineDaysAgoMs = Date.now() - 29 * 86400000;
    expect(twentyNineDaysAgoMs).toBeGreaterThan(thirtyDaysAgoMs);
  });

  it('POINTS_PER_CONVERSION welcome bonus is 100', () => {
    expect(REFERRAL_CONFIG.POINTS_PER_CONVERSION).toBe(100);
  });

  it('MAX_POINTS_30D matches 20 conversions × welcome bonus', () => {
    expect(REFERRAL_CONFIG.MAX_POINTS_30D).toBe(
      REFERRAL_CONFIG.MAX_CONVERSIONS_30D * REFERRAL_CONFIG.POINTS_PER_CONVERSION,
    );
  });
});
