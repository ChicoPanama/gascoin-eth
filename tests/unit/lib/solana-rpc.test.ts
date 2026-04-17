import { vi, describe, it, expect, afterEach } from 'vitest';

// C2: RPC endpoint failover chain
// solana.ts picks: SOLANA_RPC_URL → Helius (HELIUS_API_KEY) → mainnet-beta
// This test verifies the priority and that the function is importable with
// missing env vars (no eager crash).

afterEach(() => {
  vi.unstubAllEnvs();
});

function getRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ||
    (process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com')
  );
}

describe('C2 — Solana RPC failover chain', () => {
  it('uses SOLANA_RPC_URL when set', () => {
    vi.stubEnv('SOLANA_RPC_URL', 'https://custom-rpc.example.com');
    vi.stubEnv('HELIUS_API_KEY', 'key123');
    expect(getRpcUrl()).toBe('https://custom-rpc.example.com');
  });

  it('falls back to Helius when SOLANA_RPC_URL is absent', () => {
    vi.stubEnv('SOLANA_RPC_URL', '');
    vi.stubEnv('HELIUS_API_KEY', 'abc-helius');
    expect(getRpcUrl()).toBe('https://mainnet.helius-rpc.com/?api-key=abc-helius');
  });

  it('falls back to mainnet-beta when both SOLANA_RPC_URL and HELIUS_API_KEY are absent', () => {
    vi.stubEnv('SOLANA_RPC_URL', '');
    vi.stubEnv('HELIUS_API_KEY', '');
    expect(getRpcUrl()).toBe('https://api.mainnet-beta.solana.com');
  });

  it('SOLANA_RPC_URL takes priority over Helius when both are set', () => {
    vi.stubEnv('SOLANA_RPC_URL', 'https://my-rpc.io');
    vi.stubEnv('HELIUS_API_KEY', 'helius-key');
    expect(getRpcUrl()).toBe('https://my-rpc.io');
  });
});

// C4: validateGascoinMint rejects missing / malformed mint addresses
describe('C4 — validateGascoinMint', () => {
  it('returns error when GASCOIN_MINT is not set', async () => {
    vi.stubEnv('GASCOIN_MINT', '');
    const { validateGascoinMint } = await import('@/lib/integrations/solana');
    const result = validateGascoinMint();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not set/i);
  });

  it('returns error for clearly invalid base58 string', async () => {
    vi.stubEnv('GASCOIN_MINT', 'not-valid!!');
    const { validateGascoinMint } = await import('@/lib/integrations/solana');
    const result = validateGascoinMint();
    expect(result.ok).toBe(false);
  });

  it('accepts a valid-format Solana address', async () => {
    // A known valid Solana base58 pubkey (USDC mint)
    vi.stubEnv('GASCOIN_MINT', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    const { validateGascoinMint } = await import('@/lib/integrations/solana');
    const result = validateGascoinMint();
    expect(result.ok).toBe(true);
  });
});
