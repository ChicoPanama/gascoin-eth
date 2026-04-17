'use client';

import { useEffect, useState } from 'react';

type PointsSummary = {
  stats: {
    total_points: number;
    unique_wallets: number;
    points_today: number;
    pending_points: number;
  };
  by_source: Array<{ source: string; points: number }>;
  daily: Array<{ day: string; points: number }>;
  recent: Array<{ wallet: string; source: string; points: number; created_at: string }>;
};

const SOURCE_LABELS: Record<string, string> = {
  tweet_engagement: 'TWEET ENGAGEMENT',
  submission: 'SUBMISSION',
  referral_passive: 'REFERRAL PASSIVE',
  streak: 'STREAK',
  holdings_daily: 'HOLDINGS DAILY',
  pending_tweet: 'PENDING TWEET',
  pending_submission: 'PENDING SUBMISSION',
  pending_referral: 'PENDING REFERRAL',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function PointsDashboard() {
  const [data, setData] = useState<PointsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/public/points-summary')
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error || 'fetch_failed');
        setData(json);
      })
      .catch((e) => setError(e.message || 'load_failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(var(--fg-rgb),0.3)', textAlign: 'center', letterSpacing: '0.2em' }}>
        LOADING POINTS ENGINE…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px 0', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--status-fail)', textAlign: 'center' }}>
        {error || 'No data'}
      </div>
    );
  }

  const { stats, by_source, daily, recent } = data;

  const dailyMax = Math.max(1, ...daily.map((d) => d.points));
  const dailyMin = Math.min(...daily.map((d) => d.points), dailyMax);
  const sourceMax = Math.max(1, ...by_source.map((s) => s.points));

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Stats strip */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="gc-stat">
            <div className="gc-stat-label">TOTAL POINTS</div>
            <div className="gc-stat-value">{fmt(stats.total_points)}</div>
            <div className="gc-stat-sub">all time awarded</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">WALLETS EARNING</div>
            <div className="gc-stat-value">{stats.unique_wallets.toLocaleString()}</div>
            <div className="gc-stat-sub">unique recipients</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">POINTS TODAY</div>
            <div className="gc-stat-value" style={{ color: stats.points_today > 0 ? 'var(--status-info)' : 'inherit' }}>
              {fmt(stats.points_today)}
            </div>
            <div className="gc-stat-sub">since midnight UTC</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">PENDING REVIEW</div>
            <div className="gc-stat-value" style={{ color: stats.pending_points > 0 ? 'rgba(255,200,80,0.85)' : 'inherit' }}>
              {fmt(stats.pending_points)}
            </div>
            <div className="gc-stat-sub">awaiting confirmation</div>
          </div>
        </div>
      </div>

      {/* Daily bar chart */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
          POINTS AWARDED · LAST 30 DAYS
        </div>
        <div style={{ border: '1px solid var(--line)', padding: 16, background: 'rgba(var(--fg-rgb), 0.02)' }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 100 }}>
            {daily.map((d, i) => {
              const range = dailyMax - dailyMin || 1;
              const pct = (d.points - dailyMin) / range;
              return (
                <div
                  key={i}
                  title={`${d.day}\n${fmt(d.points)} pts`}
                  style={{
                    flex: 1,
                    height: `${Math.max(d.points > 0 ? 8 : 3, pct * 80 + 4)}px`,
                    background: d.points > 0 ? 'var(--status-info)' : 'rgba(var(--fg-rgb),0.08)',
                    transition: 'height 0.3s ease',
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'var(--text-tertiary)' }}>
            <span>oldest · {daily[0]?.day ?? '—'}</span>
            <span>peak {fmt(dailyMax)} pts</span>
            <span>newest · {daily[daily.length - 1]?.day ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Points by source */}
      {by_source.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
            POINTS BY SOURCE
          </div>
          <div style={{ border: '1px solid var(--line)', background: 'rgba(var(--fg-rgb), 0.02)' }}>
            {by_source.map((s) => {
              const pct = (s.points / sourceMax) * 100;
              const isPending = s.source.startsWith('pending_');
              return (
                <div
                  key={s.source}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--line)',
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: isPending ? 'rgba(255,200,80,0.8)' : 'var(--fg)' }}>
                      {SOURCE_LABELS[s.source] ?? s.source.toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{fmt(s.points)}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(var(--fg-rgb),0.06)', borderRadius: 2 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: isPending ? 'rgba(255,200,80,0.5)' : 'var(--status-info)',
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent awards table */}
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
        RECENT AWARDS
      </div>
      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>WALLET</th>
              <th>SOURCE</th>
              <th>POINTS</th>
              <th>TIME</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={4} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(var(--fg-rgb),0.25)', textAlign: 'center' }}>
                  No points awarded yet.
                </td>
              </tr>
            ) : (
              recent.map((row, i) => {
                const isPending = String(row.source || '').startsWith('pending_');
                const sourceLabel = SOURCE_LABELS[row.source] ?? row.source?.toUpperCase() ?? '—';
                const wallet = row.wallet ?? '—';
                const ago = (() => {
                  const ms = Date.now() - new Date(row.created_at).getTime();
                  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
                  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
                  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
                  return new Date(row.created_at).toLocaleDateString();
                })();
                return (
                  <tr key={i} className="lb-table-row">
                    <td className="lb-table-wallet">
                      {wallet.length > 8 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet}
                    </td>
                    <td className="lb-table-time">
                      <span style={{ color: isPending ? 'rgba(255,200,80,0.8)' : 'var(--status-info)' }}>
                        {sourceLabel}
                      </span>
                    </td>
                    <td className="lb-table-sol" style={{ color: 'var(--fg)' }}>
                      +{fmt(Number(row.points || 0))}
                    </td>
                    <td className="lb-table-time" style={{ color: 'var(--text-tertiary)' }}>
                      {ago}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
