"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletConnectModal } from "../WalletConnectModal";

const CONNECT_TIMEOUT_MS = 15000;

export function WalletButton() {
  const { connected, publicKey, disconnect, connecting, wallet } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connection timeout — reset to idle if wallet adapter hangs
  useEffect(() => {
    if (connecting) {
      setTimedOut(false);
      timerRef.current = setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimedOut(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [connecting]);

  const truncate = (key: string) =>
    `${key.slice(0, 4)}...${key.slice(-4)}`;

  // Timed out — let user retry
  if (connecting && timedOut) {
    return (
      <>
        <button
          className="wallet-btn"
          onClick={() => {
            // Force disconnect to reset adapter state, then reopen modal
            disconnect().catch(() => {});
            setTimeout(() => setModalOpen(true), 100);
          }}
        >
          RETRY
        </button>
        <WalletConnectModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Connecting — show loading state
  if (connecting) {
    return (
      <button className="wallet-btn wallet-btn--loading" disabled>
        CONNECTING...
      </button>
    );
  }

  // Connected — show wallet address
  if (connected && publicKey) {
    return (
      <button className="wallet-btn wallet-btn--connected" onClick={disconnect}>
        {truncate(publicKey.toBase58())} ✕
      </button>
    );
  }

  // Idle — show connect button + custom modal
  return (
    <>
      <button className="wallet-btn" onClick={() => setModalOpen(true)}>
        CONNECT WALLET
      </button>
      <WalletConnectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
