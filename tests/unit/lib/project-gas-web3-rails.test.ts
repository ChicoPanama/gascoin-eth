import { describe, expect, it } from 'vitest';
import {
  parseProjectGasWalletCapabilities,
  projectGasChainHex,
  projectGasWalletKind,
  standardProjectGasWalletCapabilities,
} from '../../../lib/project-gas/web3-rails';
import {
  PROJECT_GAS_MAINNET_CHAIN_ID,
  PROJECT_GAS_TESTNET_CHAIN_ID,
} from '../../../lib/project-gas/asset-config';

describe('Project GAS Base wallet capabilities', () => {
  it('uses the canonical hex chain identifiers required by EIP-5792', () => {
    expect(projectGasChainHex(PROJECT_GAS_MAINNET_CHAIN_ID)).toBe('0x2105');
    expect(projectGasChainHex(PROJECT_GAS_TESTNET_CHAIN_ID)).toBe('0x14a34');
  });

  it('parses only the configured Base chain capability record', () => {
    const result = parseProjectGasWalletCapabilities({
      '0x2105': {
        atomic: { supported: 'ready' },
        paymasterService: { supported: true },
        dataSuffix: { supported: true },
      },
      '0x14a34': {
        atomic: { supported: 'unsupported' },
      },
    }, PROJECT_GAS_MAINNET_CHAIN_ID);

    expect(result).toMatchObject({
      status: 'ready',
      authority: 'wallet_getCapabilities',
      atomic: 'ready',
      paymasterService: true,
      dataSuffix: true,
    });
  });

  it('treats absent optional capabilities as unsupported rather than inventing support', () => {
    const result = parseProjectGasWalletCapabilities({
      '0x2105': {},
    }, PROJECT_GAS_MAINNET_CHAIN_ID);

    expect(result.atomic).toBe('unsupported');
    expect(result.paymasterService).toBe(false);
    expect(result.dataSuffix).toBe(false);
  });

  it('degrades safely when the wallet omits the configured chain', () => {
    const result = parseProjectGasWalletCapabilities({
      '0x1': { atomic: { supported: 'ready' } },
    }, PROJECT_GAS_MAINNET_CHAIN_ID);

    expect(result.status).toBe('degraded');
    expect(result.atomic).toBe('unsupported');
    expect(result.message).toMatch(/standard signed transactions/i);
  });

  it('keeps standard wallet transactions first-class when capabilities are unavailable', () => {
    const result = standardProjectGasWalletCapabilities('Method unavailable.');

    expect(result.status).toBe('ready');
    expect(result.authority).toBe('standard-wallet');
    expect(result.paymasterService).toBe(false);
  });

  it('distinguishes Base Account, embedded and external signing wallets', () => {
    expect(projectGasWalletKind('base_account')).toBe('base-account');
    expect(projectGasWalletKind('privy')).toBe('embedded-wallet');
    expect(projectGasWalletKind('metamask')).toBe('external-wallet');
    expect(projectGasWalletKind(undefined)).toBe('unavailable');
  });
});
