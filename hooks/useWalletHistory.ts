"use client";

import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "../lib/supabase-client";
import type { WalletSubmissionHistory } from "../types/leaderboard";

async function fetchWalletHistory(walletAddress: string): Promise<WalletSubmissionHistory[]> {
  const { data, error } = await supabaseBrowser
    .from("payouts")
    .select("id, amount_eth, created_at, status, claim_id")
    .eq("wallet", walletAddress)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.claim_id || p.id,
    eth_amount: Number(p.amount_eth || 0),
    created_at: p.created_at,
    gates_passed: 10,
    status: p.status,
  }));
}

export function useWalletHistory(walletAddress: string | null) {
  const query = useQuery<WalletSubmissionHistory[], Error>({
    queryKey: ['wallet-history', walletAddress],
    queryFn: () => fetchWalletHistory(walletAddress as string),
    enabled: !!walletAddress,
    // Payout history is append-only — once a payout is in, it won't mutate.
    // 60s stale window avoids re-fetching when the drill-down panel toggles.
    staleTime: 60_000,
    retry: 1,
  });

  return {
    history: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? "Failed to load wallet history." : null,
  };
}
