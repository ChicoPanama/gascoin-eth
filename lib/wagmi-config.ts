// Privy-aware wagmi configuration for Project GAS.
//
// Wallet discovery / connection / linking belongs to Privy. This file only
// defines chains and RPC transports for wagmi/viem reads and writes. Using
// createConfig from @privy-io/wagmi lets Privy drive wagmi connector state and
// keeps embedded + external wallets synchronized without a second connector UI.

import { createConfig } from '@privy-io/wagmi';
import { fallback, http } from 'wagmi';
import { mainnet } from 'viem/chains';
import { QueryClient } from '@tanstack/react-query';

const rpcUrls = [
  process.env.NEXT_PUBLIC_ETH_RPC_URL,
  process.env.NEXT_PUBLIC_ETH_RPC_URL_FALLBACK_1,
  process.env.NEXT_PUBLIC_ETH_RPC_URL_FALLBACK_2,
  'https://rpc.ankr.com/eth',
].filter((url): url is string => Boolean(url && url.trim()));

const rpcTransports = rpcUrls.map((url) =>
  http(url, {
    retryCount: 1,
    retryDelay: 150,
  }),
);

const mainnetTransport = rpcTransports.length > 1
  ? fallback(rpcTransports)
  : rpcTransports[0];

export const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: mainnetTransport,
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
