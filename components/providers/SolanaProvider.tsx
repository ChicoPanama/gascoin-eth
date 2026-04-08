"use client";

import React, { FC, ReactNode, useMemo, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, type WalletError } from "@solana/wallet-adapter-base";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(
    () => typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : clusterApiUrl(network),
    [network]
  );

  // Solflare legacy adapter: shows Solflare in the modal even when not installed.
  // Phantom is NOT listed here — its legacy adapter fights with Brave's built-in
  // wallet over window.solana, causing a React 19 re-render crash. Both Phantom
  // and Brave register via Wallet Standard and are auto-detected when installed.
  const wallets = useMemo(
    () => [new SolflareWalletAdapter()],
    []
  );

  const onError = useCallback((error: WalletError) => {
    console.error('[wallet]', error.name, error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
