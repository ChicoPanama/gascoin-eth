// hooks/useGascoinWallet.ts
'use client';

import { useAccount, useBalance } from 'wagmi';
import { truncateEthAddress } from '@/lib/validate-wallet';

export function useGascoinWallet() {
  const { address, isConnected } = useAccount();
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const shortAddress = address ? truncateEthAddress(address) : null;

  return {
    address: address ?? null,
    shortAddress,
    isConnected,
    ethBalance: balanceData ? parseFloat(balanceData.formatted) : 0,
    ethBalanceLoading: balanceLoading,
  };
}
