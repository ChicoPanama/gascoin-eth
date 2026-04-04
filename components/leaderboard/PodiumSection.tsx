'use client';

import type { LeaderboardEntry } from '../../types/leaderboard';
import { truncateWallet, formatSol, formatRank } from '../../lib/formatters';

export function PodiumSection({ entries, connectedWallet }: {
  entries: LeaderboardEntry[];
  connectedWallet: string | null;
}) {
  if (entries.length < 3) return null;

  // Podium order: rank 2 (left), rank 1 (center), rank 3 (right)
  const podium = [entries[1], entries[0], entries[2]];
  const heights = ['lb-podium-card--second', 'lb-podium-card--first', 'lb-podium-card--third'];

  return (
    <div className="lb-podium">
      {podium.map((e, i) => {
        const isYou = connectedWallet === e.wallet_address;
        return (
          <div
            key={e.wallet_address}
            className={`lb-podium-card ${heights[i]}${isYou ? ' lb-podium-card--you' : ''}`}
          >
            {isYou && <span className="lb-you-badge">YOU</span>}
            <div className="lb-podium-rank">{formatRank(e.rank)}</div>
            <div className="lb-podium-wallet">{truncateWallet(e.wallet_address)}</div>

            {/* Primary stats — what drives rank */}
            <div className="lb-podium-primary">
              <div className="lb-podium-primary-item">
                <span className="lb-podium-primary-value">{e.referral_count}</span>
                <span className="lb-podium-primary-label">Referrals</span>
              </div>
              <div className="lb-podium-primary-sep" />
              <div className="lb-podium-primary-item">
                <span className="lb-podium-primary-value">{e.engagement_score}</span>
                <span className="lb-podium-primary-label">Engagement</span>
              </div>
            </div>

            {/* Secondary stats */}
            <div className="lb-podium-secondary">
              {e.gascoin_holdings > 0
                ? `${Math.round(e.gascoin_holdings).toLocaleString()} GASCOIN`
                : '— GASCOIN'}
            </div>
            <div className="lb-podium-secondary">{formatSol(e.total_sol_earned)}</div>

            {/* Score */}
            <div className="lb-podium-score">Score {e.composite_score.toFixed(2)}</div>
          </div>
        );
      })}
    </div>
  );
}
