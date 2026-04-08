'use client';

import { useState, useEffect, useRef } from 'react';
import type { LeaderboardStats as Stats } from '../../types/leaderboard';

function useAnimatedValue(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) { setDisplay(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

function Skeleton() {
  return <div className="lb-skeleton" />;
}

export function LeaderboardStatsStrip({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const referrals = useAnimatedValue(stats?.total_referrals ?? 0);
  const earners = useAnimatedValue(stats?.total_earners ?? 0);

  const cards = [
    { label: 'Total Referrals', value: stats ? (referrals > 0 ? Math.round(referrals).toLocaleString() : '—') : null },
    { label: 'Active Earners', value: stats ? Math.round(earners).toLocaleString() : null },
  ];

  return (
    <div className="gc-stats">
      <div className="gc-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {cards.map((c) => (
          <div key={c.label} className="gc-stat">
            <div className="gc-stat-label">{c.label}</div>
            <div className="gc-stat-value">
              {loading ? <Skeleton /> : (c.value ?? '—')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
