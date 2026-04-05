"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import type { LeaderboardEntry, LeaderboardStats } from "../types/leaderboard";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const GASCOIN_MINT = process.env.NEXT_PUBLIC_GASCOIN_MINT || '';

// Fetch GASCOIN token balance for a wallet via JSON-RPC
async function fetchGascoinBalance(wallet: string): Promise<number> {
  if (!GASCOIN_MINT) return 0;
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [wallet, { mint: GASCOIN_MINT }, { encoding: 'jsonParsed' }]
      }),
    });
    const json = await res.json();
    let total = 0;
    for (const acc of json?.result?.value || []) {
      total += Number(acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
    }
    return total;
  } catch {
    return 0;
  }
}

// Composite score: 40% Referrals + 35% Engagement + 25% GASCOIN Holdings
// SOL earned is NOT a factor — points only. SOL is for receipts only.
function computeCompositeScore(solEarned: number, gascoinHoldings: number, referrals: number, engagement: number): number {
  const gcNorm = gascoinHoldings / 1_000_000;
  return (referrals * 0.40) + (engagement * 0.35) + (gcNorm * 0.25);
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Query payouts table directly — no views needed
      const { data: payouts, error: payErr } = await supabaseBrowser
        .from("payouts")
        .select("wallet, amount_sol, created_at, status")
        .eq("status", "paid");

      if (payErr) throw payErr;

      if (!payouts || payouts.length === 0) {
        setEntries([]);
        setStats({
          total_earners: 0, total_sol_paid: 0, total_approved: 0,
          largest_single_refund: 0, avg_refund_amount: 0,
          total_gascoin_held: 0, total_referrals: 0,
        });
        setLastUpdated(new Date());
        setError(null);
        setLoading(false);
        return;
      }

      // Aggregate by wallet
      const walletMap = new Map<string, {
        total_sol: number;
        count: number;
        last_at: string;
      }>();

      let totalPaid = 0;
      let largest = 0;

      for (const p of payouts) {
        const amt = Number(p.amount_sol || 0);
        totalPaid += amt;
        if (amt > largest) largest = amt;

        const existing = walletMap.get(p.wallet);
        if (existing) {
          existing.total_sol += amt;
          existing.count += 1;
          if (p.created_at > existing.last_at) existing.last_at = p.created_at;
        } else {
          walletMap.set(p.wallet, { total_sol: amt, count: 1, last_at: p.created_at });
        }
      }

      // Fetch GASCOIN holdings for all wallets (batch, with concurrency limit)
      const wallets = Array.from(walletMap.keys());
      const holdingsMap = new Map<string, number>();

      // Fetch in batches of 5 to avoid rate limits
      for (let i = 0; i < wallets.length; i += 5) {
        const batch = wallets.slice(i, i + 5);
        const results = await Promise.all(batch.map(fetchGascoinBalance));
        batch.forEach((w, idx) => holdingsMap.set(w, results[idx]));
      }

      // Fetch referral and engagement data from Supabase
      const refMap = new Map<string, number>();
      const engMap = new Map<string, number>();

      try {
        const { data: refData } = await supabaseBrowser
          .from('referral_counts')
          .select('wallet, verified_referrals');
        for (const r of refData || []) {
          refMap.set(r.wallet, Number(r.verified_referrals || 0));
        }
      } catch {} // Views may not exist yet — graceful fallback

      try {
        const { data: engData } = await supabaseBrowser
          .from('engagement_totals')
          .select('wallet, total_engagement_score');
        for (const e of engData || []) {
          engMap.set(e.wallet, Number(e.total_engagement_score || 0));
        }
      } catch {} // Views may not exist yet — graceful fallback

      // Build entries with composite score
      const raw: LeaderboardEntry[] = wallets.map((w) => {
        const d = walletMap.get(w)!;
        const gc = holdingsMap.get(w) || 0;
        const referrals = refMap.get(w) || 0;
        const engagement = engMap.get(w) || 0;
        const score = computeCompositeScore(d.total_sol, gc, referrals, engagement);

        return {
          wallet_address: w,
          total_submissions: d.count,
          total_sol_earned: d.total_sol,
          last_submission_at: d.last_at,
          rank: 0,
          gascoin_holdings: gc,
          composite_score: score,
          referral_count: referrals,
          engagement_score: engagement,
        };
      });

      // Sort by composite score descending, assign ranks
      raw.sort((a, b) => b.composite_score - a.composite_score);
      raw.forEach((e, i) => { e.rank = i + 1; });

      const totalGc = Array.from(holdingsMap.values()).reduce((s, v) => s + v, 0);
      const totalRefs = Array.from(refMap.values()).reduce((s, v) => s + v, 0);

      setEntries(raw);
      setStats({
        total_earners: walletMap.size,
        total_sol_paid: totalPaid,
        total_approved: payouts.length,
        largest_single_refund: largest,
        avg_refund_amount: payouts.length > 0 ? totalPaid / payouts.length : 0,
        total_gascoin_held: totalGc,
        total_referrals: totalRefs,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Leaderboard fetch error:", err);
      setError("Failed to load leaderboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Supabase Realtime — re-fetch on payout changes
    const channel = supabaseBrowser
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payouts" },
        () => { fetchLeaderboard(); }
      )
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [fetchLeaderboard]);

  return { entries, stats, loading, error, lastUpdated, refetch: fetchLeaderboard };
}
