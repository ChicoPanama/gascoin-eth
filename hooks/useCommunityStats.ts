"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import type { CommunityStats } from "../types/community";
import { DEMO_COMMUNITY_STATS } from "../lib/demo-data";

export function useCommunityStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabaseBrowser
          .from('payouts')
          .select('amount_sol, wallet, claims(country)')
          .eq('status', 'paid');

        if (error) throw error;

        const total = (data || []).reduce((s: number, r: any) => s + Number(r.amount_sol || 0), 0);
        const countries = new Set(
          (data || []).map((r: any) => r.claims?.country).filter(Boolean)
        );

        const realStats = {
          total_approved: (data || []).length,
          total_sol_paid: total,
          unique_countries: countries.size,
          avg_refund_sol: (data || []).length > 0 ? total / (data || []).length : 0,
        };
        setStats(realStats.total_approved > 0 ? realStats : DEMO_COMMUNITY_STATS);
      } catch (err) {
        console.error('Stats fetch error:', err);
        setStats(DEMO_COMMUNITY_STATS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}
