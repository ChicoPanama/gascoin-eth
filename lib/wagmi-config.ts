// Privy-aware wagmi configuration for Project GAS.
//
// Wallet discovery / connection / linking belongs to Privy. This file only
// defines chains and RPC transports for wagmi/viem reads and writes. Using
// createConfig from @privy-io/wagmi lets Privy drive wagmi connector state and
// keeps embedded + external wallets synchronized without a second connector UI.

import { createConfig } from '@privy-io/wagmi';
import { fallback, http } from 'wagmi';
import { base, baseSepolia, mainnet } from 'viem/chains';
import { QueryClient } from '@tanstack/react-query';

function configuredTransport(urls: Array<string | undefined>, publicFallback: string) {
  const normalized = [...urls, publicFallback]
    .map((url) => url?.trim())
    .filter((url, index, values): url is string => Boolean(url) && values.indexOf(url) === index);

  const transports = normalized.map((url) => http(url, {
    retryCount: 1,
    retryDelay: 150,
  }));

  return transports.length > 1 ? fallback(transports) : transports[0];
}

const baseTransport = configuredTransport([
  process.env.NEXT_PUBLIC_BASE_RPC_URL,
  process.env.NEXT_PUBLIC_BASE_RPC_URL_FALLBACK_1,
  process.env.NEXT_PUBLIC_BASE_RPC_URL_FALLBACK_2,
], base.rpcUrls.default.http[0]);

const baseSepoliaTransport = configuredTransport([
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL_FALLBACK_1,
], baseSepolia.rpcUrls.default.http[0]);

// Ethereum remains available only for legacy GASCOIN routes and a possible
// future reserve/settlement domain. Project GAS financial actions are limited
// to Base/Base Sepolia by lib/project-gas/asset-config.ts.
const legacyMainnetTransport = configuredTransport([
  process.env.NEXT_PUBLIC_ETH_RPC_URL,
  process.env.NEXT_PUBLIC_ETH_RPC_URL_FALLBACK_1,
  process.env.NEXT_PUBLIC_ETH_RPC_URL_FALLBACK_2,
], 'https://rpc.ankr.com/eth');

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, mainnet],
  transports: {
    [base.id]: baseTransport,
    [baseSepolia.id]: baseSepoliaTransport,
    [mainnet.id]: legacyMainnetTransport,
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
