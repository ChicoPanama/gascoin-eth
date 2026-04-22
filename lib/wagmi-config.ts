// lib/wagmi-config.ts
// wagmi v2 config for GASCOIN Ethereum migration.
//
// Connector strategy: we list THREE connector families so no user is locked
// out by extension conflicts or device class.
//
//   1. injected()        — generic EIP-1193 window.ethereum fallback
//                          (covers older wallets that don't announce via
//                           EIP-6963). wagmi v2 also auto-discovers every
//                           EIP-6963 announced provider as a separate named
//                           connector ("Rabby", "MetaMask", "Phantom", ...)
//                           so users with multiple extensions installed can
//                           pick the exact one they want.
//
//   2. walletConnect()   — QR-code / deep-link transport. Works for every
//                          wallet that doesn't need a browser extension:
//                          mobile Phantom, Rainbow, Trust, Zerion, Ledger
//                          Live, Safe, etc. Bypasses window.ethereum
//                          entirely, so conflicts between Rabby + Phantom
//                          extension injection don't break this path.
//
//   3. coinbaseWallet()  — Coinbase SDK. Covers Coinbase Smart Wallet
//                          (passkey-based, no extension required) and the
//                          Coinbase Wallet mobile app via its own transport.
//
// Users need to install nothing extra. They pick whichever option is
// easiest for their situation.
//
// QueryClient lives here so both WagmiProvider and the app share the same instance.

import { createConfig, fallback, http, injected } from 'wagmi';
import { walletConnect, coinbaseWallet } from 'wagmi/connectors';
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

// WalletConnect projectId: required for the walletConnect transport.
// Gracefully skip that connector if the env var isn't set (local dev w/o
// a WC Cloud project, CI, etc.) so the rest of the app still works —
// users on such builds simply won't see the WalletConnect row.
const wcProjectId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '').trim();

// Coinbase Smart Wallet works without config; `preference: 'all'` surfaces
// both the Smart Wallet (passkey, no extension) AND the Coinbase Wallet
// mobile app. `appName` shows in the wallet's approval UI.
const coinbase = coinbaseWallet({
  appName: 'GASCOIN',
  appLogoUrl: 'https://gascoin.app/logo/gascoin-g.jpg',
  preference: 'all',
});

const connectors = [
  injected(),
  ...(wcProjectId
    ? [
        walletConnect({
          projectId: wcProjectId,
          // Surface GASCOIN branding in the WC modal + wallet approval UI.
          metadata: {
            name: 'GASCOIN',
            description: 'Ethereum gas refund protocol — post on X, upload receipt, get ETH back.',
            url: 'https://gascoin.app',
            icons: ['https://gascoin.app/logo/gascoin-g.jpg'],
          },
          // Suppress WC's own QR modal — our `WalletConnectModal` renders
          // the QR + deep-link UX itself via useConnect(). Avoids two
          // stacked modals when the user clicks the WalletConnect row.
          showQrModal: true,
        }),
      ]
    : []),
  coinbase,
];

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors,
  transports: {
    [mainnet.id]: transports.length > 1 ? fallback(transports) : transports[0],
  },
  ssr: true,
});

export const queryClient = new QueryClient();
