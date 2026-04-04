'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Nav } from '../../components/Nav';
import { ReceiptCard, ReceiptSkeleton } from '../../components/community/ReceiptCard';
import { ReceiptModal } from '../../components/community/ReceiptModal';
import { FeedControls } from '../../components/community/FeedControls';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';
import { useCommunityStats } from '../../hooks/useCommunityStats';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';
import { formatSol } from '../../lib/formatters';
import type { CommunityReceipt, FeedFilter, FeedSort } from '../../types/community';

// Animated counter
function useAnimVal(target: number, dur = 1200) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (target <= 0) { setV(target); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, dur]);
  return v;
}

export default function CommunityPage() {
  const { publicKey } = useGascoinWallet();
  const connectedWallet = publicKey?.toBase58() ?? null;
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [sort, setSort] = useState<FeedSort>('newest');
  const [selected, setSelected] = useState<CommunityReceipt | null>(null);

  const { receipts, loading, loadingMore, error, hasMore, newCount, loadMore, flushNewReceipts } =
    useCommunityFeed(connectedWallet, filter, sort);
  const { stats, loading: statsLoading } = useCommunityStats();

  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  const aApproved = useAnimVal(stats?.total_approved ?? 0);
  const aPaid = useAnimVal(stats?.total_sol_paid ?? 0);
  const aStates = useAnimVal(stats?.unique_states ?? 0);
  const aAvg = useAnimVal(stats?.avg_refund_sol ?? 0);

  const handleConnectWallet = () => {
    // Trigger Solana wallet modal
    try {
      const { setVisible } = require('@solana/wallet-adapter-react-ui');
      setVisible(true);
    } catch {}
  };

  return (
    <div className="container">
      <Nav />

      {/* Zone 1 — Header */}
      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— Verified Gas Receipts · Proof of Payout</span>
        </div>
        <h1 className="lb-title">COMMUNITY</h1>
        <div className="lb-header__live">
          <span className="lb-pulse" />
          <span className="lb-live-label">LIVE FEED</span>
        </div>
      </header>

      {/* Zone 2 — Stats */}
      <div className="gc-stats">
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Verified Receipts</div>
            <div className="gc-stat-value">{statsLoading ? <div className="lb-skeleton" /> : Math.round(aApproved).toLocaleString()}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Total SOL Paid</div>
            <div className="gc-stat-value">{statsLoading ? <div className="lb-skeleton" /> : formatSol(aPaid)}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Regions Covered</div>
            <div className="gc-stat-value">{statsLoading ? <div className="lb-skeleton" /> : Math.round(aStates).toLocaleString()}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Avg Refund</div>
            <div className="gc-stat-value">{statsLoading ? <div className="lb-skeleton" /> : formatSol(aAvg)}</div>
          </div>
        </div>
      </div>

      {/* Zone 3 — Controls */}
      <FeedControls
        filter={filter}
        sort={sort}
        hasWallet={!!connectedWallet}
        onFilterChange={setFilter}
        onSortChange={setSort}
        onConnectWallet={handleConnectWallet}
      />

      {error && <div className="sf-error">{error}</div>}

      {/* Zone 4 — New receipts bar */}
      {newCount > 0 && (
        <div className="cf-new-bar" onClick={flushNewReceipts}>
          ↑ {newCount} new receipt{newCount > 1 ? 's' : ''} — click to load
        </div>
      )}

      {/* Zone 5 — Grid */}
      {loading ? (
        <div className="cf-grid">
          {Array.from({ length: 12 }).map((_, i) => <ReceiptSkeleton key={i} />)}
        </div>
      ) : receipts.length === 0 ? (
        <div className="lb-empty">
          <p>{filter === 'own' ? 'You have no approved receipts yet.' : 'No verified receipts yet.'}</p>
          <p style={{ fontSize: 12 }}>Be the first to submit and appear here.</p>
          <Link href="/submit" className="gc-teaser-link" style={{ marginTop: 16, display: 'inline-flex' }}>Submit Receipt</Link>
        </div>
      ) : (
        <div className="cf-grid">
          {receipts.map((r) => (
            <ReceiptCard key={r.id} receipt={r} onClick={() => setSelected(r)} />
          ))}
        </div>
      )}

      {/* Zone 6 — Load more */}
      {!loading && receipts.length > 0 && (
        <div className="cf-load-more">
          {hasMore ? (
            loadingMore ? (
              <span className="sf-spinner" />
            ) : (
              <button type="button" className="sf-btn-ghost" onClick={loadMore}>LOAD MORE</button>
            )
          ) : (
            <span className="cf-end-label">— All receipts shown —</span>
          )}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Modal */}
      <ReceiptModal receipt={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
