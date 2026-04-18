'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { mainnet } from 'viem/chains';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';

/**
 * Inner provider that reads the resolved theme and passes it to the Privy
 * modal so the login UI matches the rest of the site. Split out from
 * Providers so it can call useTheme() (which requires a ThemeProvider
 * ancestor in the tree).
 */
function PrivyInner({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || '').trim();

  if (!appId || appId.length < 10) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['twitter'],
        appearance: { theme: resolved },
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
    <ThemeProvider>
      <PrivyInner>{children}</PrivyInner>
    </ThemeProvider>
  );
}
