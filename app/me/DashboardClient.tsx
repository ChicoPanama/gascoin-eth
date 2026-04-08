'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// ── Types ──
interface GateResult {
  gate: string;
  passed: boolean;
  reason: string | null;
  score: number | null;
  created_at: string;
}

interface Claim {
  id: string;
  status: string;
  created_at: string;
  parsed_amount: number | null;
  country: string | null;
  city: string | null;
  state: string | null;
  tweet_url: string | null;
  wallet: string;
  claim_receipts: { storage_path_private: string; is_image_redacted: boolean }[];
  gate_results: GateResult[];
}

interface Payout {
  id: string;
  amount_sol: number;
  status: string;
  tx_hash: string | null;
  created_at: string;
  claim_id: string;
}

interface Referral {
  code: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
}

interface Stats {
  totalEarned: number;
  approved: number;
  pending: number;
  rejected: number;
}

interface Props {
  wallet: string;
  xHandle: string | null;
  claims: Claim[];
  payouts: Payout[];
  referral: Referral;
  stats: Stats;
}

// ── Helpers ──
const GATE_DISPLAY: Record<string, string> = {
  x_verified: 'X Verified',
  tweet_hashtag: 'Tweet Hashtag',
  tweet_live: 'Tweet Live',
  receipt_hashtag: 'Receipt Hashtag',
  wallet_match: 'Wallet Match',
  gascoin_min_hold: 'GASCOIN Hold',
  not_duplicate: 'Not Duplicate',
  ai_image_check: 'AI Image Check',
  tamper_check: 'Tamper Check',
  cooldown: 'Cooldown',
  min_followers: 'Min Followers',
  account_quality: 'Account Quality',
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: 'APPROVED', cls: 'ud-badge--pass' },
    paid: { label: 'PAID', cls: 'ud-badge--pass' },
    ready_for_dispatch: { label: 'READY', cls: 'ud-badge--pass' },
    submitted: { label: 'SUBMITTED', cls: 'ud-badge--pending' },
    auto_review: { label: 'IN REVIEW', cls: 'ud-badge--pending' },
    needs_manual_review: { label: 'MANUAL REVIEW', cls: 'ud-badge--pending' },
    rejected: { label: 'REJECTED', cls: 'ud-badge--fail' },
  };
  const m = map[status] ?? { label: status.toUpperCase(), cls: 'ud-badge--pending' };
  return <span className={`ud-badge ${m.cls}`}>{m.label}</span>;
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

function truncate(s: string, n = 8) {
  if (s.length <= n * 2) return s;
  return `${s.slice(0, n)}...${s.slice(-n)}`;
}

