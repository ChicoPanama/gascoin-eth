import { describe, expect, it } from 'vitest';
import { getAddress } from 'viem';
import {
  buildProjectGasAssetBalance,
  formatProjectGasBalanceForDisplay,
  hasAuthoritativeSpendableBalance,
} from '../../../lib/project-gas/account-state';
import {
  PROJECT_GAS_DEFAULT_CHAIN_ID,
  PROJECT_GAS_CANONICAL_USDC_ADDRESSES,
  PROJECT_GAS_TESTNET_CHAIN_ID,
  parseProjectGasAssetConfig,
} from '../../../lib/project-gas/asset-config';

const GAS = '0x1111111111111111111111111111111111111111';
const USDC = PROJECT_GAS_CANONICAL_USDC_ADDRESSES[8453];
const WALLET = '0x3333333333333333333333333333333333333333';

describe('Project GAS asset configuration', () => {
  it('accepts only explicit Project GAS asset inputs', () => {
    const config = parseProjectGasAssetConfig({
      chainId: '8453',
      gasAddress: GAS,
      usdcAddress: USDC,
    });

    expect(config.chainId).toBe(8453);
    expect(config.gasAddress).toBe(getAddress(GAS));
    expect(config.usdcAddress).toBe(getAddress(USDC));
    expect(config.usdcConfigurationStatus).toBe('canonical');
  });

  it('keeps invalid or absent asset addresses unavailable', () => {
    const config = parseProjectGasAssetConfig({
      gasAddress: 'not-an-address',
      usdcAddress: '',
    });

    expect(config.chainId).toBe(PROJECT_GAS_DEFAULT_CHAIN_ID);
    expect(config.gasAddress).toBeUndefined();
    expect(config.usdcAddress).toBeUndefined();
    expect(config.usdcConfigurationStatus).toBe('missing');
  });

  it('rejects a valid address that is not canonical native USDC for the selected Base chain', () => {
    const config = parseProjectGasAssetConfig({
      chainId: '8453',
      usdcAddress: '0x2222222222222222222222222222222222222222',
    });

    expect(config.usdcAddress).toBeUndefined();
    expect(config.usdcConfigurationStatus).toBe('invalid');
  });

  it('accepts Circle native USDC on Base Sepolia only when that network is selected', () => {
    const sepoliaUsdc = PROJECT_GAS_CANONICAL_USDC_ADDRESSES[PROJECT_GAS_TESTNET_CHAIN_ID];
    const config = parseProjectGasAssetConfig({
      chainId: String(PROJECT_GAS_TESTNET_CHAIN_ID),
      usdcAddress: sepoliaUsdc,
    });

    expect(config.usdcAddress).toBe(sepoliaUsdc);
    expect(config.usdcConfigurationStatus).toBe('canonical');
  });

  it('supports only Base and Base Sepolia and falls back to Base mainnet', () => {
    expect(parseProjectGasAssetConfig({ chainId: '84532' }).chainId).toBe(PROJECT_GAS_TESTNET_CHAIN_ID);
    expect(parseProjectGasAssetConfig({ chainId: '1' }).chainId).toBe(PROJECT_GAS_DEFAULT_CHAIN_ID);
    expect(parseProjectGasAssetConfig({ chainId: '-1' }).chainId).toBe(PROJECT_GAS_DEFAULT_CHAIN_ID);
    expect(parseProjectGasAssetConfig({ chainId: 'nope' }).chainId).toBe(PROJECT_GAS_DEFAULT_CHAIN_ID);
  });
});

