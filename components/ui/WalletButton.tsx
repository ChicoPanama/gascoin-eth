"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { WalletConnectModal } from "../WalletConnectModal";

const CONNECT_TIMEOUT_MS = 15000;

export function WalletButton() {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const [modalOpen, setModalOpen] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connection timeout — reset to idle if wallet hangs
  useEffect(() => {
    if (isConnecting) {
      setTimedOut(false);
      timerRef.current = setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimedOut(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isConnecting]);

  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Timed out — let user retry
  if (isConnecting && timedOut) {
    return (
      <>
        <button
          className="wallet-btn"
          onClick={() => {
            disconnect();
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
  if (isConnecting) {
    return (
      <button className="wallet-btn wallet-btn--loading" disabled>
        CONNECTING...
      </button>
    );
  }

  // Connected — show wallet address
  if (isConnected && address) {
    return (
      <button className="wallet-btn wallet-btn--connected" onClick={() => disconnect()}>
        {truncate(address)} ✕
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
