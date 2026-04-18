'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase-client';
import { truncateWallet, formatSol, formatRank } from '../../lib/formatters';
import type { LeaderboardEntry } from '../../types/leaderboard';
import { DEMO_LEADERBOARD } from '../../lib/demo-data';

export function LeaderboardTeaser() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseBrowser
          .from('leaderboard_view')
          .select('*')
          .order('rank', { ascending: true })
          .limit(5);
        const rows = data ?? [];
        setEntries(rows.length > 0 ? rows : DEMO_LEADERBOARD as any);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <section className="lb-teaser">
      <div className="lb-teaser-inner">
        <div className="lb-teaser-left">
          <div className="gc-section-num">03 — Top Earners</div>
          <h2 className="lb-teaser-title">Who&apos;s Leading</h2>
          <p className="lb-teaser-sub">
            Real-time rankings of verified ETH refund earners.
          </p>
        </div>
        <div className="lb-teaser-right glass-card" style={{ padding: 24 }}>
          <table className="lb-mini-table">
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="lb-shimmer" style={{ width: 20 }} /></td>
                      <td><div className="lb-shimmer" style={{ width: 80 }} /></td>
                      <td><div className="lb-shimmer" style={{ width: 70 }} /></td>
                    </tr>
                  ))
                : entries.map((e) => (
                    <tr key={e.wallet_address}>
                      <td className="lb-mini-rank">{formatRank(e.rank)}</td>
                      <td className="lb-mini-wallet">{truncateWallet(e.wallet_address)}</td>
                      <td className="lb-mini-sol">{formatSol(e.total_sol_earned)}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          <Link href="/leaderboard" className="gc-teaser-link" style={{ marginTop: 20, display: 'inline-flex' }}>
            View full leaderboard
          </Link>
        </div>
      </div>
    </section>
  );
}
