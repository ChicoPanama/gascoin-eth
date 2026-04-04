"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

export function useGascoinWallet() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey) {
      setSolBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setBalanceLoading(true);
      try {
        const lamports = await connection.getBalance(wallet.publicKey!);
        setSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch (err) {
        console.error("Balance fetch failed:", err);
        setSolBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [wallet.publicKey, connection]);

  return {
    ...wallet,
    solBalance,
    balanceLoading,
    isReady: wallet.connected && !!wallet.publicKey,
    shortAddress: wallet.publicKey
      ? `${wallet.publicKey.toBase58().slice(0, 4)}...${wallet.publicKey.toBase58().slice(-4)}`
      : null,
  };
}
