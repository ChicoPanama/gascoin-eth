'use client';

// build-cache-bust: 2026-04-18 — force Vercel rebuild for NEXT_PUBLIC_PRIVY_APP_ID inlining
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';
import { wagmiConfig, queryClient } from '../lib/wagmi-config';

/**
 * Inner provider that reads the resolved theme and passes it to the Privy
 * modal so the login UI matches the rest of the site. Split out from
 * Providers so it can call useTheme() (which requires a ThemeProvider
 * ancestor in the tree).
 */
function PrivyInner({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();
  // Privy App ID for gascoin-eth. NEXT_PUBLIC_PRIVY_APP_ID env var takes
  // precedence when set; the literal is a safe default since the app ID
  // is public (client-side identifier, not a secret).
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmnj8z4po008b0dl74uza4zv7').trim();

  if (!appId || appId.length < 10) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Twitter = primary login for refund flow. Wallet = required for the
        // /presale page so contributors can sign with MetaMask/Rainbow/etc.
        loginMethods: ['twitter', 'wallet'],
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
