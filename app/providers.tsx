'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { SolanaProvider } from '../components/providers/SolanaProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || '').trim();

  const inner = <SolanaProvider>{children}</SolanaProvider>;

  if (!appId || appId.length < 10) {
    return inner;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['twitter', 'wallet'],
        appearance: { theme: 'dark' }
      }}
    >
      {inner}
    </PrivyProvider>
  );
}
