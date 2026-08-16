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
 * Project GAS uses a hybrid account model:
 * - email/social entry can create an embedded EVM wallet for users who need one;
 * - users who already control a wallet can log in with it or link additional
 *   external wallets to the same GAS identity.
 *
 * Wagmi remains temporarily around this provider because legacy GASCOIN routes
 * still use wagmi hooks. New Project GAS account/wallet UX should prefer Privy
 * so we can retire duplicated connector UI as legacy routes are decommissioned.
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
        appearance: {
          theme: resolved,
          walletChainType: 'ethereum-only',
          // Named mobile-friendly choices first, installed EVM extensions next,
          // then WalletConnect as the long-tail fallback. `base_account` keeps
          // the door open for app-specific subaccounts/spend permissions later
          // without making Base the final chain decision today.
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
