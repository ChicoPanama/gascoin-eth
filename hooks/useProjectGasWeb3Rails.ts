'use client';

import { useWallets } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { useConnection } from 'wagmi';
import {
  getProjectGasAssetConfig,
  isProjectGasChainEnabled,
} from '@/lib/project-gas/asset-config';
import {
  getProjectGasRailFeatureConfig,
  parseProjectGasWalletCapabilities,
  projectGasChainLabel,
  projectGasWalletKind,
  projectGasWalletLabel,
  standardProjectGasWalletCapabilities,
  type ProjectGasWalletCapabilities,
  type ProjectGasWeb3RailsModel,
} from '@/lib/project-gas/web3-rails';

interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>;
}

interface CapabilityWallet {
  address: string;
  walletClientType: string;
  getEthereumProvider(): Promise<Eip1193Provider>;
}

function isUnsupportedCapabilityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
  return candidate.code === -32601 || message.includes('not supported') || message.includes('not implemented');
}

export function useProjectGasWeb3Rails(): ProjectGasWeb3RailsModel {
  const connection = useConnection();
  const { ready: walletsReady, wallets } = useWallets();
  const config = getProjectGasAssetConfig();
  const chainEnabled = isProjectGasChainEnabled(config);
  const features = getProjectGasRailFeatureConfig();
  const activeWallet = wallets.find(
    (wallet) => connection.address?.toLowerCase() === wallet.address.toLowerCase(),
  ) as CapabilityWallet | undefined;
  const connected = connection.status === 'connected' && Boolean(connection.address);
  const onConfiguredChain = chainEnabled && connection.chainId === config.chainId;

  const capabilityQuery = useQuery({
    queryKey: ['project-gas', 'wallet-capabilities', activeWallet?.address, config.chainId],
    enabled: connected && onConfiguredChain && Boolean(activeWallet),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
    queryFn: async (): Promise<ProjectGasWalletCapabilities> => {
      if (!activeWallet) {
        return standardProjectGasWalletCapabilities('No Privy wallet provider is available. Standard wallet actions remain the fallback.');
      }
      try {
        const provider = await activeWallet.getEthereumProvider();
        const response = await provider.request({
          method: 'wallet_getCapabilities',
          params: [activeWallet.address],
        });
        return parseProjectGasWalletCapabilities(response, config.chainId);
      } catch (error) {
        if (isUnsupportedCapabilityError(error)) {
          return standardProjectGasWalletCapabilities('This wallet does not expose EIP-5792 capabilities. Standard signed transactions remain available.');
        }
        throw error;
      }
    },
  });

  const kind = projectGasWalletKind(activeWallet?.walletClientType ?? (connected ? 'external' : undefined));
  const capabilities = !connected
    ? {
        status: 'unavailable' as const,
        authority: 'unavailable' as const,
        atomic: 'unknown' as const,
        paymasterService: false,
        dataSuffix: false,
        message: 'Connect a wallet before GAS can inspect Base transaction capabilities.',
      }
    : !chainEnabled
      ? {
          status: 'unavailable' as const,
          authority: 'unavailable' as const,
          atomic: 'unknown' as const,
          paymasterService: false,
          dataSuffix: false,
          message: 'Project GAS chain configuration is invalid. Only Base and Base Sepolia are accepted.',
        }
    : !onConfiguredChain
      ? {
          status: 'unavailable' as const,
          authority: 'unavailable' as const,
          atomic: 'unknown' as const,
          paymasterService: false,
          dataSuffix: false,
          message: `Switch to ${projectGasChainLabel(config.chainId)} before capability checks can run.`,
        }
      : !activeWallet
        ? standardProjectGasWalletCapabilities('This signing wallet is not exposed through the GAS account provider. Standard signed transactions remain available.')
        : capabilityQuery.isPending
        ? {
            status: 'loading' as const,
            authority: 'wallet_getCapabilities' as const,
            atomic: 'unknown' as const,
            paymasterService: false,
            dataSuffix: false,
            message: 'Checking the active wallet’s Base transaction capabilities.',
          }
        : capabilityQuery.isError
          ? {
              status: 'degraded' as const,
              authority: 'wallet_getCapabilities' as const,
              atomic: 'unknown' as const,
              paymasterService: false,
              dataSuffix: false,
              message: 'Capability detection failed. GAS will require a standard signed transaction until the wallet can be checked again.',
            }
          : capabilityQuery.data ?? standardProjectGasWalletCapabilities('Standard signed transactions are available.');

  return {
    version: 1,
    chain: {
      configuredChainId: config.chainId,
      activeChainId: connection.chainId,
      status: !chainEnabled || !connected
        ? 'unavailable'
        : onConfiguredChain
          ? 'ready'
          : 'unavailable',
      label: projectGasChainLabel(config.chainId),
      message: !chainEnabled
        ? 'Project GAS chain configuration is invalid. Money actions are disabled.'
        : !connected
        ? `GAS executes on ${projectGasChainLabel(config.chainId)}; connect a wallet to verify its network.`
        : onConfiguredChain
          ? `The active wallet is on ${projectGasChainLabel(config.chainId)}.`
          : `Switch the active wallet to ${projectGasChainLabel(config.chainId)} before a money action.`,
    },
    wallet: {
      status: !walletsReady || connection.status === 'connecting' || connection.status === 'reconnecting'
        ? 'loading'
        : connected
          ? 'ready'
          : 'unavailable',
      kind,
      label: projectGasWalletLabel(kind),
      message: connected
        ? 'This is the active signing wallet for GAS actions; Privy remains the canonical account layer.'
        : 'No signing wallet is active. GAS identity and financial authority remain separate.',
    },
    capabilities,
    features,
  };
}
