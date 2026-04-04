import { validateReferralCode } from './referral-code';

const STORAGE_KEY = 'gascoin_referral_code';
const STORAGE_EXPIRY_KEY = 'gascoin_referral_expiry';
const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function captureReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref');
  if (!code || !validateReferralCode(code)) return null;
  const expiry = Date.now() + ATTRIBUTION_WINDOW_MS;
  localStorage.setItem(STORAGE_KEY, code);
  localStorage.setItem(STORAGE_EXPIRY_KEY, expiry.toString());
  return code;
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  const code = localStorage.getItem(STORAGE_KEY);
  const expiry = localStorage.getItem(STORAGE_EXPIRY_KEY);
  if (!code || !expiry) return null;
  if (Date.now() > parseInt(expiry)) {
    clearReferralCode();
    return null;
  }
  return code;
}

export function clearReferralCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_EXPIRY_KEY);
}
