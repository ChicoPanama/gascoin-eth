'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getAddress, isAddress, parseAbi, zeroAddress, type Address } from 'viem';
import { useConnection, useReadContract } from 'wagmi';
import {
  buildProjectGasAssetBalance,
  type ProjectGasAccountReadModel,
  type ProjectGasAssetBalanceState,
  type ProjectGasAssetSymbol,
  type ProjectGasIdentityState,
  type ProjectGasWalletRelationship,
} from '@/lib/project-gas/account-state';
import {
  getProjectGasAssetConfig,
  isProjectGasChainEnabled,
  type ProjectGasChainId,
} from '@/lib/project-gas/asset-config';

const ERC20_ACCOUNT_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

function identityLabel(user: ReturnType<typeof usePrivy>['user']): string | undefined {
  if (!user) return undefined;
  if (user.email?.address) return user.email.address;
  if (user.twitter?.username) return `@${user.twitter.username}`;
  if (user.wallet?.address) return `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`;
  return 'GAS account';
}

function normalizedAddress(value: string | undefined): Address | undefined {
  if (!value || !isAddress(value, { strict: false })) return undefined;
  return getAddress(value);
}

function useConfiguredAssetBalance({
  asset,
  contractAddress,
  configuredChainId,
  walletAddress,
  walletChainId,
  chainEnabled,
}: {
  asset: ProjectGasAssetSymbol;
  contractAddress?: Address;
  configuredChainId: ProjectGasChainId;
  walletAddress?: Address;
  walletChainId?: number;
  chainEnabled: boolean;
}): ProjectGasAssetBalanceState {
  const enabled = Boolean(
    chainEnabled
      && contractAddress
      && walletAddress
      && walletChainId === configuredChainId,
  );

  const balance = useReadContract({
    address: contractAddress ?? zeroAddress,
    abi: ERC20_ACCOUNT_ABI,
    functionName: 'balanceOf',
    args: [walletAddress ?? zeroAddress],
    chainId: configuredChainId,
    query: {
      enabled,
      staleTime: 15_000,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });

  const decimals = useReadContract({
    address: contractAddress ?? zeroAddress,
    abi: ERC20_ACCOUNT_ABI,
    functionName: 'decimals',
    chainId: configuredChainId,
    query: {
      enabled,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  });

  const readStatus = !enabled
    ? 'idle'
    : balance.isPending || decimals.isPending
      ? 'pending'
      : balance.isError || decimals.isError
        ? 'error'
        : balance.isSuccess && decimals.isSuccess
          ? 'success'
          : 'idle';

  return buildProjectGasAssetBalance({
    asset,
    chainId: configuredChainId,
    contractAddress,
    walletAddress,
    walletChainId,
    readStatus,
    rawAmount: typeof balance.data === 'bigint' ? balance.data : undefined,
    decimals: typeof decimals.data === 'number' ? decimals.data : undefined,
    updatedAtMs: balance.dataUpdatedAt || undefined,
    stale: balance.isStale,
    chainEnabled,
  });
}

export interface UseProjectGasAccountResult {
  model: ProjectGasAccountReadModel;
  configuration: {
    chainId: number;
    gasConfigured: boolean;
    usdcConfigured: boolean;
    chainEnabled: boolean;
  };
}

export function useProjectGasAccount(): UseProjectGasAccountResult {
  const { ready: privyReady, authenticated, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const connection = useConnection();
  const config = getProjectGasAssetConfig();
  const chainEnabled = isProjectGasChainEnabled(config);

  const activeAddress = normalizedAddress(connection.address);

  const gasBalance = useConfiguredAssetBalance({
    asset: 'GAS',
    contractAddress: config.gasAddress,
    configuredChainId: config.chainId,
    walletAddress: activeAddress,
    walletChainId: connection.chainId,
    chainEnabled,
  });

  const usdcBalance = useConfiguredAssetBalance({
    asset: 'USDC',
    contractAddress: config.usdcAddress,
    configuredChainId: config.chainId,
    walletAddress: activeAddress,
    walletChainId: connection.chainId,
    chainEnabled,
  });

  const identity: ProjectGasIdentityState = !privyReady
    ? {
        status: 'loading',
        authority: 'privy',
        message: 'Loading GAS account identity.',
      }
    : !authenticated || !user
      ? {
          status: 'unavailable',
          authority: 'unavailable',
          message: 'Sign in to establish your GAS account identity.',
        }
      : {
          status: 'ready',
          authority: 'privy',
          userId: user.id,
          label: identityLabel(user),
        };

  const activeWallet = connection.status === 'connecting' || connection.status === 'reconnecting'
    ? {
        status: 'loading' as const,
        authority: 'privy-wagmi' as const,
        message: 'Restoring the active wallet relationship.',
      }
    : connection.status === 'connected' && activeAddress
      ? {
          status: 'ready' as const,
          authority: 'privy-wagmi' as const,
          address: activeAddress,
          chainId: connection.chainId,
        }
      : {
          status: 'unavailable' as const,
          authority: 'unavailable' as const,
          message: 'No active wallet is available for GAS actions.',
        };

  const walletRelationships: ProjectGasWalletRelationship[] = walletsReady
    ? wallets.flatMap((wallet) => {
        const address = normalizedAddress(wallet.address);
        if (!address) return [];
        return [{
          address,
          clientType: wallet.walletClientType,
          kind: wallet.walletClientType === 'privy' || wallet.walletClientType === 'privy_v2'
            ? 'embedded' as const
            : 'external' as const,
          active: activeAddress?.toLowerCase() === address.toLowerCase(),
        }];
      })
    : [];

  return {
    model: {
      version: 1,
      identity,
      activeWallet,
      wallets: walletRelationships,
      spendable: {
        gas: gasBalance,
        usdc: usdcBalance,
      },
      lockedWagers: {
        status: 'unavailable',
        authority: 'unavailable',
        message: 'Locked wager accounting is not connected until the Phase 9 game adapter is authoritative.',
      },
      pendingActions: {
        status: 'unavailable',
        authority: 'unavailable',
        message: 'Canonical pending action history is not connected yet.',
      },
    },
    configuration: {
      chainId: config.chainId,
      gasConfigured: Boolean(config.gasAddress),
      usdcConfigured: Boolean(config.usdcAddress),
      chainEnabled,
    },
  };
}
