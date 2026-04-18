// lib/wagmi-config.ts
// Minimal wagmi v2 config for GASCOIN Ethereum migration.
// Supports injected wallets (MetaMask, browser extension) on Ethereum mainnet.
// QueryClient lives here so both WagmiProvider and the app share the same instance.

import { createConfig, http, injected } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ETH_RPC_URL || undefined),
  },
  ssr: true,
});

export const queryClient = new QueryClient();
