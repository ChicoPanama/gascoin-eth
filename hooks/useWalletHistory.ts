"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import type { WalletSubmissionHistory } from "../types/leaderboard";

export function useWalletHistory(walletAddress: string | null) {
  const [history, setHistory] = useState<WalletSubmissionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error: err } = await supabaseBrowser
          .from("payouts")
          .select("id, amount_eth, created_at, status, claim_id")
          .eq("wallet", walletAddress)
          .eq("status", "paid")
          .order("created_at", { ascending: false });

        if (err) throw err;
        setHistory(
          (data ?? []).map((p: any) => ({
            id: p.claim_id || p.id,
            sol_amount: Number(p.amount_eth || 0),
            created_at: p.created_at,
            gates_passed: 10,
            status: p.status,
          }))
        );
      } catch {
        setError("Failed to load wallet history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [walletAddress]);

  return { history, loading, error };
}
