"use client";

import { useState } from "react";
import { useConnectWallet } from "@privy-io/react-auth";
import { useConnection } from "wagmi";

const EXTERNAL_WALLETS = [
  "metamask",
  "coinbase_wallet",
  "base_account",
  "rainbow",
  "uniswap",
  "safe",
  "detected_ethereum_wallets",
  "wallet_connect",
] as const;

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Compatibility wallet action used by legacy routes.
 *
 * Privy owns connection/discovery. Wagmi only exposes the active wallet that
 * @privy-io/wagmi synchronizes. We intentionally do not use wagmi disconnect:
 * a local connector disconnect can diverge from Privy's true wallet state.
 */
export function WalletButton() {
  const { address, isConnected } = useConnection();
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { connectWallet } = useConnectWallet({
    onSuccess: () => {
      setConnecting(false);
      setMessage(null);
    },
    onError: (error) => {
      setConnecting(false);
      setMessage(typeof error === "string" ? error : "Wallet connection was not completed.");
    },
  });

  const openWalletPicker = () => {
    setConnecting(true);
    setMessage(null);
    void connectWallet({
      description: isConnected
        ? "Connect another wallet you control. You can choose the active wallet from Account."
        : "Connect a wallet you already control.",
      walletChainType: "ethereum-only",
      walletList: [...EXTERNAL_WALLETS],
    });
  };

  if (connecting) {
    return (
      <button className="wallet-btn wallet-btn--loading" disabled>
        CONNECTING...
      </button>
    );
  }

  return (
    <button
      className={isConnected && address ? "wallet-btn wallet-btn--connected" : "wallet-btn"}
      onClick={openWalletPicker}
      title={message || (isConnected ? "Connect another wallet" : "Connect wallet")}
    >
      {isConnected && address ? `${truncate(address)} +` : "CONNECT WALLET"}
    </button>
  );
}
