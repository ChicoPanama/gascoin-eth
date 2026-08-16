"use client";

import { useState } from "react";
import { useConnectWallet } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

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
 * Compatibility button used by legacy routes.
 *
 * Privy owns the actual wallet picker and connection state. wagmi only reads
 * the active wallet that @privy-io/wagmi synchronizes. We deliberately do not
 * call wagmi useDisconnect: injected wallets cannot be truly disconnected by
 * the page and a shimmed wagmi-only disconnect can desynchronize Privy/wagmi.
 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
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
        ? "Connect or switch the wallet used for this session."
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
      title={message || (isConnected ? "Connect or switch wallet" : "Connect wallet")}
    >
      {isConnected && address ? `${truncate(address)} ↔` : "CONNECT WALLET"}
    </button>
  );
}
