'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { base, baseSepolia, mainnet } from 'viem/chains';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';
import { wagmiConfig, queryClient } from '../lib/wagmi-config';

/**
 * Project GAS hybrid account provider.
 *
 * Privy owns authentication, embedded-wallet provisioning and external-wallet
 * connection/linking. @privy-io/wagmi mirrors Privy's active wallet into
 * wagmi/viem so application reads and writes use one synchronized wallet state.
 *
 * D01 fixes Project GAS Phase 1 to Base, with Base Sepolia as the integration
 * testnet. Ethereum remains supported only for legacy GASCOIN compatibility
 * and a possible future reserve/settlement domain.
 */
function PrivyInner({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmnj8z4po008b0dl74uza4zv7').trim();

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'twitter', 'wallet'],
        appearance: {
          theme: resolved,
          walletChainType: 'ethereum-only',
          walletList: [
            'metamask',
            'coinbase_wallet',
            'base_account',
            'rainbow',
            'uniswap',
            'safe',
            'detected_ethereum_wallets',
            'wallet_connect',
          ],
        },
        defaultChain: base,
        supportedChains: [base, baseSepolia, mainnet],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PrivyInner>{children}</PrivyInner>
    </ThemeProvider>
  );
}
