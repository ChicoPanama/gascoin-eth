'use client';

import type { LeaderboardEntry } from '../../types/leaderboard';
import { truncateWallet, formatRank } from '../../lib/formatters';

function UserAvatar({ entry, size = 48 }: { entry: LeaderboardEntry; size?: number }) {
  if (entry.profile_image_url) {
    return (
      <img
        src={entry.profile_image_url}
        alt={entry.x_handle ? `@${entry.x_handle}` : 'User'}
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--glass-border)' }}
      />
    );
  }
  // Gradient circle fallback — deterministic color from wallet
  const hash = entry.wallet_address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, hsl(${hue1}, 60%, 45%), hsl(${hue2}, 50%, 35%))`,
        border: '2px solid var(--glass-border)',
        flexShrink: 0,
      }}
    />
  );
}

function UserIdentity({ entry }: { entry: LeaderboardEntry }) {
  if (entry.x_handle) {
    return (
      <a
        href={`https://x.com/${entry.x_handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="lb-podium-wallet"
        style={{ color: 'var(--fg)', textDecoration: 'none' }}
      >
        @{entry.x_handle} <span style={{ fontSize: 10, opacity: 0.4 }}>↗</span>
      </a>
    );
  }
  return <div className="lb-podium-wallet">{truncateWallet(entry.wallet_address)}</div>;
}

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
            <div style={{ margin: '12px 0' }}>
              <UserAvatar entry={e} size={i === 1 ? 56 : 44} />
            </div>
            <UserIdentity entry={e} />
            <div className="lb-podium-score" style={{ marginTop: 16 }}>
              {Math.round(e.composite_score).toLocaleString()} Points
            </div>
          </div>
        );
      })}
    </div>
  );
}
