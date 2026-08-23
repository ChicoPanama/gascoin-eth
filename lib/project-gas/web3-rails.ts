import { baseSepolia } from 'viem/chains';
import type { ProjectGasChainId } from './asset-config';

export type ProjectGasRailStatus = 'loading' | 'ready' | 'degraded' | 'unavailable';
export type ProjectGasWalletKind = 'base-account' | 'embedded-wallet' | 'external-wallet' | 'unavailable';
export type ProjectGasAtomicSupport = 'supported' | 'ready' | 'unsupported' | 'unknown';

export interface ProjectGasWalletCapabilities {
  status: ProjectGasRailStatus;
  authority: 'wallet_getCapabilities' | 'standard-wallet' | 'unavailable';
  atomic: ProjectGasAtomicSupport;
  paymasterService: boolean;
  dataSuffix: boolean;
  message: string;
}

export interface ProjectGasRailFeatureConfig {
  paymasterEnabled: boolean;
  basePayEnabled: boolean;
  onrampEnabled: boolean;
  builderCodeConfigured: boolean;
}

export interface ProjectGasWeb3RailsModel {
  version: 1;
  chain: {
    configuredChainId: ProjectGasChainId;
    activeChainId?: number;
    status: ProjectGasRailStatus;
    label: string;
    message: string;
  };
  wallet: {
    status: ProjectGasRailStatus;
    kind: ProjectGasWalletKind;
    label: string;
    message: string;
  };
  capabilities: ProjectGasWalletCapabilities;
  features: ProjectGasRailFeatureConfig;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capabilitySupported(value: unknown): boolean {
  return isRecord(value) && value.supported === true;
}

function atomicSupport(value: unknown): ProjectGasAtomicSupport {
  if (!isRecord(value)) return 'unsupported';
  const supported = value.supported ?? value.status;
  return supported === 'supported' || supported === 'ready' || supported === 'unsupported'
    ? supported
    : 'unknown';
}

export function projectGasChainHex(chainId: ProjectGasChainId): `0x${string}` {
  return `0x${chainId.toString(16)}`;
}

export function projectGasChainLabel(chainId: ProjectGasChainId): string {
  return chainId === baseSepolia.id ? 'Base Sepolia' : 'Base';
}

export function parseProjectGasWalletCapabilities(
  value: unknown,
  chainId: ProjectGasChainId,
): ProjectGasWalletCapabilities {
  if (!isRecord(value)) {
    return {
      status: 'degraded',
      authority: 'wallet_getCapabilities',
      atomic: 'unknown',
      paymasterService: false,
      dataSuffix: false,
      message: 'The wallet returned an invalid capability response. Standard signed transactions remain the fallback.',
    };
  }

  const requestedChain = projectGasChainHex(chainId).toLowerCase();
  const chainEntry = Object.entries(value).find(([key]) => key.toLowerCase() === requestedChain)?.[1];
  if (!isRecord(chainEntry)) {
    return {
      status: 'degraded',
      authority: 'wallet_getCapabilities',
      atomic: 'unsupported',
      paymasterService: false,
      dataSuffix: false,
      message: `The wallet did not report capabilities for ${projectGasChainLabel(chainId)}. Standard signed transactions remain the fallback.`,
    };
  }

  return {
    status: 'ready',
    authority: 'wallet_getCapabilities',
    atomic: atomicSupport(chainEntry.atomic),
    paymasterService: capabilitySupported(chainEntry.paymasterService),
    dataSuffix: capabilitySupported(chainEntry.dataSuffix),
    message: 'Capabilities are reported by the active wallet for the configured Base chain.',
  };
}

export function standardProjectGasWalletCapabilities(message: string): ProjectGasWalletCapabilities {
  return {
    status: 'ready',
    authority: 'standard-wallet',
    atomic: 'unknown',
    paymasterService: false,
    dataSuffix: false,
    message,
  };
}

export function projectGasWalletKind(clientType: string | undefined): ProjectGasWalletKind {
  if (!clientType) return 'unavailable';
  if (clientType === 'base_account') return 'base-account';
  if (clientType === 'privy' || clientType === 'privy_v2') return 'embedded-wallet';
  return 'external-wallet';
}

export function projectGasWalletLabel(kind: ProjectGasWalletKind): string {
  if (kind === 'base-account') return 'Base Account';
  if (kind === 'embedded-wallet') return 'GAS embedded wallet';
  if (kind === 'external-wallet') return 'External wallet';
  return 'No active wallet';
}

function enabled(value: string | undefined): boolean {
  return value === 'true';
}

export function getProjectGasRailFeatureConfig(): ProjectGasRailFeatureConfig {
  return {
    paymasterEnabled: enabled(process.env.NEXT_PUBLIC_PROJECT_GAS_PAYMASTER_ENABLED),
    basePayEnabled: enabled(process.env.NEXT_PUBLIC_PROJECT_GAS_BASE_PAY_ENABLED),
    onrampEnabled: enabled(process.env.NEXT_PUBLIC_PROJECT_GAS_ONRAMP_ENABLED),
    builderCodeConfigured: enabled(process.env.NEXT_PUBLIC_PROJECT_GAS_BUILDER_CODE_CONFIGURED),
  };
}
