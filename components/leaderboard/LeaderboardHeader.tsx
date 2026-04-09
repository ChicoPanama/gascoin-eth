'use client';

import { timeAgo } from '../../lib/formatters';

export function LeaderboardHeader({ lastUpdated }: { lastUpdated: Date | null }) {
  return (
    <header className="lb-header">
      <div className="lb-header__meta">
        <span className="lb-tag">— Verified Earners Only</span>
      </div>
      <h1 className="lb-title lb-title--iconed">
        <span className="lb-title-icon-wrap" aria-hidden>
          <img src="/icons/leaderboard-crown.jpg" alt="" className="lb-title-icon" />
        </span>
        LEADERBOARD
      </h1>
      <div className="lb-header__live">
        <span className="lb-pulse" />
        <span className="lb-live-label">
          LIVE · Updated {lastUpdated ? timeAgo(lastUpdated) : '—'}
        </span>
      </div>
    </header>
  );
}
