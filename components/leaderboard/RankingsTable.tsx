'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LeaderboardEntry } from '../../types/leaderboard';
import { truncateWallet, formatSol, formatRank } from '../../lib/formatters';

const PAGE_SIZE = 25;

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="lb-table-row lb-table-row--skeleton">
          <td><div className="lb-shimmer" style={{ width: 32 }} /></td>
          <td><div className="lb-shimmer" style={{ width: 90 }} /></td>
          <td><div className="lb-shimmer" style={{ width: 50 }} /></td>
          <td><div className="lb-shimmer" style={{ width: 50 }} /></td>
          <td><div className="lb-shimmer" style={{ width: 70 }} /></td>
          <td><div className="lb-shimmer" style={{ width: 60 }} /></td>
          <td><div className="lb-shimmer" style={{ width: 44 }} /></td>
          <td><div className="lb-shimmer" style={{ width: 36 }} /></td>
        </tr>
      ))}
    </>
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
      <div className="lb-score-legend">
        Ranked by referrals, engagement, and GASCOIN holdings · SOL payouts are for receipts only
      </div>

      <table className="lb-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Wallet</th>
            <th>Refs <span className="lb-weight">35%</span></th>
            <th>Eng <span className="lb-weight">30%</span></th>
            <th>GASCOIN <span className="lb-weight">25%</span></th>
            <th>SOL <span className="lb-weight">10%</span></th>
            <th>Score</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Loading rankings...</td></tr>
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
                  <td className="lb-table-wallet">
                    {truncateWallet(e.wallet_address)}
                    {isYou && <span className="lb-you-badge lb-you-badge--inline">YOU</span>}
                  </td>
                  <td className="lb-table-ref">{e.referral_count || '—'}</td>
                  <td className="lb-table-eng">{e.engagement_score || '—'}</td>
                  <td className="lb-table-gc">
                    {e.gascoin_holdings > 0 ? Math.round(e.gascoin_holdings).toLocaleString() : '—'}
                  </td>
                  <td className="lb-table-sol">{formatSol(e.total_sol_earned)}</td>
                  <td className="lb-table-score">{e.composite_score.toFixed(2)}</td>
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
