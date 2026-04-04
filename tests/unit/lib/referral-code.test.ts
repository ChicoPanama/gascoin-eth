import { describe, it, expect } from 'vitest';
import { generateReferralCode, validateReferralCode, buildReferralUrl } from '@/lib/referral-code';

describe('generateReferralCode', () => {
  it('returns 8 uppercase hex characters', () => {
    expect(generateReferralCode('TestWallet123')).toMatch(/^[A-F0-9]{8}$/);
  });

  it('is deterministic', () => {
    const w = 'GAsxK92TestWalletAddress12345678901234567890';
    expect(generateReferralCode(w)).toBe(generateReferralCode(w));
  });

  it('produces different codes for different wallets', () => {
    expect(generateReferralCode('wallet1111')).not.toBe(generateReferralCode('wallet2222'));
  });

  it('is case-insensitive', () => {
    expect(generateReferralCode('test')).toBe(generateReferralCode('TEST'));
  });
});

describe('validateReferralCode', () => {
  it('accepts valid 8-char uppercase hex', () => {
    expect(validateReferralCode('A1B2C3D4')).toBe(true);
  });

  it('rejects lowercase', () => {
    expect(validateReferralCode('a1b2c3d4')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(validateReferralCode('A1B2C3D')).toBe(false);
    expect(validateReferralCode('A1B2C3D45')).toBe(false);
  });

  it('rejects non-hex', () => {
    expect(validateReferralCode('A1B2C3GH')).toBe(false);
  });
});

describe('buildReferralUrl', () => {
  it('builds valid URL with ref param', () => {
    const url = buildReferralUrl('wallet123', 'https://gascoin.xyz');
    expect(url).toContain('/submit?ref=');
    expect(validateReferralCode(new URL(url).searchParams.get('ref')!)).toBe(true);
  });
});
