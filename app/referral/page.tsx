'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Nav } from '../../components/Nav';
import { WalletButton } from '../../components/ui/WalletButton';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';
import { useReferralDashboard } from '../../hooks/useReferralDashboard';
import { truncateWallet, formatSol, timeAgo } from '../../lib/formatters';
import { REFERRAL_CONFIG, SKIP_REASON_LABELS } from '../../lib/referral-config';
import type { ReferralConversion } from '../../types/referral';

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

type ConvFilter = 'all' | 'dispatched' | 'pending' | 'skipped';
const PAGE_SIZE = 15;

export default function ReferralPage() {
  const { publicKey } = useGascoinWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const { summary, conversions, clickStats, referralCode, hasApprovedSubmission, loading, error } = useReferralDashboard(wallet);

  const [copied, setCopied] = useState(false);
  const [convFilter, setConvFilter] = useState<ConvFilter>('all');
  const [convPage, setConvPage] = useState(0);
  const [expandedSkip, setExpandedSkip] = useState<string | null>(null);

  const isUnlocked = !!wallet && hasApprovedSubmission;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gascoin.xyz';
  const referralUrl = referralCode ? `${baseUrl}/submit?ref=${referralCode}` : '';

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(referralUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: 'GASCOIN', text: 'Get your gas money back. Submit a receipt #gascoin', url: referralUrl });
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Get your gas money back. Submit a receipt #gascoin → ' + referralUrl)}`, '_blank');
    }
  };

  // Stats
  const aClicks = useAnimVal(clickStats?.total_clicks ?? 0);
  const aUnique = useAnimVal(clickStats?.unique_clicks ?? 0);
  const aConv = useAnimVal(summary?.total_conversions ?? 0);
  const aRate = useAnimVal(clickStats?.conversion_rate_pct ?? 0);
  const aSol = useAnimVal(summary?.total_referral_sol_earned ?? 0);

  // Monthly caps
  const monthConv = conversions.filter((c) => {
    const d = new Date(c.created_at);
    return d > new Date(Date.now() - 30 * 86400000) && ['dispatched', 'pending'].includes(c.reward_status);
  });
  const monthSol = monthConv.reduce((s, c) => s + Number(c.reward_sol || 0), 0);

  // Filtered conversions
  const filtered = convFilter === 'all' ? conversions : conversions.filter((c) => c.reward_status === convFilter);
  const paged = filtered.slice(convPage * PAGE_SIZE, (convPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="container">
      <Nav />

      {/* Zone 1 — Header */}
      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— Earn SOL For Every Referral You Convert</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <h1 className="lb-title" style={{ lineHeight: 0.88 }}>Referral<br /><span style={{ color: 'rgba(255,255,255,0.18)' }}>Engine</span></h1>
            <p className="gt-header-body">
              Share your unique link. When someone submits a verified receipt using
              your link and gets approved, you earn {REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL} SOL
              directly to your wallet — automatically.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 64 }}>{REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL} SOL</div>
            <div className="lb-live-label">per verified conversion</div>
          </div>
        </div>
      </header>

      {error && <div className="sf-error" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Zone 2 — Wallet Gate */}
      {!wallet ? (
        <div className="ref-gate">
          <div className="ref-gate-label">CONNECT WALLET TO CONTINUE</div>
          <WalletButton />
          <div className="wt-input-hint" style={{ marginTop: 16 }}>You must have at least one approved submission to generate a referral link.</div>
        </div>
      ) : !hasApprovedSubmission && !loading ? (
        <div className="ref-gate">
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 32, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>REFERRAL ACCESS LOCKED</h2>
          <p style={{ fontFamily: 'IBM Plex Sans', fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            You need at least one approved gas receipt submission before you can generate a referral link.
          </p>
          <Link href="/submit" className="gc-teaser-link">Submit Receipt</Link>
        </div>
      ) : null}

      {/* Zones 3-8 — only if unlocked */}
      <div style={!isUnlocked && !loading ? { filter: 'blur(4px)', pointerEvents: 'none', opacity: 0.3 } : undefined}>

        {/* Zone 3 — Referral Link Generator */}
        <div className="ref-link-section">
          <div className="ref-link-main">
            <div className="wt-input-label">YOUR REFERRAL LINK</div>
            <div className="ref-link-box">
              <span className="ref-link-url">{referralUrl || '—'}</span>
              <div className="ref-link-actions">
                <button type="button" className="ref-copy-btn" onClick={copyLink}>{copied ? 'COPIED ✓' : 'COPY'}</button>
                <button type="button" className="sf-btn-ghost" style={{ padding: '8px 16px', fontSize: 10 }} onClick={shareLink}>SHARE ↗</button>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <span className="wt-input-label" style={{ marginBottom: 8, display: 'block' }}>YOUR CODE:</span>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: 48, letterSpacing: '0.15em' }}>{referralCode || '—'}</span>
            </div>
          </div>
          <div className="ref-link-rewards">
            <div className="wt-input-label" style={{ marginBottom: 24 }}>REWARD STRUCTURE</div>
            {[
              ['Per Conversion', `${REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL} SOL`],
              ['Monthly Cap', `${REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL} SOL`],
              ['Monthly Limit', `${REFERRAL_CONFIG.MAX_CONVERSIONS_30D} conversions`],
              ['Attribution Window', '7 days after click'],
              ['Requires', 'Referrer must be approved'],
            ].map(([label, value]) => (
              <div key={label} className="ref-reward-row">
                <span className="ref-reward-label">{label}</span>
                <span className="ref-reward-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zone 4 — Stats */}
        <div className="gc-stats">
          <div className="gc-stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { label: 'Total Clicks', value: Math.round(aClicks).toLocaleString() },
              { label: 'Unique Visitors', value: Math.round(aUnique).toLocaleString() },
              { label: 'Conversions', value: Math.round(aConv).toLocaleString() },
              { label: 'Conversion Rate', value: clickStats?.unique_clicks ? `${aRate.toFixed(1)}%` : '—%' },
              { label: 'SOL Earned', value: formatSol(aSol) },
            ].map((c) => (
              <div key={c.label} className="gc-stat">
                <div className="gc-stat-label">{c.label}</div>
                <div className="gc-stat-value">{loading ? <div className="lb-skeleton" /> : c.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ref-rank-badge">
          REFERRAL RANK: {summary?.referral_rank ? `#${summary.referral_rank}` : 'UNRANKED'}
        </div>

        {/* Zone 5 — Monthly Cap Meters */}
        <div className="ref-meters">
          <div className="ref-meter">
            <div className="wt-input-label">MONTHLY SOL EARNED</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 40 }}>{monthSol.toFixed(4)} SOL</div>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>/ {REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL} SOL</span>
            <div className="gt-progress-track" style={{ marginTop: 8 }}>
              <div className="gt-progress-fill" style={{ width: `${Math.min(100, (monthSol / REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL) * 100)}%` }} />
            </div>
            {monthSol >= REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL && <div className="ref-cap-reached">MONTHLY CAP REACHED</div>}
            {monthSol >= REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL * 0.8 && monthSol < REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL && <div className="ref-cap-warning">Approaching monthly limit</div>}
          </div>
          <div className="ref-meter">
            <div className="wt-input-label">MONTHLY CONVERSIONS</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 40 }}>{monthConv.length}</div>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>/ {REFERRAL_CONFIG.MAX_CONVERSIONS_30D}</span>
            <div className="gt-progress-track" style={{ marginTop: 8 }}>
              <div className="gt-progress-fill" style={{ width: `${Math.min(100, (monthConv.length / REFERRAL_CONFIG.MAX_CONVERSIONS_30D) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Zone 6 — Conversion Feed */}
        <div className="wt-history">
          <div className="wt-history-header">
            <h2 className="wt-gate-title">Conversion History</h2>
            <span className="wt-history-count">{conversions.length} total</span>
          </div>
          <div className="cf-filters" style={{ marginBottom: 16 }}>
            {(['all', 'dispatched', 'pending', 'skipped'] as ConvFilter[]).map((f) => (
              <button key={f} type="button" className={`cf-filter-tab${convFilter === f ? ' cf-filter-tab--active' : ''}`}
                onClick={() => { setConvFilter(f); setConvPage(0); }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="lb-empty" style={{ padding: '40px 0' }}>
              <p>No conversions yet.</p>
              <p style={{ fontSize: 12 }}>Share your link to start earning. {REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL} SOL per verified approval.</p>
            </div>
          ) : (
            <>
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Referred Wallet</th>
                    <th>Reward</th>
                    <th>Status</th>
                    <th>TX</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c: ReferralConversion) => (
                    <tr key={c.id} className={`lb-table-row${c.reward_status === 'skipped' ? ' wt-row-rejected' : ''}`}
                      onClick={() => c.reward_status === 'skipped' && setExpandedSkip(expandedSkip === c.id ? null : c.id)}>
                      <td className="lb-table-time">{timeAgo(c.created_at)}</td>
                      <td className="lb-table-wallet">{truncateWallet(c.referred_wallet)}</td>
                      <td className="lb-table-sol">{c.reward_status === 'skipped' ? '—' : formatSol(c.reward_sol)}</td>
                      <td>
                        <span className={`wt-status-badge wt-status-badge--${c.reward_status === 'dispatched' ? 'approved' : c.reward_status === 'pending' ? 'pending' : 'rejected'}`}>
                          {c.reward_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="lb-table-action">
                        {c.reward_tx_signature ? (
                          <a href={`https://solscan.io/tx/${c.reward_tx_signature}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>View TX →</a>
                        ) : c.reward_status === 'pending' ? (
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>Pending dispatch</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > PAGE_SIZE && (
                <div className="lb-pagination">
                  <button type="button" className="sf-btn-ghost" disabled={convPage === 0} onClick={() => setConvPage((p) => p - 1)}>&larr; PREV</button>
                  <span className="lb-pagination-info">Showing {convPage * PAGE_SIZE + 1}–{Math.min((convPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                  <button type="button" className="sf-btn-ghost" disabled={convPage >= totalPages - 1} onClick={() => setConvPage((p) => p + 1)}>NEXT &rarr;</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Zone 8 — How It Works */}
        <div style={{ marginTop: 64, marginBottom: 48 }}>
          <div className="gc-section-num">How Referrals Work</div>
          <div className="gc-steps-grid" style={{ marginTop: 24 }}>
            {[
              { num: '01', title: 'Get Your Link', desc: 'Connect your wallet. Your unique referral link is generated instantly — no sign-up, no application.' },
              { num: '02', title: 'Share It', desc: 'Post your link on X, Telegram, group chats, anywhere someone might be paying for gas. 7-day attribution window.' },
              { num: '03', title: 'They Submit', desc: 'Your referral submits a gas receipt using your link. All 10 verification gates must pass for the conversion to count.' },
            ].map((s) => (
              <div key={s.num} className="gc-step">
                <div className="gc-step-ghost">{s.num}</div>
                <div className="gc-step-index">Step {s.num}</div>
                <div className="gc-step-title">{s.title}</div>
                <p className="gc-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48 }} id="rules">
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 32, marginBottom: 16 }}>Referral Rules</h3>
            <div className="ref-rules-pills">
              {[
                `${REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL} SOL per conversion`,
                `Max ${REFERRAL_CONFIG.MAX_CONVERSIONS_30D} conversions per 30 days`,
                `Max ${REFERRAL_CONFIG.MAX_REFERRAL_REWARDS_30D_SOL} SOL per 30 days`,
                'No self-referrals',
                'Referrer must be approved submitter',
                'All gates must pass to count',
              ].map((rule) => (
                <span key={rule} className="ref-rule-pill">{rule}</span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
