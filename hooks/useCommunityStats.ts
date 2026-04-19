"use client";

import { useEffect, useState } from "react";
import type { CommunityStats } from "../types/community";
import { DEMO_COMMUNITY_STATS } from "../lib/demo-data";

export function useCommunityStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/community/stats', { cache: 'no-store' });
        if (!res.ok) throw new Error('stats_fetch_failed');
        const realStats = await res.json();

        setStats(realStats.total_approved > 0
          ? realStats
          : {
              ...DEMO_COMMUNITY_STATS,
              total_usdc_paid: DEMO_COMMUNITY_STATS.total_eth_paid * 170,
              avg_refund_usdc: DEMO_COMMUNITY_STATS.avg_refund_sol * 170,
              sol_price_usd: 170,
            });
      } catch (err) {
        console.error('Stats fetch error:', err);
        setStats({
          ...DEMO_COMMUNITY_STATS,
          total_usdc_paid: DEMO_COMMUNITY_STATS.total_eth_paid * 170,
          avg_refund_usdc: DEMO_COMMUNITY_STATS.avg_refund_sol * 170,
          sol_price_usd: 170,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}