describe('Project GAS spendable balance authority', () => {
  it('never invents an amount when the contract is not configured', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'GAS',
      chainId: 1,
      walletAddress: getAddress(WALLET),
      walletChainId: 1,
      readStatus: 'success',
      rawAmount: 1_240n * 10n ** 18n,
      decimals: 18,
      chainEnabled: true,
    });

    expect(state.status).toBe('unavailable');
    expect(state.authority).toBe('unavailable');
    expect(state.amount).toBeUndefined();
    expect(formatProjectGasBalanceForDisplay(state)).toBe('— GAS');
    expect(hasAuthoritativeSpendableBalance(state)).toBe(false);
  });

  it('requires an active wallet before a configured asset can become authoritative', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'GAS',
      chainId: 1,
      contractAddress: getAddress(GAS),
      readStatus: 'idle',
      chainEnabled: true,
    });

    expect(state.status).toBe('unavailable');
    expect(state.message).toMatch(/activate a wallet/i);
  });

  it('marks a wallet-chain mismatch as degraded instead of showing a balance', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'USDC',
      chainId: 1,
      contractAddress: getAddress(USDC),
      walletAddress: getAddress(WALLET),
      walletChainId: 8453,
      readStatus: 'success',
      rawAmount: 1_234_567n,
      decimals: 6,
      chainEnabled: true,
    });

    expect(state.status).toBe('degraded');
    expect(state.amount).toBeUndefined();
  });

  it('exposes loading while an enabled authoritative read is pending', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'GAS',
      chainId: 1,
      contractAddress: getAddress(GAS),
      walletAddress: getAddress(WALLET),
      walletChainId: 1,
      readStatus: 'pending',
      chainEnabled: true,
    });

    expect(state.status).toBe('loading');
    expect(state.authority).toBe('wallet-chain');
    expect(state.amount).toBeUndefined();
  });

  it('formats authoritative GAS balance from atomic units', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'GAS',
      chainId: 1,
      contractAddress: getAddress(GAS),
      walletAddress: getAddress(WALLET),
      walletChainId: 1,
      readStatus: 'success',
      rawAmount: 1_240n * 10n ** 18n,
      decimals: 18,
      updatedAtMs: Date.UTC(2026, 7, 17, 12, 0, 0),
      chainEnabled: true,
    });

    expect(state.status).toBe('ready');
    expect(state.amount).toBe('1240');
    expect(state.rawAmount).toBe('1240000000000000000000');
    expect(state.decimals).toBe(18);
    expect(state.updatedAt).toBe('2026-08-17T12:00:00.000Z');
    expect(hasAuthoritativeSpendableBalance(state)).toBe(true);
    expect(formatProjectGasBalanceForDisplay(state)).toBe('1,240 GAS');
  });

  it('formats authoritative USDC balance without assuming 18 decimals', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'USDC',
      chainId: 1,
      contractAddress: getAddress(USDC),
      walletAddress: getAddress(WALLET),
      walletChainId: 1,
      readStatus: 'success',
      rawAmount: 1_234_567n,
      decimals: 6,
      chainEnabled: true,
    });

    expect(state.amount).toBe('1.234567');
    expect(formatProjectGasBalanceForDisplay(state, 6)).toBe('1.234567 USDC');
  });

  it('allows stale authoritative data while labeling it stale', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'GAS',
      chainId: 1,
      contractAddress: getAddress(GAS),
      walletAddress: getAddress(WALLET),
      walletChainId: 1,
      readStatus: 'success',
      rawAmount: 10n ** 18n,
      decimals: 18,
      stale: true,
      chainEnabled: true,
    });

    expect(state.status).toBe('stale');
    expect(hasAuthoritativeSpendableBalance(state)).toBe(true);
    expect(state.message).toMatch(/stale/i);
  });

  it('does not preserve an amount after an authoritative read error', () => {
    const state = buildProjectGasAssetBalance({
      asset: 'USDC',
      chainId: 1,
      contractAddress: getAddress(USDC),
      walletAddress: getAddress(WALLET),
      walletChainId: 1,
      readStatus: 'error',
      errorMessage: 'RPC unavailable',
      chainEnabled: true,
    });

    expect(state.status).toBe('degraded');
    expect(state.amount).toBeUndefined();
    expect(state.message).toBe('RPC unavailable');
  });
});
