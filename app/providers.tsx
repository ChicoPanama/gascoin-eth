'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || '').trim();

  if (!appId || appId.length < 10) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['twitter', 'wallet'],
        appearance: { theme: 'dark' }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
