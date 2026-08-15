'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';
import { wagmiConfig, queryClient } from '../lib/wagmi-config';

/**
 * Shared account provider for the transition application.
 *
 * Project GAS Phase 7 adds email as the consumer-first entry path and creates
 * an embedded EVM wallet for users who do not already have one. Twitter and
 * external-wallet login remain temporarily available for legacy GASCOIN routes.
 *
 * Mainnet remains the transition repo's configured chain. This is not a final
 * Project GAS chain decision; Phase 0 keeps final chain selection OPEN.
 */
function PrivyInner({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmnj8z4po008b0dl74uza4zv7').trim();

  if (!appId || appId.length < 10) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'twitter', 'wallet'],
        appearance: { theme: resolved, walletChainType: 'ethereum-only' },
        defaultChain: mainnet,
        supportedChains: [mainnet],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PrivyInner>{children}</PrivyInner>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
