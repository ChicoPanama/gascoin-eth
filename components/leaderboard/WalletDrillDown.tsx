'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWalletHistory } from '../../hooks/useWalletHistory';
import { formatSol, timeAgo } from '../../lib/formatters';

export function WalletDrillDown({ wallet, onClose }: {
  wallet: string | null;
  onClose: () => void;
}) {
  const { history, loading } = useWalletHistory(wallet);
  const [copied, setCopied] = useState(false);

  if (!wallet) return null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const total = history.reduce((s, h) => s + h.sol_amount, 0);

  return (
    <div className="lb-drill-overlay" onClick={onClose}>
      <div className="lb-drill" onClick={(e) => e.stopPropagation()}>
        <div className="lb-drill-header">
          <div>
            <h2 className="lb-drill-title">Wallet History</h2>
            <div className="lb-drill-addr">{wallet}</div>
            <button type="button" className="lb-drill-copy" onClick={copyAddress}>
              {copied ? 'COPIED ✓' : 'COPY ADDRESS'}
            </button>
          </div>
          <button type="button" className="lb-drill-close" onClick={onClose}>✕</button>
        </div>

        <div className="lb-drill-body">
          {loading ? (
            <div className="lb-drill-loading">Loading...</div>
          ) : history.length === 0 ? (
            <div className="lb-drill-empty">No verified submissions found.</div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="lb-drill-item">
                <div className="lb-drill-date">
                  {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="lb-drill-amount">{formatSol(h.sol_amount)}</div>
                <div className="lb-drill-gates">{h.gates_passed}/10 GATES</div>
                <div className="lb-drill-id">
                  GC-{new Date(h.created_at).getFullYear()}-{h.id.slice(0, 5).toUpperCase()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lb-drill-footer">
          <span className="lb-drill-total">Total Earned: {formatSol(total)}</span>
          <Link href="/submit" className="gc-teaser-link">Submit Receipt</Link>
        </div>
      </div>
    </div>
  );
}
