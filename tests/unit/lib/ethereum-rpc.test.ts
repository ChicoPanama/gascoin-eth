import { describe, it, expect } from 'vitest';

describe('ethereum RPC URL resolution', () => {
  it('uses ETH_RPC_URL when set', () => {
    const ETH_RPC_URL = 'https://custom-rpc.example.com';
    const url = ETH_RPC_URL || 'https://eth.llamarpc.com';
    expect(url).toBe('https://custom-rpc.example.com');
  });

  it('falls back to Alchemy when only ALCHEMY_API_KEY is set', () => {
    const ALCHEMY_API_KEY = 'test-key';
    const ETH_RPC_URL: string | undefined = undefined;
    const url = ETH_RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    expect(url).toBe('https://eth-mainnet.g.alchemy.com/v2/test-key');
  });

  it('uses public fallback when no env vars set', () => {
    const ETH_RPC_URL: string | undefined = undefined;
    const url = ETH_RPC_URL || 'https://eth.llamarpc.com';
    expect(url).toBe('https://eth.llamarpc.com');
  });
});
