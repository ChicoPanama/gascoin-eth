'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Nav } from '../Nav';
import { WalletButton } from '../ui/WalletButton';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';
import { useWalletTracker } from '../../hooks/useWalletTracker';
import { useCooldownTimer } from '../../hooks/useCooldownTimer';
import { truncateWallet, formatSol, timeAgo } from '../../lib/formatters';
import { GATES } from '../../lib/gates';
import type { WalletSubmission, HistoryFilter } from '../../types/wallet-tracker';

function useAnimVal(target: number, dur = 1000) {
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

function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

const PAGE_SIZE = 10;

export function WalletTrackerClient({ initialLookupAddress }: { initialLookupAddress: string | null }) {
  const { address: connectedWallet } = useGascoinWallet();

  const [lookupInput, setLookupInput] = useState(initialLookupAddress || '');
  const [lookupAddress, setLookupAddress] = useState<string | null>(initialLookupAddress);
  const [histFilter, setHistFilter] = useState<HistoryFilter>('all');
  const [histPage, setHistPage] = useState(0);
  const [expandedRejection, setExpandedRejection] = useState<string | null>(null);

  const { mode, address, summary, submissions, cooldown, loading, error, reset } =
    useWalletTracker(connectedWallet, lookupAddress);

  const timer = useCooldownTimer(cooldown);

  const aEarned = useAnimVal(summary?.total_sol_earned ?? 0);
  const aApproved = useAnimVal(summary?.total_approved ?? 0);
  const aPending = useAnimVal(summary?.total_pending ?? 0);
  const aRejected = useAnimVal(summary?.total_rejected ?? 0);

  const inputValid = isValidEthAddress(lookupInput);

  const doLookup = () => {
    if (!inputValid) return;
    setLookupAddress(lookupInput);
  };

  const doClear = () => {
    setLookupInput('');
    setLookupAddress(null);
    reset();
  };

  // Filter submissions
  const filtered = histFilter === 'all' ? submissions : submissions.filter((s) => {
    if (histFilter === 'approved') return s.status === 'approved' || s.status === 'paid';
    if (histFilter === 'pending') return ['submitted', 'auto_review', 'needs_manual_review'].includes(s.status);
    if (histFilter === 'rejected') return s.status === 'rejected';
    return true;
  });

  const paged = filtered.slice(histPage * PAGE_SIZE, (histPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Active pending submission
  const pendingSubs = submissions.filter((s) => ['submitted', 'auto_review', 'needs_manual_review'].includes(s.status));
  const [activeIdx, setActiveIdx] = useState(0);
  const activeSub = pendingSubs[activeIdx] || null;

  return (
    <div className="container">
      <Nav />

      {/* Zone 1 — Header */}
      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— Personal Submission Status · Live Gate Tracking</span>
        </div>
        <h1 className="lb-title lb-title--iconed wt-title-singleline">
          <span className="lb-title-icon-wrap" aria-hidden>
            <img src="/icons/wallet-tracker-wallet.jpg" alt="" className="lb-title-icon" />
          </span>
          WALLET TRACKER
        </h1>
        <p className="gt-header-body">
          Connect your wallet or paste any Ethereum address to see submission status,
          gate progress, payout history, and cooldown status in real time.
        </p>
      </header>

      {error && <div className="sf-error" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Zone 2 — Input Panel */}
      {mode === 'idle' ? (
        <div className="wt-input-panel">
          <div className="wt-input-left">
            <div className="wt-input-label">Connect Your Wallet</div>
            <WalletButton />
            <div className="wt-input-hint">See your full history including pending and rejected submissions</div>
          </div>
          <div className="wt-input-or">OR</div>
          <div className="wt-input-right">
            <div className="wt-input-label">Lookup Any Address</div>
            <div className="wt-lookup-row">
              <input
                type="text"
                className="wt-lookup-input"
                placeholder="Enter Ethereum wallet address..."
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLookup()}
              />
              {lookupInput.length > 5 && (
                <span className={`wt-valid-icon${inputValid ? ' wt-valid-icon--ok' : ''}`}>
                  {inputValid ? '✓' : '✗'}
                </span>
              )}
            </div>
            <button type="button" className="sf-btn-solid" disabled={!inputValid} onClick={doLookup} style={{ marginTop: 8 }}>
              LOOKUP &rarr;
            </button>
            <div className="wt-input-hint">Shows approved submissions only</div>
          </div>
        </div>
      ) : mode === 'connected' ? (
        <div className="wt-connected-bar">
          <div className="wt-connected-left">
            <span className="wt-badge-connected">CONNECTED</span>
            <span className="wt-connected-addr">{truncateWallet(address || '')}</span>
          </div>
          <div className="wt-connected-right">
            <span className="wt-connected-bal">
              {solBalance != null ? `${solBalance.toFixed(4)} SOL` : '— SOL'}
            </span>
            <button type="button" className="wt-disconnect" onClick={() => disconnect()}>DISCONNECT</button>
          </div>
        </div>
      ) : (
        <div className="wt-connected-bar">
          <div className="wt-connected-left">
            <span className="wt-badge-lookup">VIEWING</span>
            <span className="wt-connected-addr">{truncateWallet(address || '')}</span>
          </div>
          <div className="wt-connected-right">
            <span className="wt-approved-only">APPROVED ONLY</span>
            <button type="button" className="wt-disconnect" onClick={doClear}>CLEAR</button>
          </div>
        </div>
      )}

      {/* Zone 3 — Summary Cards */}
      {mode !== 'idle' && (
        <div className="gc-stats" style={{ marginTop: 24 }}>
          <div className="gc-stats-grid">
            <div className="gc-stat">
              <div className="gc-stat-label">Total Earned</div>
              <div className="gc-stat-value">{loading ? <div className="lb-skeleton" /> : formatSol(aEarned)}</div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Approved</div>
              <div className="gc-stat-value">{loading ? <div className="lb-skeleton" /> : Math.round(aApproved)}</div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Pending</div>
              <div className="gc-stat-value" style={aPending > 0 ? { animation: 'subtlePulse 2s infinite' } : undefined}>
                {loading ? <div className="lb-skeleton" /> : mode === 'connected' ? Math.round(aPending) : '—'}
              </div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Rejected</div>
              <div className="gc-stat-value">
                {loading ? <div className="lb-skeleton" /> : mode === 'connected' ? Math.round(aRejected) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone 4 — Cooldown */}
      {mode === 'connected' && cooldown && (
        cooldown.in_cooldown && !timer.expired ? (
          <div className="wt-cooldown wt-cooldown--active">
            <div className="wt-cooldown-left">
              <div className="wt-cooldown-label">COOLDOWN ACTIVE</div>
              <div className="wt-cooldown-timer">
                <div className="wt-cooldown-unit"><span className="wt-cooldown-num">{String(timer.days).padStart(2, '0')}</span><span className="wt-cooldown-unit-label">D</span></div>
                <span className="wt-cooldown-sep">:</span>
                <div className="wt-cooldown-unit"><span className="wt-cooldown-num">{String(timer.hours).padStart(2, '0')}</span><span className="wt-cooldown-unit-label">H</span></div>
                <span className="wt-cooldown-sep">:</span>
                <div className="wt-cooldown-unit"><span className="wt-cooldown-num">{String(timer.minutes).padStart(2, '0')}</span><span className="wt-cooldown-unit-label">M</span></div>
                <span className="wt-cooldown-sep">:</span>
                <div className="wt-cooldown-unit"><span className="wt-cooldown-num">{String(timer.seconds).padStart(2, '0')}</span><span className="wt-cooldown-unit-label">S</span></div>
              </div>
              <div className="wt-cooldown-date">
                Next submission eligible {cooldown.cooldown_ends_at ? new Date(cooldown.cooldown_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
              </div>
            </div>
            <div className="wt-cooldown-right">
              <div className="wt-cooldown-why-label">WHY COOLDOWN?</div>
              <p className="wt-cooldown-why">Each wallet may receive one ETH refund per 30-day rolling window. This prevents abuse and ensures fair distribution.</p>
              <Link href="/gates" className="gc-teaser-link">See Gate 8</Link>
            </div>
          </div>
        ) : (
          <div className="wt-cooldown wt-cooldown--eligible">
            <span className="wt-eligible-dot">●</span>
            <span className="wt-eligible-text">ELIGIBLE TO SUBMIT</span>
            <Link href="/submit" className="gc-teaser-link" style={{ marginLeft: 'auto' }}>Submit Receipt</Link>
          </div>
        )
      )}

      {/* Zone 5 — Gate Progress Tracker */}
      {mode === 'connected' && activeSub && (
        <div className="wt-gate-section">
          <div className="wt-gate-header">
            <h2 className="wt-gate-title">Gate Progress</h2>
            <div>
              <span className="wt-gate-id">GC-{new Date(activeSub.created_at).getFullYear()}-{activeSub.id.slice(0, 5).toUpperCase()}</span>
              <span className="wt-gate-ago">{timeAgo(activeSub.created_at)}</span>
            </div>
          </div>
          {pendingSubs.length > 1 && (
            <div className="wt-gate-selector">
              <button type="button" disabled={activeIdx === 0} onClick={() => setActiveIdx((i) => i - 1)}>&larr;</button>
              <span>Viewing submission {activeIdx + 1} of {pendingSubs.length}</span>
              <button type="button" disabled={activeIdx >= pendingSubs.length - 1} onClick={() => setActiveIdx((i) => i + 1)}>&rarr;</button>
            </div>
          )}
          <div className="wt-gate-list">
            {GATES.map((gate, i) => {
              const log = activeSub.gate_logs?.find((g) => g.gate_name === gate.slug || g.gate_name === gate.name.toLowerCase().replace(/[^a-z_]/g, '_'));
              const status = log ? (log.passed ? 'passed' : 'failed') : (i < (activeSub.gates_passed || 0) ? 'passed' : 'pending');
              const isFailed = status === 'failed';
              const failedBefore = activeSub.gate_logs?.some((g) => !g.passed);
              const isSkipped = !log && failedBefore && status === 'pending';

              return (
                <div key={gate.id}>
                  <div className={`wt-gate-row wt-gate-row--${isSkipped ? 'skipped' : status}`}>
                    <span className={`wt-gate-icon wt-gate-icon--${isSkipped ? 'skipped' : status}`}>
                      {status === 'passed' ? '●' : status === 'failed' ? '✕' : isSkipped ? '—' : '○'}
                    </span>
                    <span className="wt-gate-num">G{String(gate.id).padStart(2, '0')}</span>
                    <span className="wt-gate-name">{gate.name}</span>
                  </div>
                  {isFailed && log?.reason_code && (
                    <div className="wt-gate-failure">
                      <div className="wt-gate-failure-label">FAILURE REASON</div>
                      <div className="wt-gate-failure-text">{log.reason_code}</div>
                      <Link href={`/gates`} className="gc-teaser-link" style={{ fontSize: 10, marginTop: 8, display: 'inline-flex' }}>How to fix</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Processing bar */}
          <div className="wt-gate-progress-bar">
            <div className="wt-gate-progress-fill" style={{ width: `${((activeSub.gates_passed || 0) / GATES.length) * 100}%` }} />
          </div>
          <div className="wt-gate-progress-label">Processing · Gate {Math.min((activeSub.gates_passed || 0) + 1, GATES.length)} of {GATES.length}</div>
        </div>
      )}

      {/* Zone 6 — Submission History */}
      {mode !== 'idle' && submissions.length > 0 && (
        <div className="wt-history">
          <div className="wt-history-header">
            <h2 className="wt-gate-title">Submission History</h2>
            <span className="wt-history-count">{submissions.length} total</span>
          </div>
          {mode === 'connected' && (
            <div className="cf-filters" style={{ marginBottom: 16 }}>
              {(['all', 'approved', 'pending', 'rejected'] as HistoryFilter[]).map((f) => (
                <button key={f} type="button" className={`cf-filter-tab${histFilter === f ? ' cf-filter-tab--active' : ''}`}
                  onClick={() => { setHistFilter(f); setHistPage(0); }}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <table className="lb-table">
            <thead>
              <tr>
                <th>Date</th>
                {mode === 'connected' && <th>Status</th>}
                <th>SOL</th>
                <th>USD</th>
                <th>Location</th>
                <th>Gates</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => {
                const isPending = ['submitted', 'auto_review', 'needs_manual_review'].includes(s.status);
                const isRejected = s.status === 'rejected';
                const loc = s.country || '—';
                return (
                  <tr key={s.id} className={`lb-table-row${isRejected ? ' wt-row-rejected' : ''}`}
                    onClick={() => isRejected && setExpandedRejection(expandedRejection === s.id ? null : s.id)}>
                    <td className="lb-table-time">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    {mode === 'connected' && (
                      <td>
                        <span className={`wt-status-badge wt-status-badge--${isRejected ? 'rejected' : isPending ? 'pending' : 'approved'}`}>
                          {isPending ? 'PENDING' : s.status === 'rejected' ? 'REJECTED' : 'APPROVED'}
                        </span>
                      </td>
                    )}
                    <td className="lb-table-sol">{formatSol(s.sol_amount)}</td>
                    <td className="lb-table-claims">{s.receipt_usd != null ? `$${s.receipt_usd.toFixed(2)}` : '—'}</td>
                    <td className="lb-table-claims">{loc}</td>
                    <td className="lb-table-claims">{isRejected ? `✕ G${s.gates_passed}` : `${s.gates_passed}/${GATES.length}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > PAGE_SIZE && (
            <div className="lb-pagination">
              <button type="button" className="sf-btn-ghost" disabled={histPage === 0} onClick={() => setHistPage((p) => p - 1)}>&larr; PREV</button>
              <span className="lb-pagination-info">Showing {histPage * PAGE_SIZE + 1}–{Math.min((histPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <button type="button" className="sf-btn-ghost" disabled={histPage >= totalPages - 1} onClick={() => setHistPage((p) => p + 1)}>NEXT &rarr;</button>
            </div>
          )}
        </div>
      )}

      {/* Zone 7 — Idle / Empty */}
      {mode === 'idle' && (
        <div className="wt-idle">
          <div className="wt-idle-ghost">?</div>
          <h2 className="wt-idle-title">Connect or Lookup</h2>
          <p className="wt-idle-body">
            Connect your wallet to see your submission history and cooldown status,
            or enter any Ethereum address to view their public payout record.
          </p>
        </div>
      )}

      {mode !== 'idle' && !loading && submissions.length === 0 && (
        <div className="lb-empty">
          <p>No submissions found for this wallet.</p>
          <Link href="/submit" className="gc-teaser-link" style={{ marginTop: 16, display: 'inline-flex' }}>Submit your first receipt</Link>
        </div>
      )}
    </div>
  );
}
