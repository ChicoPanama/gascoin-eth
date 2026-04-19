"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import type { LeaderboardEntry, LeaderboardStats } from "../types/leaderboard";
import { DEMO_LEADERBOARD } from "../lib/demo-data";

// Composite score: 55% Holdings points + 25% Engagement + 20% Referrals
// Holdings-dominant: whales hold the price, they ARE the ecosystem.
function computeCompositeScore(holdingsPoints: number, engagement: number, referrals: number): number {
  return (holdingsPoints * 0.55) + (engagement * 0.25) + (referrals * 0.20);
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // ── 1. Server-side aggregation — no full table scan ───────────
      // get_leaderboard_data() does GROUP BY wallet on the DB, returning
      // one row per wallet instead of one row per payout.
      const { data: leaderRows, error: lbErr } = await supabaseBrowser
        .rpc('get_leaderboard_data', { lim: 100 });

      if (lbErr) throw lbErr;

      if (!leaderRows || leaderRows.length === 0) {
        setEntries(DEMO_LEADERBOARD.map((d: any) => ({
          wallet_address: d.wallet_address,
          total_submissions: d.total_submissions ?? 1,
          total_eth_earned: d.total_eth_earned,
          rank: d.rank,
          gascoin_holdings: 0,
          composite_score: d.composite_score ?? d.total_eth_earned * 100,
          referral_count: 0,
          engagement_score: 0,
          x_handle: d.x_handle,
        })) as LeaderboardEntry[]);
        setStats({
          total_earners: 10, total_eth_paid: 4821.5, total_approved: 36,
          largest_single_refund: 2.847, avg_refund_amount: 0.38,
          total_gascoin_held: 0, total_referrals: 847,
        });
        setLastUpdated(new Date());
        setError(null);
        setLoading(false);
        return;
      }

      const wallets = leaderRows.map((r: any) => r.wallet as string);

      // ── 2. GASCOIN balances from cache — replaces N live Helius calls ──
      // wallet_token_cache is updated by the payout worker and the
      // token-tier check on submission. One query instead of N RPC calls.
      const holdingsMap = new Map<string, number>();
      try {
        const { data: cacheRows } = await supabaseBrowser
          .from('wallet_token_cache')
          .select('wallet_address, gascoin_balance')
          .in('wallet_address', wallets);
        for (const row of cacheRows || []) {
          holdingsMap.set(row.wallet_address, Number(row.gascoin_balance || 0));
        }
      } catch {}

      // ── 3. Engagement points — single query, split in JS ──────────
      // All point sources in one round-trip; we split by source category below.
      const refMap = new Map<string, number>();
      const engMap = new Map<string, number>();
      const holdingsPointsMap = new Map<string, number>();
      try {
        const ALL_SOURCES = [
          'referral_conversion',
          'tweet_engagement',
          'submission_approved',
          'streak_bonus',
          'referral_passive',
          'holdings_bonus',
        ];
        const { data: allPoints } = await supabaseBrowser
          .from('engagement_points')
          .select('wallet, points, source')
          .in('source', ALL_SOURCES)
          .in('wallet', wallets);

        for (const row of allPoints || []) {
          const pts = Number(row.points || 0);
          if (row.source === 'referral_conversion') {
            refMap.set(row.wallet, (refMap.get(row.wallet) || 0) + pts);
          } else if (row.source === 'holdings_bonus') {
            holdingsPointsMap.set(row.wallet, (holdingsPointsMap.get(row.wallet) || 0) + pts);
          } else {
            // tweet_engagement, submission_approved, streak_bonus, referral_passive
            engMap.set(row.wallet, (engMap.get(row.wallet) || 0) + pts);
          }
        }
      } catch {}

      // ── 4. Build entries ───────────────────────────────────────────
      const raw: LeaderboardEntry[] = leaderRows.map((r: any) => {
        const gc = holdingsMap.get(r.wallet) || 0;
        const referrals = refMap.get(r.wallet) || 0;
        const engagement = engMap.get(r.wallet) || 0;
        const holdingsPts = holdingsPointsMap.get(r.wallet) || 0;
        const score = computeCompositeScore(holdingsPts, engagement, referrals);
        return {
          wallet_address: r.wallet as string,
          total_submissions: Number(r.payout_count),
          total_eth_earned: Number(r.total_eth),
          last_submission_at: r.last_at as string,
          rank: 0,
          gascoin_holdings: gc,
          composite_score: score,
          referral_count: referrals,
          engagement_score: engagement,
        };
      });

      raw.sort((a, b) => b.composite_score - a.composite_score);
      raw.forEach((e, i) => { e.rank = i + 1; });

      // ── 5. X handles + PFPs ────────────────────────────────────────
      try {
        const { data: xLinks } = await supabaseBrowser
          .from('wallet_x_links')
          .select('wallet, x_handle, profile_image_url')
          .eq('is_active', true)
          .in('wallet', wallets);
        const xMap = new Map(xLinks?.map((l: any) => [l.wallet, l]) || []);
        for (const entry of raw) {
          const link = xMap.get(entry.wallet_address) as any;
          if (link) {
            entry.x_handle = link.x_handle || undefined;
            entry.profile_image_url = link.profile_image_url || undefined;
          }
        }
      } catch {}

      // ── 6. Stats ───────────────────────────────────────────────────
      const totalPaid = leaderRows.reduce((s: number, r: any) => s + Number(r.total_eth || 0), 0);
      const totalApproved = leaderRows.reduce((s: number, r: any) => s + Number(r.payout_count || 0), 0);
      const largestWallet = Math.max(...leaderRows.map((r: any) => Number(r.total_eth || 0)));
      const totalGc = Array.from(holdingsMap.values()).reduce((s, v) => s + v, 0);
      const totalRefs = Array.from(refMap.values()).reduce((s, v) => s + v, 0);

      setEntries(raw);
      setStats({
        total_earners: leaderRows.length,
        total_eth_paid: totalPaid,
        total_approved: totalApproved,
        largest_single_refund: largestWallet,
        avg_refund_amount: totalApproved > 0 ? totalPaid / totalApproved : 0,
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
