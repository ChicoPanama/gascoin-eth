// lib/wagmi-config.ts
// Minimal wagmi v2 config for GASCOIN Ethereum migration.
// Supports injected wallets (MetaMask, browser extension) on Ethereum mainnet.
// QueryClient lives here so both WagmiProvider and the app share the same instance.

import { createConfig, fallback, http, injected } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

// Multi-provider RPC fallback chain: Alchemy (primary) → Infura → Ankr (free
// public). wagmi's `fallback` transport tries each in order and fails over
// transparently on 5xx / rate-limit / network errors. A single provider
// outage no longer breaks wallet reads for every user.
//
// All three URLs are optional — whichever env vars are set get wired in.
// At minimum we always have the Ankr public RPC so wallet reads keep
// working even if no paid provider is configured.
const transports = [
  process.env.NEXT_PUBLIC_ETH_RPC_URL,
  process.env.NEXT_PUBLIC_ETH_RPC_URL_FALLBACK_1,
  process.env.NEXT_PUBLIC_ETH_RPC_URL_FALLBACK_2,
  'https://rpc.ankr.com/eth',
]
  .filter((url): url is string => Boolean(url && url.trim()))
  .map((url) => http(url, {
    // Retry a single time per provider before moving to the next in the
    // fallback chain. Keeps latency bounded during a brief provider hiccup.
    retryCount: 1,
    retryDelay: 150,
  }));

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: transports.length > 1 ? fallback(transports) : transports[0],
  },
  ssr: true,
});

export const queryClient = new QueryClient();
