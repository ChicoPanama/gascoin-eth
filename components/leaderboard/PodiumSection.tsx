'use client';

import { useState } from 'react';
import type { LeaderboardEntry } from '../../types/leaderboard';
import { truncateWallet, formatRank } from '../../lib/formatters';

function PodiumArt({ rank }: { rank: number }) {
  const candidates = [
    `/leaderboard/podium-hero-${rank}.jpg`,
    `/leaderboard/podium-hero-${rank}.png`,
    `/leaderboard/podium-rank-${rank}.png`,
  ];
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];

  if (!src) return <div className="lb-podium-art-fallback">{formatRank(rank)}</div>;

  return (
    <img
      src={src}
      alt={`Podium rank ${rank}`}
      className="lb-podium-art-image"
      onError={() => setIdx((v) => v + 1)}
    />
  );
}

function UserAvatar({ entry, size = 48 }: { entry: LeaderboardEntry; size?: number }) {
  if (entry.profile_image_url) {
    return (
      <img
        src={entry.profile_image_url}
        alt={entry.x_handle ? `@${entry.x_handle}` : 'User'}
        width={size}
        height={size}
        className="lb-podium-avatar"
        style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--glass-border)' }}
      />
    );
  }
  // Fixed green spotlight fallback to match leaderboard visual style
  return (
    <div
      className="lb-podium-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #8AE25A 0%, #55B83A 100%)',
        border: '4px solid #1f2126',
        boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
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
        className="lb-podium-handle"
        style={{ color: 'var(--fg)', textDecoration: 'none' }}
      >
        @{entry.x_handle}
      </a>
    );
  }
  return <div className="lb-podium-handle">{truncateWallet(entry.wallet_address)}</div>;
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
            <div className="lb-podium-art-wrap">
              <PodiumArt rank={e.rank} />
              {e.rank !== 1 && <div className="lb-podium-rank-badge">{formatRank(e.rank)}</div>}
            </div>

            <div className="lb-podium-identity-row">
              <UserAvatar entry={e} size={88} />
              <div>
                <UserIdentity entry={e} />
                <div className="lb-podium-points">{Math.round(e.composite_score).toLocaleString()} points</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