// ── Component ──
export function DashboardClient({ wallet, xHandle, claims, payouts, referral, stats }: Props) {
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  const isApproved = (s: string) => s === 'approved' || s === 'paid' || s === 'ready_for_dispatch';
  const isPending = (s: string) => s === 'submitted' || s === 'auto_review' || s === 'needs_manual_review';
  const isRejected = (s: string) => s === 'rejected';

  const counts = useMemo(() => ({
    approved: claims.filter((c) => isApproved(c.status)).length,
    pending: claims.filter((c) => isPending(c.status)).length,
    rejected: claims.filter((c) => isRejected(c.status)).length,
  }), [claims]);

  const filtered = claims.filter((c) => {
    if (tab === 'all') return true;
    if (tab === 'approved') return isApproved(c.status);
    if (tab === 'pending') return isPending(c.status);
    if (tab === 'rejected') return isRejected(c.status);
    return true;
  });

  const gatesPassed = (c: Claim) => c.gate_results.filter((g) => g.passed).length;
  const gatesTotal = (c: Claim) => c.gate_results.length;

  // Find payout amount for a claim
  const payoutForClaim = (claimId: string) =>
    payouts.find((p) => p.claim_id === claimId && p.status === 'paid');

  return (
    <>
      {/* ── Header ── */}
      <header className="ud-header">
        <div className="ud-header__meta">
          <span className="gc-section-label">— Personal Dashboard</span>
        </div>
        <h1 className="ud-title">MY GASCOIN</h1>
        <div className="ud-header__identity">
          {xHandle && <span className="ud-handle">@{xHandle}</span>}
          {wallet && <span className="ud-wallet">{truncate(wallet, 6)}</span>}
        </div>
      </header>

      {/* ── Stats Bar ── */}
      <section className="gc-stats">
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Total Earned</div>
            <div className="gc-stat-value">{stats.totalEarned.toFixed(4)}</div>
            <div className="gc-stat-sub">SOL</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Approved</div>
            <div className="gc-stat-value">{stats.approved}</div>
            <div className="gc-stat-sub">submissions</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Pending</div>
            <div className="gc-stat-value">{stats.pending}</div>
            <div className="gc-stat-sub">in review</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Rejected</div>
            <div className="gc-stat-value">{stats.rejected}</div>
            <div className="gc-stat-sub">submissions</div>
          </div>
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section className="ud-actions">
        <Link href="/submit" className="gc-btn-solid">Submit Receipt</Link>
        <Link href="/referral" className="gc-btn-ghost">Share Referral Link</Link>
        <Link href="/wallet" className="gc-btn-ghost">Wallet Tracker</Link>
        <Link href="/perks" className="gc-btn-ghost">View Perks</Link>
      </section>

      {/* ── Submission History ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Submission History</h2>
          <div className="ud-tabs">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((t) => {
              const count = t === 'all' ? claims.length : counts[t];
              return (
                <button
                  key={t}
                  className={`ud-tab ${tab === t ? 'ud-tab--active' : ''}`}
                  onClick={() => setTab(t)}
                  type="button"
                >
                  {t.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="ud-empty">
            <p>No submissions found.</p>
            <Link href="/submit" className="gc-btn-solid">Submit Your First Receipt</Link>
          </div>
        ) : (
          <div className="ud-claims">
            {filtered.map((claim) => {
              const payout = payoutForClaim(claim.id);
              return (
                <div key={claim.id} className="ud-claim">
                  <button
                    className="ud-claim__row"
                    onClick={() =>
                      setExpandedClaim(expandedClaim === claim.id ? null : claim.id)
                    }
                    type="button"
                  >
                    <div className="ud-claim__left">
                      <span className="ud-claim__id">{claim.id.slice(0, 8)}…</span>
                      <span className="ud-claim__time">{timeAgo(claim.created_at)}</span>
                    </div>
                    <div className="ud-claim__center">
                      {statusBadge(claim.status)}
                      <span className="ud-claim__gates">
                        {gatesPassed(claim)}/{gatesTotal(claim)} gates
                      </span>
                    </div>
                    <div className="ud-claim__right">
                      {payout && (
                        <span className="ud-claim__sol">
                          {payout.amount_sol.toFixed(4)} SOL
                        </span>
                      )}
                      <span className="ud-claim__expand">
                        {expandedClaim === claim.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {expandedClaim === claim.id && (
                    <div className="ud-claim__detail">
                      {/* Gate results */}
                      <div className="ud-gates">
                        <div className="ud-gates__title">Verification Gates</div>
                        <div className="ud-gates__grid">
                          {claim.gate_results
                            .sort((a, b) => a.gate.localeCompare(b.gate))
                            .map((g, i) => (
                              <div
                                key={i}
                                className={`ud-gate ${g.passed ? 'ud-gate--pass' : 'ud-gate--fail'}`}
                              >
                                <span className="ud-gate__icon">
                                  {g.passed ? '✓' : '✕'}
                                </span>
                                <span className="ud-gate__name">
                                  {GATE_DISPLAY[g.gate] ?? g.gate}
                                </span>
                                {g.score != null && (
                                  <span className="ud-gate__score">
                                    {g.score.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Claim metadata */}
                      <div className="ud-meta">
                        {claim.tweet_url && (
                          <div className="ud-meta__row">
                            <span className="ud-meta__label">Tweet</span>
                            <a
                              href={claim.tweet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ud-meta__link"
                            >
                              View on X ↗
                            </a>
                          </div>
                        )}
                        {claim.parsed_amount != null && (
                          <div className="ud-meta__row">
                            <span className="ud-meta__label">Receipt Amount</span>
                            <span className="ud-meta__value">
                              ${claim.parsed_amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {claim.country && (
                          <div className="ud-meta__row">
                            <span className="ud-meta__label">Location</span>
                            <span className="ud-meta__value">
                              {[claim.city, claim.state, claim.country]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                        {payout?.tx_hash && (
                          <div className="ud-meta__row">
                            <span className="ud-meta__label">Transaction</span>
                            <a
                              href={`https://solscan.io/tx/${payout.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ud-meta__link"
                            >
                              {truncate(payout.tx_hash, 6)} ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Payout History ── */}
      {payouts.length > 0 && (
        <section className="ud-section">
          <h2 className="ud-section__title">Payout History</h2>
          <div className="ud-payouts">
            <div className="ud-payouts__header">
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Transaction</span>
            </div>
            {payouts.map((p) => (
              <div key={p.id} className="ud-payouts__row">
                <span className="ud-payouts__date">{timeAgo(p.created_at)}</span>
                <span className="ud-payouts__amount">{p.amount_sol.toFixed(4)} SOL</span>
                <span>{statusBadge(p.status)}</span>
                <span className="ud-payouts__tx">
                  {p.tx_hash ? (
                    <a
                      href={`https://solscan.io/tx/${p.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {truncate(p.tx_hash, 6)} ↗
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Referral Summary ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Referral Program</h2>
          <Link href="/referral" className="gc-btn-ghost">Manage</Link>
        </div>
        {referral.conversions > 0 || referral.clicks > 0 ? (
          <div className="gc-stats">
            <div className="gc-stats-grid ud-stats-grid--3">
              <div className="gc-stat">
                <div className="gc-stat-label">Referral Code</div>
                <div className="gc-stat-value ud-stat-value--sm">{referral.code}</div>
              </div>
              <div className="gc-stat">
                <div className="gc-stat-label">Conversions</div>
                <div className="gc-stat-value">{referral.conversions}</div>
                <div className="gc-stat-sub">{referral.uniqueClicks} unique clicks</div>
              </div>
              <div className="gc-stat">
                <div className="gc-stat-label">Total Clicks</div>
                <div className="gc-stat-value">{referral.clicks}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="ud-empty">
            <p>Get 1 approved submission to unlock your referral link.</p>
            <Link href="/referral" className="gc-btn-ghost">Learn More</Link>
          </div>
        )}
      </section>
    </>
  );
}
