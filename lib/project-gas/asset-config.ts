import { getAddress, isAddress, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

export type ProjectGasChainId = typeof base.id | typeof baseSepolia.id;

export interface ProjectGasAssetConfig {
  chainId: ProjectGasChainId;
  gasAddress?: Address;
  usdcAddress?: Address;
}

export interface ProjectGasPublicAssetEnv {
  chainId?: string;
  gasAddress?: string;
  usdcAddress?: string;
}

/**
 * D01 is approved: Project GAS Phase 1 executes on Base. Base Sepolia is the
 * only supported public integration testnet. Arbitrary EVM chain IDs are not a
 * runtime product setting.
 */
export const PROJECT_GAS_MAINNET_CHAIN_ID: ProjectGasChainId = base.id;
export const PROJECT_GAS_TESTNET_CHAIN_ID: ProjectGasChainId = baseSepolia.id;
export const PROJECT_GAS_DEFAULT_CHAIN_ID = PROJECT_GAS_MAINNET_CHAIN_ID;

function normalizeAddress(value: string | undefined): Address | undefined {
  const candidate = value?.trim();
  if (!candidate || !isAddress(candidate, { strict: false })) return undefined;
  return getAddress(candidate);
}

function normalizeChainId(value: string | undefined): ProjectGasChainId {
  const candidate = value?.trim();
  if (!candidate) return PROJECT_GAS_DEFAULT_CHAIN_ID;
  const parsed = Number(candidate);
  if (parsed === PROJECT_GAS_TESTNET_CHAIN_ID) return PROJECT_GAS_TESTNET_CHAIN_ID;
  return PROJECT_GAS_DEFAULT_CHAIN_ID;
}

export function parseProjectGasAssetConfig(env: ProjectGasPublicAssetEnv): ProjectGasAssetConfig {
  return {
    chainId: normalizeChainId(env.chainId),
    gasAddress: normalizeAddress(env.gasAddress),
    usdcAddress: normalizeAddress(env.usdcAddress),
  };
}

/**
 * Public runtime configuration for the new Project GAS monetary assets.
 *
 * Intentionally does NOT read legacy GASCOIN mint/token variables. Phase 9 may
 * only present a spendable GAS/USDC balance as authoritative when the explicit
 * Project GAS contract addresses are configured.
 */
export function getProjectGasAssetConfig(): ProjectGasAssetConfig {
  return parseProjectGasAssetConfig({
    chainId: process.env.NEXT_PUBLIC_PROJECT_GAS_CHAIN_ID,
    gasAddress: process.env.NEXT_PUBLIC_PROJECT_GAS_TOKEN_ADDRESS,
    usdcAddress: process.env.NEXT_PUBLIC_PROJECT_GAS_USDC_ADDRESS,
  });
}

export function isProjectGasChainEnabled(config: ProjectGasAssetConfig): boolean {
  return config.chainId === PROJECT_GAS_MAINNET_CHAIN_ID
    || config.chainId === PROJECT_GAS_TESTNET_CHAIN_ID;
}
