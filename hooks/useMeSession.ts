'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

/**
 * Lightweight session view for the /me sidebar identity card.
 *
 * Reads the X handle from Privy's linked accounts (already hydrated
 * client-side, no fetch required) and the wallet from Privy's wallet
 * field. Does NOT call /api/me — that's for the full dashboard.
 */
export function useMeSession(): { xHandle: string | null; wallet: string | null } {
  const { ready, authenticated, user } = usePrivy();
  const [state, setState] = useState<{ xHandle: string | null; wallet: string | null }>({
    xHandle: null,
    wallet: null,
  });

  useEffect(() => {
    if (!ready || !authenticated || !user) {
      setState({ xHandle: null, wallet: null });
      return;
    }
    const twitter = user.linkedAccounts?.find((a: any) => a.type === 'twitter_oauth') as any;
    const xHandle = twitter?.username ?? null;
    const wallet = user.wallet?.address ?? null;
    setState({ xHandle, wallet });
  }, [ready, authenticated, user]);

  return state;
}
