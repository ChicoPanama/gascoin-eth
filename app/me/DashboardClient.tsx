'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ViralShareCard } from '../../components/shared/ViralShareCard';

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
  amount_usdc?: number;
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

interface NetworkImpact {
  referredUsers: number;
  networkSolSaved: number;
  networkUsdSaved: number;
  combinedSol: number;
  combinedUsd: number;
}

interface PointsData {
  total: number;
  bySource: Record<string, number>;
}

interface TierData {
  current: { id: number; name: string; max_sol_refund: number };
  next: { id: number; name: string; min_tokens: number } | null;
  gascoinBalance: number;
  tokensToNext: number;
}

interface TopTweet {
  tweet_id: string;
  tweet_url: string;
  tweet_text: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  bookmarks: number;
  adjusted_points: number;
  quality_score: number;
  content_type: string;
  posted_at: string;
}

interface GateFailure {
  gate: string;
  count: number;
}

interface Analytics {
  approvalRate: number;
  avgRefundSol: number;
  avgRefundUsd: number;
  topGateFailures: GateFailure[];
  conversionRate: number;
  percentile: number;
  pointsLast30: number;
  pointsPrior30: number;
  pointsTrend: number;
}

interface Props {
  wallet: string;
  xHandle: string | null;
  isDryRun?: boolean;
  claims: Claim[];
  payouts: Payout[];
  referral: Referral;
  stats: Stats;
  networkImpact: NetworkImpact;
  pricing?: { solPriceUsd?: number };
  points?: PointsData;
  tier?: TierData;
  leaderboard?: { rank: number; totalRanked: number };
  engagement?: { topTweets: TopTweet[]; contentTypeDist?: Record<string, { count: number; points: number }>; totalScoredTweets?: number };
  streak?: { consecutiveWindows: number; maxMultiplier: number };
  cooldown?: { days: number; endsAt: string | null; remainingMs: number };
  analytics?: Analytics;
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
  min_amount: 'Min Amount',
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

function formatUsd(v: number) {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function UsdcIcon() {
  return (
    <span className="gc-mini-icon" aria-hidden>
      <img src="https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694" alt="" loading="lazy" decoding="async" />
    </span>
  );
}

// ── Component ──
export function DashboardClient({ wallet, xHandle, isDryRun = false, claims, payouts, referral, stats, networkImpact, pricing, points, tier, leaderboard, engagement, streak, cooldown, analytics }: Props) {
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [solUsdPrice, setSolUsdPrice] = useState(Number(pricing?.solPriceUsd || 170));

  useEffect(() => {
    let active = true;
    const pullPrice = async () => {
      try {
        const res = await fetch('/api/public/market', { cache: 'no-store' });
        if (!res.ok) return;
        const m = await res.json();
        if (!active) return;
        const p = Number(m?.solPriceUsd || 0);
        if (p > 0) setSolUsdPrice(p);
      } catch {
        // keep fallback
      }
    };
    pullPrice();
    const id = setInterval(pullPrice, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

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
      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— Personal Dashboard · Your Activity</span>
        </div>
        <h1 className="lb-title">MY GASCOIN</h1>
        <div className="ud-header__identity">
          {xHandle && <span className="ud-handle">@{xHandle}</span>}
          {wallet && <span className="ud-wallet">{truncate(wallet, 6)}</span>}
        </div>
      </header>

      {/* ── Season 1 Banner ── */}
      {isDryRun && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.08em',
          padding: '14px clamp(16px, 4vw, 20px)',
          marginBottom: 32,
          background: 'var(--status-warn-bg)',
          border: '1px solid var(--status-warn-border)',
          color: 'var(--status-warn)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 10,
            padding: '3px 8px',
            background: 'var(--status-warn-border)',
            color: 'var(--bg)',
            border: '1px solid var(--status-warn-border)',
            letterSpacing: '0.15em',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            SEASON 1
          </span>
          <span style={{ flex: '1 1 auto', minWidth: 0 }}>
            Points-only mode. Your points earn leaderboard rank and become a claim on the treasury when it activates at token launch.
          </span>
        </div>
      )}

      {/* ── Stats Bar ── */}
      <section className="gc-stats">
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">{isDryRun ? 'Season 1 Points' : 'Total Earned'}</div>
            <div className="gc-stat-value">
              {isDryRun
                ? (points?.total || 0).toLocaleString()
                : formatUsd((stats as any).totalEarnedUsdc ?? (stats.totalEarned * solUsdPrice))}
            </div>
            <div className="gc-stat-sub">
              {isDryRun ? 'claim on treasury' : <span className="gc-inline-token"><UsdcIcon />USDC</span>}
            </div>
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

      {/* ── Rank & Tier Strip ── */}
      <section className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Leaderboard Rank</div>
            <div className="gc-stat-value">#{leaderboard?.rank || '—'}</div>
            <div className="gc-stat-sub">of {leaderboard?.totalRanked || 0} wallets</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Total Points</div>
            <div className="gc-stat-value">{(points?.total || 0).toLocaleString()}</div>
            <div className="gc-stat-sub">all sources</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Current Tier</div>
            <div className="gc-stat-value">{tier?.current?.name?.toUpperCase() || 'STANDARD'}</div>
            <div className="gc-stat-sub">{Math.round(tier?.gascoinBalance || 0).toLocaleString()} GASCOIN</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Streak</div>
            <div className="gc-stat-value">{streak?.consecutiveWindows || 0}x</div>
            <div className="gc-stat-sub">of {streak?.maxMultiplier || 5} max</div>
          </div>
        </div>
      </section>

      {/* ── Points Breakdown ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Points Breakdown</h2>
          <Link href="/points" className="gc-btn-ghost">How Points Work</Link>
        </div>
        <div className="gc-stats">
          <div className="gc-stats-grid">
            {[
              { key: 'tweet_engagement', label: 'Engagement' },
              { key: 'holdings_bonus', label: 'Holdings' },
              { key: 'submission_approved', label: 'Submissions' },
              { key: 'referral_conversion', label: 'Referral Bonus' },
              { key: 'referral_passive', label: 'Referral Passive' },
              { key: 'streak_bonus', label: 'Streak' },
            ].map(({ key, label }) => (
              <div key={key} className="gc-stat">
                <div className="gc-stat-label">{label}</div>
                <div className="gc-stat-value">{(points?.bySource?.[key] || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Performance Analytics ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Performance Analytics</h2>
        </div>
        {analytics ? (
          <>
          <div className="gc-stats">
            <div className="gc-stats-grid">
              <div className="gc-stat">
                <div className="gc-stat-label">Approval Rate</div>
                <div className="gc-stat-value">{analytics.approvalRate}%</div>
                <div className="gc-stat-sub">{stats.approved} of {claims.length} submissions</div>
              </div>
              <div className="gc-stat">
                <div className="gc-stat-label">Avg Refund</div>
                <div className="gc-stat-value">{formatUsd(analytics.avgRefundUsd)}</div>
                <div className="gc-stat-sub">{analytics.avgRefundSol.toFixed(4)} SOL</div>
              </div>
              <div className="gc-stat">
                <div className="gc-stat-label">Percentile</div>
                <div className="gc-stat-value">Top {analytics.percentile > 0 ? `${analytics.percentile}%` : '—'}</div>
                <div className="gc-stat-sub">of all users</div>
              </div>
              <div className="gc-stat">
                <div className="gc-stat-label">30-Day Trend</div>
                <div className="gc-stat-value">{analytics.pointsTrend > 0 ? '+' : ''}{analytics.pointsTrend}%</div>
                <div className="gc-stat-sub">{analytics.pointsLast30.toLocaleString()} pts this month</div>
              </div>
            </div>
          </div>

          {/* Gate failure patterns */}
          {analytics.topGateFailures.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: 12 }}>
                MOST COMMON GATE FAILURES
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {analytics.topGateFailures.map((f) => (
                  <div key={f.gate} style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,100,100,0.7)',
                    background: 'rgba(255,100,100,0.06)', border: '1px solid rgba(255,100,100,0.12)',
                    padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center',
                  }}>
                    <span>{GATE_DISPLAY[f.gate] || f.gate}</span>
                    <span style={{ color: 'rgba(var(--fg-rgb),0.3)' }}>{f.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
        ) : (
          <div className="gc-stats">
            <div className="gc-stats-grid">
              <div className="gc-stat"><div className="gc-stat-label">Approval Rate</div><div className="gc-stat-value">—</div></div>
              <div className="gc-stat"><div className="gc-stat-label">Avg Refund</div><div className="gc-stat-value">—</div></div>
              <div className="gc-stat"><div className="gc-stat-label">Percentile</div><div className="gc-stat-value">—</div></div>
              <div className="gc-stat"><div className="gc-stat-label">30-Day Trend</div><div className="gc-stat-value">—</div></div>
            </div>
          </div>
        )}
      </section>

      {/* ── Content Type Distribution ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Content Distribution</h2>
          <Link href="/points" className="gc-btn-ghost">Multipliers</Link>
        </div>
        {engagement?.contentTypeDist && Object.keys(engagement.contentTypeDist).length > 0 ? (
          <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(engagement.contentTypeDist)
              .sort((a, b) => b[1].points - a[1].points)
              .map(([type, data]) => {
                const maxPts = Math.max(...Object.values(engagement.contentTypeDist!).map((d) => d.points), 1);
                const pct = (data.points / maxPts) * 100;
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(var(--fg-rgb),0.6)', width: 110, flexShrink: 0 }}>
                      {type.replace(/_/g, ' ')}
                    </span>
                    <div style={{ flex: 1, height: 6, background: 'rgba(var(--fg-rgb),0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(var(--fg-rgb),0.4)', width: 80, textAlign: 'right', flexShrink: 0 }}>
                      {data.count} tweets
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)', width: 70, textAlign: 'right', flexShrink: 0 }}>
                      {data.points.toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(var(--fg-rgb),0.25)', marginTop: 12 }}>
            {engagement?.totalScoredTweets || 0} total tweets scored
          </div>
          </>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(var(--fg-rgb),0.3)', padding: '24px 0' }}>
            No tweets scored yet. Post with #gascoin to start earning engagement points.
          </div>
        )}
      </section>

      {/* ── Tier Progress ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Tier Progress</h2>
          <Link href="/perks" className="gc-btn-ghost">View Perks</Link>
        </div>
        {tier?.next ? (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(var(--fg-rgb),0.4)', marginBottom: 8 }}>
              NEXT: {tier.next.name.toUpperCase()} — {tier.tokensToNext.toLocaleString()} GASCOIN needed
            </div>
            <div className="gt-progress-track">
              <div className="gt-progress-fill" style={{ width: `${Math.min(100, tier.gascoinBalance / tier.next.min_tokens * 100)}%` }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(var(--fg-rgb),0.3)', marginTop: 8 }}>
              Max refund: {tier?.current?.max_sol_refund || 0.10} SOL · Cooldown: {cooldown?.days || 7}d
              {cooldown?.remainingMs && cooldown.remainingMs > 0 ? ` · Next submission: ${Math.ceil(cooldown.remainingMs / 3600000)}h` : ' · Ready to submit'}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(var(--fg-rgb),0.3)', padding: '24px 0' }}>
            {tier?.current?.name === 'Fleet' ? 'You are at the highest tier.' : `Current tier: ${tier?.current?.name || 'Standard'}. Hold more GASCOIN to unlock higher tiers.`}
          </div>
        )}
      </section>

      {/* ── Top Tweets ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Top Performing Tweets</h2>
        </div>
        {engagement?.topTweets && engagement.topTweets.length > 0 ? (
          <div className="ud-claims">
            {engagement.topTweets.map((t) => (
              <div key={t.tweet_id} className="ud-claim" style={{ cursor: 'default' }}>
                <div className="ud-claim__top">
                  <span className="ud-claim__date">{timeAgo(t.posted_at)}</span>
                  <span className="ud-badge ud-badge--pass">{t.content_type?.replace(/_/g, ' ').toUpperCase() || 'TEXT'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', marginLeft: 'auto' }}>
                    {t.adjusted_points.toLocaleString()} pts
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(var(--fg-rgb),0.6)', lineHeight: 1.6, marginTop: 8 }}>
                  {t.tweet_text?.slice(0, 120)}{t.tweet_text?.length > 120 ? '...' : ''}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(var(--fg-rgb),0.35)' }}>
                  <span>{t.impressions.toLocaleString()} impr</span>
                  <span>{t.likes} likes</span>
                  <span>{t.replies} replies</span>
                  <span>{t.retweets} RTs</span>
                  <span>{t.bookmarks} saves</span>
                  <span>Q: {(t.quality_score * 100).toFixed(0)}%</span>
                </div>
                {t.tweet_url && (
                  <a href={t.tweet_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(var(--fg-rgb),0.3)', marginTop: 4, display: 'inline-block' }}>
                    View on X ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(var(--fg-rgb),0.3)', padding: '24px 0' }}>
            No tweets scored yet. Post with #gascoin to start earning engagement points.
          </div>
        )}
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
                          {formatUsd((payout.amount_usdc ?? (payout.amount_sol * solUsdPrice)))} <span className="gc-inline-token"><UsdcIcon />USDC</span>
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
                            {payout.tx_hash.startsWith('DRYRUN_') ? (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', background: 'rgba(255,200,80,0.1)', border: '1px solid rgba(255,200,80,0.25)', color: 'rgba(255,220,140,0.8)', letterSpacing: '0.12em' }}>
                                SEASON 1
                              </span>
                            ) : (
                              <a
                                href={`https://solscan.io/tx/${payout.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ud-meta__link"
                              >
                                {truncate(payout.tx_hash, 6)} ↗
                              </a>
                            )}
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
            {payouts.map((p) => {
              const isDryRunTx = p.tx_hash?.startsWith('DRYRUN_');
              return (
                <div key={p.id} className="ud-payouts__row">
                  <span className="ud-payouts__date">{timeAgo(p.created_at)}</span>
                  <span className="ud-payouts__amount">
                    {isDryRunTx
                      ? <span style={{ color: 'rgba(255,220,140,0.8)' }}>1,000 pts</span>
                      : <>{formatUsd((p.amount_usdc ?? (p.amount_sol * solUsdPrice)))} <span className="gc-inline-token"><UsdcIcon />USDC</span></>}
                  </span>
                  <span>{statusBadge(p.status)}</span>
                  <span className="ud-payouts__tx">
                    {p.tx_hash ? (
                      isDryRunTx ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px', background: 'rgba(255,200,80,0.1)', border: '1px solid rgba(255,200,80,0.25)', color: 'rgba(255,220,140,0.8)', letterSpacing: '0.12em' }}>
                          SEASON 1
                        </span>
                      ) : (
                        <a
                          href={`https://solscan.io/tx/${p.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {truncate(p.tx_hash, 6)} ↗
                        </a>
                      )
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Network Impact ── */}
      {referral.code && (
        <ViralShareCard
          variant="dashboard"
          networkImpact={networkImpact}
          referralCode={referral.code}
        />
      )}

      {/* ── Referral Program ── */}
      <section className="ud-section">
        <div className="ud-section__header">
          <h2 className="ud-section__title">Referral Program</h2>
          <Link href="/referral" className="gc-btn-ghost">Manage</Link>
        </div>
        <div className="gc-stats">
          <div className="gc-stats-grid">
            <div className="gc-stat">
              <div className="gc-stat-label">Referral Code</div>
              <div className="gc-stat-value ud-stat-value--sm">{referral.code || '—'}</div>
              <div className="gc-stat-sub">{referral.code ? 'share to earn' : 'submit first to unlock'}</div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Clicks</div>
              <div className="gc-stat-value">{referral.clicks}</div>
              <div className="gc-stat-sub">{referral.uniqueClicks} unique</div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Conversions</div>
              <div className="gc-stat-value">{referral.conversions}</div>
              <div className="gc-stat-sub">{analytics?.conversionRate || 0}% rate</div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Passive Income</div>
              <div className="gc-stat-value">{(points?.bySource?.referral_passive || 0).toLocaleString()}</div>
              <div className="gc-stat-sub">pts from referred users</div>
            </div>
          </div>
        </div>
        {/* Referral funnel */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>{referral.clicks} clicks</span>
          <span style={{ color: 'rgba(var(--fg-rgb),0.15)' }}>→</span>
          <span style={{ color: 'rgba(var(--fg-rgb),0.4)' }}>{referral.uniqueClicks} unique</span>
          <span style={{ color: 'rgba(var(--fg-rgb),0.15)' }}>→</span>
          <span style={{ color: 'rgba(var(--fg-rgb),0.6)' }}>{referral.conversions} converted</span>
          <span style={{ color: 'rgba(var(--fg-rgb),0.15)' }}>→</span>
          <span style={{ color: 'var(--fg)' }}>2% passive</span>
        </div>
      </section>
    </>
  );
}
