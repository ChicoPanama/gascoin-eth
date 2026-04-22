"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "../lib/supabase-client";
import type { LeaderboardEntry, LeaderboardStats } from "../types/leaderboard";
import { DEMO_LEADERBOARD } from "../lib/demo-data";

// Composite score: 55% Holdings points + 25% Engagement + 20% Referrals
// Holdings-dominant: whales hold the price, they ARE the ecosystem.
function computeCompositeScore(holdingsPoints: number, engagement: number, referrals: number): number {
  return (holdingsPoints * 0.55) + (engagement * 0.25) + (referrals * 0.20);
}

type LeaderboardPayload = {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats | null;
  lastUpdated: Date;
};

async function fetchLeaderboardPayload(): Promise<LeaderboardPayload> {
  const { data: leaderRows, error: lbErr } = await supabaseBrowser
    .rpc('get_leaderboard_data', { lim: 100 });

  if (lbErr) throw lbErr;

  if (!leaderRows || leaderRows.length === 0) {
    return {
      entries: DEMO_LEADERBOARD.map((d: any) => ({
        wallet_address: d.wallet_address,
        total_submissions: d.total_submissions ?? 1,
        total_eth_earned: d.total_eth_earned,
        rank: d.rank,
        gascoin_holdings: 0,
        composite_score: d.composite_score ?? d.total_eth_earned * 100,
        referral_count: 0,
        engagement_score: 0,
        x_handle: d.x_handle,
      })) as LeaderboardEntry[],
      stats: {
        total_earners: 10, total_eth_paid: 4821.5, total_approved: 36,
        largest_single_refund: 2.847, avg_refund_amount: 0.38,
        total_gascoin_held: 0, total_referrals: 847,
      },
      lastUpdated: new Date(),
    };
  }

  const wallets = leaderRows.map((r: any) => r.wallet as string);

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
        engMap.set(row.wallet, (engMap.get(row.wallet) || 0) + pts);
      }
    }
  } catch {}

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

  const totalPaid = leaderRows.reduce((s: number, r: any) => s + Number(r.total_eth || 0), 0);
  const totalApproved = leaderRows.reduce((s: number, r: any) => s + Number(r.payout_count || 0), 0);
  const largestWallet = Math.max(...leaderRows.map((r: any) => Number(r.total_eth || 0)));
  const totalGc = Array.from(holdingsMap.values()).reduce((s, v) => s + v, 0);
  const totalRefs = Array.from(refMap.values()).reduce((s, v) => s + v, 0);

  return {
    entries: raw,
    stats: {
      total_earners: leaderRows.length,
      total_eth_paid: totalPaid,
      total_approved: totalApproved,
      largest_single_refund: largestWallet,
      avg_refund_amount: totalApproved > 0 ? totalPaid / totalApproved : 0,
      total_gascoin_held: totalGc,
      total_referrals: totalRefs,
    },
    lastUpdated: new Date(),
  };
}

const LEADERBOARD_KEY = ['leaderboard', 'v1'] as const;

export function useLeaderboard() {
  const qc = useQueryClient();

  const query = useQuery<LeaderboardPayload, Error>({
    queryKey: LEADERBOARD_KEY,
    queryFn: fetchLeaderboardPayload,
    // Leaderboard changes on payout — Realtime triggers invalidation, so a
    // 60s stale window is safe and stops tab-switch / remount refetches.
    staleTime: 60_000,
    // Keep the last result on screen while refetching so the UI doesn't
    // flash to a loading state on every invalidation.
    placeholderData: (prev) => prev,
    retry: 1,
  });

  useEffect(() => {
    // Realtime subscription busts the cache — the authoritative "new payout
    // just landed" signal. TanStack will refetch in the background and swap
    // the data in without tearing the UI.
    const channel = supabaseBrowser
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payouts" },
        () => { qc.invalidateQueries({ queryKey: LEADERBOARD_KEY }); }
      )
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [qc]);

  return {
    entries: query.data?.entries ?? [],
    stats: query.data?.stats ?? null,
    loading: query.isPending,
    error: query.error ? "Failed to load leaderboard data." : null,
    lastUpdated: query.data?.lastUpdated ?? null,
    refetch: () => qc.invalidateQueries({ queryKey: LEADERBOARD_KEY }),
  };
}
