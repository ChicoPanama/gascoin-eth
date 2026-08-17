import { getAddress, isAddress, type Address } from 'viem';
import { mainnet } from 'viem/chains';

export interface ProjectGasAssetConfig {
  chainId: number;
  gasAddress?: Address;
  usdcAddress?: Address;
}

export interface ProjectGasPublicAssetEnv {
  chainId?: string;
  gasAddress?: string;
  usdcAddress?: string;
}

export const TRANSITION_PROJECT_GAS_CHAIN_ID = mainnet.id;

function normalizeAddress(value: string | undefined): Address | undefined {
  const candidate = value?.trim();
  if (!candidate || !isAddress(candidate, { strict: false })) return undefined;
  return getAddress(candidate);
}

function normalizeChainId(value: string | undefined): number {
  const candidate = value?.trim();
  if (!candidate) return TRANSITION_PROJECT_GAS_CHAIN_ID;
  const parsed = Number(candidate);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return TRANSITION_PROJECT_GAS_CHAIN_ID;
  return parsed;
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
  return config.chainId === TRANSITION_PROJECT_GAS_CHAIN_ID;
}
