"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const { connected, publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const truncate = (key: string) =>
    `${key.slice(0, 4)}...${key.slice(-4)}`;

  if (connecting) {
    return (
      <button className="wallet-btn wallet-btn--loading" disabled>
        CONNECTING...
      </button>
    );
  }

  if (connected && publicKey) {
    return (
      <button className="wallet-btn wallet-btn--connected" onClick={disconnect}>
        {truncate(publicKey.toBase58())} ✕
      </button>
    );
  }

  return (
    <button className="wallet-btn" onClick={() => setVisible(true)}>
      CONNECT WALLET
    </button>
  );
}
