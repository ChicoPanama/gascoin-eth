// hooks/useGascoinWallet.ts
'use client';

import { useBalance, useConnection } from 'wagmi';
import { formatUnits } from 'viem';
import { truncateEthAddress } from '@/lib/validate-wallet';

/**
 * Legacy compatibility view of the Privy-synchronized active EVM wallet.
 * New Project GAS account UX should prefer Privy's useWallets +
 * @privy-io/wagmi useSetActiveWallet when it needs multi-wallet context.
 */
export function useGascoinWallet() {
  const { address, isConnected } = useConnection();
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  const shortAddress = address ? truncateEthAddress(address) : null;
  const ethBalance = balanceData
    ? Number.parseFloat(formatUnits(balanceData.value, balanceData.decimals))
    : 0;

  return {
    address: address ?? null,
    shortAddress,
    isConnected,
    ethBalance,
    ethBalanceLoading: balanceLoading,
  };
}
