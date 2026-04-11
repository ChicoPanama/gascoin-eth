"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import { GATES } from "../lib/gates";
import type { GateWithStats, GateStats, GateFailureReason } from "../types/gates";
import { DEMO_GATE_STATS } from "../lib/demo-data";

export function useGateStats() {
  const [gates, setGates] = useState<GateWithStats[]>(
    GATES.map((def) => ({ definition: def, stats: null, top_failures: [] }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, failuresRes] = await Promise.all([
        supabaseBrowser.from("gate_stats_view").select("*"),
        supabaseBrowser
          .from("gate_failure_reasons_view")
          .select("*")
          .order("occurrence_count", { ascending: false }),
      ]);

      // Views return gate_name (text) as gate_id — map by policyGate
      const rawStats = statsRes.data ?? [];
      const statsSource = rawStats.length > 0 ? rawStats : DEMO_GATE_STATS;
      const statsMap = new Map<string | number, GateStats>(
        statsSource.map((s: any) => [s.gate_id, s])
      );

      const failuresMap = new Map<string | number, GateFailureReason[]>();
      for (const f of (failuresRes.data ?? []) as any[]) {
        if (!failuresMap.has(f.gate_id)) failuresMap.set(f.gate_id, []);
        failuresMap.get(f.gate_id)!.push(f);
      }

      setGates(
        GATES.map((def) => ({
          definition: def,
          // Try policyGate (live DB data) then numeric id (demo data fallback)
          stats: statsMap.get(def.policyGate) ?? statsMap.get(def.id) ?? null,
          top_failures: (failuresMap.get(def.policyGate) ?? failuresMap.get(def.id) ?? []).slice(0, 3),
        }))
      );
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Gate stats fetch error:", err);
      setError("Failed to load gate statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const channel = supabaseBrowser
      .channel("gate-stats-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gate_results" },
        () => fetchStats()
      )
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [fetchStats]);

  return { gates, loading, error, lastUpdated, refetch: fetchStats };
}
