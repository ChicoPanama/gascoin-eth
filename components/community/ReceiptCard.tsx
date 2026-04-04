'use client';

import { useState } from 'react';
import type { CommunityReceipt } from '../../types/community';
import { truncateWallet, formatSol } from '../../lib/formatters';

export function ReceiptCard({ receipt, onClick }: {
  receipt: CommunityReceipt;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  const location = receipt.city && receipt.state
    ? `${receipt.city}, ${receipt.state}`
    : receipt.state || receipt.city || 'Location redacted';

  const date = receipt.receipt_date
    ? new Date(receipt.receipt_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="cf-card" onClick={onClick}>
      {/* Badges */}
      {receipt.is_own && <span className="cf-badge cf-badge--own">YOURS</span>}
      {receipt.is_featured && <span className="cf-badge cf-badge--featured">★ FEATURED</span>}

      {/* Image zone */}
      <div className="cf-card-image">
        {receipt.is_redacted ? (
          <div className="cf-card-placeholder">Image redacted for privacy</div>
        ) : receipt.image_url && !imgError ? (
          <>
            <img
              src={receipt.image_url}
              alt="Gas receipt"
              className="cf-card-img"
              onError={() => setImgError(true)}
            />
            <div className="cf-card-hover-overlay">VIEW DETAILS →</div>
          </>
        ) : (
          <div className="cf-card-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="0" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span>Image unavailable</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="cf-card-body">
        <div className="cf-card-top">
          <span className="cf-card-location">{location}</span>
          <span className="cf-card-date">{date}</span>
        </div>

        <div className="cf-card-sol">{formatSol(receipt.sol_amount)}</div>

        {receipt.receipt_usd != null && receipt.receipt_usd > 0 && (
          <div className="cf-card-usd">${receipt.receipt_usd.toFixed(2)} receipt</div>
        )}

        <div className="cf-card-bottom">
          <span className="cf-card-wallet">{truncateWallet(receipt.wallet)}</span>
          <span className="cf-card-gates">
            {receipt.gates_passed}/11
            <span className="cf-gate-dot cf-gate-dot--filled">●</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReceiptSkeleton() {
  return (
    <div className="cf-card cf-card--skeleton">
      <div className="cf-card-image"><div className="lb-shimmer" style={{ width: '100%', height: '100%' }} /></div>
      <div className="cf-card-body">
        <div className="lb-shimmer" style={{ width: '60%', height: 12, marginBottom: 8 }} />
        <div className="lb-shimmer" style={{ width: '40%', height: 28, marginBottom: 8 }} />
        <div className="lb-shimmer" style={{ width: '50%', height: 12 }} />
      </div>
    </div>
  );
}
