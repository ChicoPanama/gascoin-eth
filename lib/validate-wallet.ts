import bs58 from 'bs58';

/**
 * SECURITY: Validates that a string is a valid Solana wallet address (base58, 32-44 chars).
 * Use on all endpoints that accept wallet addresses to prevent injection.
 */
export function isValidSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== 'string') return false;
  if (addr.length < 32 || addr.length > 44) return false;
  try {
    const decoded = bs58.decode(addr);
    return decoded.length === 32;
  } catch {
    return false;
  }
}
