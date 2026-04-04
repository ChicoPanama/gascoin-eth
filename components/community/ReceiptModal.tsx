'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CommunityReceipt } from '../../types/community';
import { truncateWallet, formatSol } from '../../lib/formatters';

export function ReceiptModal({ receipt, onClose }: {
  receipt: CommunityReceipt | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (receipt) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [receipt]);

  if (!receipt && !closing) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  };

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(receipt?.wallet || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Location: city/state or city/country for overseas
  const location = receipt?.city && receipt?.state
    ? `${receipt.city}, ${receipt.state}`
    : receipt?.state || receipt?.city || 'Redacted';

  const fullDate = receipt?.receipt_date
    ? new Date(receipt.receipt_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  const submittedAgo = receipt?.created_at
    ? new Date(receipt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  if (!receipt) return null;

  return (
    <div className={`cf-modal-overlay${closing ? ' cf-modal-overlay--closing' : ''}`} onClick={handleClose}>
      <div className={`cf-modal${closing ? ' cf-modal--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cf-modal-header">
          <span className="cf-modal-title">Receipt Detail</span>
          <button type="button" className="cf-modal-close" onClick={handleClose}>✕</button>
        </div>

        {/* Body */}
        <div className="cf-modal-body">
          {/* Left — image */}
          <div className="cf-modal-image">
            {receipt.is_redacted ? (
              <div className="cf-card-placeholder" style={{ height: '100%' }}>Image redacted for privacy</div>
            ) : receipt.image_url ? (
              <img src={receipt.image_url} alt="Receipt" className="cf-modal-img" />
            ) : (
              <div className="cf-card-placeholder" style={{ height: '100%' }}>Image unavailable</div>
            )}
            <div className="cf-modal-image-note">
              Receipt image — sensitive details redacted by system
            </div>
          </div>

          {/* Right — details */}
          <div className="cf-modal-details">
            <div className="cf-modal-section-label">Submission Details</div>

            <div className="cf-modal-row">
              <span className="cf-modal-label">Wallet</span>
              <span className="cf-modal-value">
                {truncateWallet(receipt.wallet)}
                <button type="button" className="lb-drill-copy" onClick={copyWallet} style={{ marginLeft: 8 }}>
                  {copied ? 'COPIED ✓' : 'COPY'}
                </button>
              </span>
            </div>

            <div className="cf-modal-row cf-modal-row--sol">
              <span className="cf-modal-label">SOL Refunded</span>
              <span className="cf-modal-value-sol">{formatSol(receipt.sol_amount)}</span>
            </div>

            {receipt.receipt_usd != null && receipt.receipt_usd > 0 && (
              <div className="cf-modal-row">
                <span className="cf-modal-label">Receipt Total</span>
                <span className="cf-modal-value">${receipt.receipt_usd.toFixed(2)} USD</span>
              </div>
            )}

            <div className="cf-modal-row">
              <span className="cf-modal-label">Location</span>
              <span className="cf-modal-value">{location}</span>
            </div>

            <div className="cf-modal-row">
              <span className="cf-modal-label">Receipt Date</span>
              <span className="cf-modal-value">{fullDate}</span>
            </div>

            <div className="cf-modal-row">
              <span className="cf-modal-label">Submitted</span>
              <span className="cf-modal-value">{submittedAgo}</span>
            </div>

            <div className="cf-modal-row">
              <span className="cf-modal-label">Gates Passed</span>
              <span className="cf-modal-value cf-modal-gates">
                {receipt.gates_passed}/11
                {Array.from({ length: 11 }).map((_, i) => (
                  <span
                    key={i}
                    className={`cf-gate-dot${i < receipt.gates_passed ? ' cf-gate-dot--filled' : ''}`}
                  >
                    ●
                  </span>
                ))}
              </span>
            </div>

            <div className="cf-modal-row">
              <span className="cf-modal-label">Submission ID</span>
              <span className="cf-modal-value cf-modal-id">
                GC-{new Date(receipt.created_at).getFullYear()}-{receipt.id.slice(0, 5).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cf-modal-footer">
          <Link href="/submit" className="gc-teaser-link">Submit your own receipt</Link>
        </div>
      </div>
    </div>
  );
}
