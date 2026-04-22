"use client";

import { useEffect, useState } from "react";
import type { CommunityStats } from "../types/community";
import { DEMO_COMMUNITY_STATS } from "../lib/demo-data";

const ETH_PRICE_DEMO_USD = 3000;

function demoStats(): CommunityStats {
  return {
    ...DEMO_COMMUNITY_STATS,
    total_usd_paid: DEMO_COMMUNITY_STATS.total_eth_paid * ETH_PRICE_DEMO_USD,
    avg_refund_usd: DEMO_COMMUNITY_STATS.avg_refund_eth * ETH_PRICE_DEMO_USD,
    eth_price_usd: ETH_PRICE_DEMO_USD,
  };
}

export function useCommunityStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/community/stats', { cache: 'no-store' });
        if (!res.ok) throw new Error('stats_fetch_failed');
        const realStats = await res.json();

        setStats(realStats.total_approved > 0 ? realStats : demoStats());
      } catch (err) {
        console.error('Stats fetch error:', err);
        setStats(demoStats());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}
