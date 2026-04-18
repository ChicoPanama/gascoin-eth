// lib/validate-wallet.ts
import { isAddress, getAddress } from 'viem';

export function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;
  return isAddress(address);
}

// Alias so existing imports of isValidSolanaAddress still compile during transition
export { isValidEthereumAddress as isValidSolanaAddress };

export function checksumAddress(address: string): string {
  if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);
  return getAddress(address);
}

export function truncateEthAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
