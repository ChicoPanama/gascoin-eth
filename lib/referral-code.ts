import { createHash } from 'crypto';

export function generateReferralCode(walletAddress: string): string {
  return createHash('sha256')
    .update(walletAddress.toLowerCase())
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

export function buildReferralUrl(walletAddress: string, baseUrl: string): string {
  const code = generateReferralCode(walletAddress);
  return `${baseUrl}/submit?ref=${code}`;
}

export function validateReferralCode(code: string): boolean {
  return /^[A-F0-9]{8}$/.test(code);
}
