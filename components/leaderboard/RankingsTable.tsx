'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LeaderboardEntry } from '../../types/leaderboard';
import { truncateWallet, formatRank } from '../../lib/formatters';

const PAGE_SIZE = 25;

function UserCell({ entry, isYou }: { entry: LeaderboardEntry; isYou: boolean }) {
  const avatar = entry.profile_image_url ? (
    <img
      src={entry.profile_image_url}
      alt=""
      width={24}
      height={24}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        border: '1px solid var(--glass-border)',
        flexShrink: 0,
      }}
    />
  ) : null;

  const display = entry.x_handle ? (
    <a
      href={`https://x.com/${entry.x_handle}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--fg)', textDecoration: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      @{entry.x_handle} <span style={{ fontSize: 9, opacity: 0.4 }}>↗</span>
    </a>
  ) : (
    truncateWallet(entry.wallet_address)
  );

  return (
    <td className="lb-table-wallet">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {avatar}
        {display}
        {isYou && <span className="lb-you-badge lb-you-badge--inline">YOU</span>}
      </span>
    </td>
  );
}

export function RankingsTable({ entries, loading, connectedWallet, onRowClick }: {
  entries: LeaderboardEntry[];
  loading: boolean;
  connectedWallet: string | null;
  onRowClick: (wallet: string) => void;
}) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const paged = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showingFrom = page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, entries.length);

  if (!loading && entries.length === 0) {
    return (
      <div className="lb-empty">
        <p>No verified submissions yet. Be the first.</p>
        <Link href="/submit" className="gc-teaser-link">Submit Receipt</Link>
      </div>
    );
  }

  return (
    <div className="lb-table-wrap">
      <table className="lb-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Points</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Loading rankings...</td></tr>
          ) : (
            paged.map((e) => {
              const isYou = connectedWallet === e.wallet_address;
              return (
                <tr
                  key={e.wallet_address}
                  className={`lb-table-row${isYou ? ' lb-table-row--you' : ''}${e.rank <= 3 ? ' lb-table-row--top3' : ''}`}
                  onClick={() => onRowClick(e.wallet_address)}
                >
                  <td className="lb-table-rank">{formatRank(e.rank)}</td>
                  <UserCell entry={e} isYou={isYou} />
                  <td className="lb-table-score">{Math.round(e.composite_score).toLocaleString()}</td>
                  <td className="lb-table-action">VIEW →</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {!loading && entries.length > PAGE_SIZE && (
        <div className="lb-pagination">
          <button
            type="button"
            className="sf-btn-ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← PREV
          </button>
          <span className="lb-pagination-info">
            Showing {showingFrom}–{showingTo} of {entries.length} earners
          </span>
          <button
            type="button"
            className="sf-btn-ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
}
