'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CreatorProfile, CreatorPost, CreatorImpact, CreatorCertificate } from '../../../lib/creator-profile';
import { formatEth } from '../../../lib/formatters';

interface Props {
  profile: CreatorProfile;
  posts: CreatorPost[];
  impact: CreatorImpact;
  certs?: CreatorCertificate[];
}

type Tab = 'posts' | 'earnings';

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CreatorProfileClient({ profile, posts, impact, certs = [] }: Props) {
  const [tab, setTab] = useState<Tab>('posts');

  return (
    <main className="gc-creator">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <header className="gc-creator-hero">
        <div className="gc-creator-hero-inner">
          {profile.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profileImageUrl}
              alt=""
              className="gc-creator-avatar"
              aria-hidden
            />
          ) : (
            <div className="gc-creator-avatar gc-creator-avatar--placeholder" aria-hidden>
              {profile.handle.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="gc-creator-hero-meta">
            <div className="gc-creator-handle-row">
              <h1 className="gc-creator-handle">@{profile.handle}</h1>
              {profile.isVerified && (
                <span className="gc-creator-verified" title="Verified GASCOIN creator">
                  ✓ Verified
                </span>
              )}
              {profile.tier && (
                <span className="gc-creator-tier">{profile.tier}</span>
              )}
            </div>
            {profile.bio && <p className="gc-creator-bio">{profile.bio}</p>}
            <div className="gc-creator-sub">
              <a
                href={`https://etherscan.io/address/${profile.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono gc-creator-wallet"
                title={profile.wallet}
              >
                {profile.walletShort}
              </a>
              {profile.location && <span>· {profile.location}</span>}
              {profile.linkedAt && <span>· linked {fmtDate(profile.linkedAt)}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* ─── STATS STRIP ──────────────────────────────────────────────── */}
      <section className="gc-creator-stats">
        <div className="gc-creator-stat">
          <span className="gc-creator-stat-label">Total earned</span>
          <span className="gc-creator-stat-value">{formatEth(impact.totalEthEarned)}</span>
        </div>
        <div className="gc-creator-stat">
          <span className="gc-creator-stat-label">Posts scored</span>
          <span className="gc-creator-stat-value">{fmtInt(impact.totalPosts)}</span>
        </div>
        <div className="gc-creator-stat">
          <span className="gc-creator-stat-label">Total impressions</span>
          <span className="gc-creator-stat-value">{fmtInt(impact.totalImpressions)}</span>
        </div>
        <div className="gc-creator-stat">
          <span className="gc-creator-stat-label">Trust score</span>
          <span className="gc-creator-stat-value">
            {profile.avgQualityScore != null ? `${Math.round(profile.avgQualityScore)}/100` : '—'}
          </span>
        </div>
      </section>

      {/* ─── TABS ────────────────────────────────────────────────────── */}
      <nav className="gc-creator-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'posts'}
          className={`gc-creator-tab ${tab === 'posts' ? 'gc-creator-tab--active' : ''}`}
          onClick={() => setTab('posts')}
        >
          Posts · {posts.length}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'earnings'}
          className={`gc-creator-tab ${tab === 'earnings' ? 'gc-creator-tab--active' : ''}`}
          onClick={() => setTab('earnings')}
        >
          Earnings · {fmtInt(impact.totalPaidClaims)}
        </button>
      </nav>

      {/* ─── POSTS TAB ───────────────────────────────────────────────── */}
      {tab === 'posts' && (
        <section className="gc-creator-tab-body">
          {posts.length === 0 ? (
            <p className="gc-creator-empty">No scored posts yet.</p>
          ) : (
            <ul className="gc-creator-posts">
              {posts.map((p) => (
                <li key={p.tweetId} className="gc-creator-post">
                  <div className="gc-creator-post-meta">
                    <span className="gc-creator-post-date">{fmtDate(p.postedAt)}</span>
                    <a
                      href={p.tweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gc-creator-post-link"
                    >
                      view on X →
                    </a>
                  </div>
                  <div className="gc-creator-post-metrics">
                    <span>{fmtInt(p.impressions)} imp</span>
                    <span>{fmtInt(p.likes)} ♥</span>
                    <span>{fmtInt(p.retweets)} ↻</span>
                    <span>{fmtInt(p.replies)} 💬</span>
                    <span className="gc-creator-post-points">
                      {fmtInt(p.adjustedPoints)} pts
                    </span>
                    {p.impactScore != null && (
                      <span
                        className="gc-creator-post-impact"
                        title={`Direct ${formatEth(p.directPayoutEth || 0)} · Referral ${formatEth(p.referralPayoutEth || 0)} · ${p.referredWallets || 0} signups`}
                      >
                        impact {Math.round(p.impactScore)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ─── EARNINGS TAB ────────────────────────────────────────────── */}
      {tab === 'earnings' && (
        <section className="gc-creator-tab-body">
          {impact.totalPaidClaims === 0 ? (
            <p className="gc-creator-empty">No paid claims yet.</p>
          ) : (
            <div className="gc-creator-earnings">
              <p>
                Lifetime: <strong>{formatEth(impact.totalEthEarned)}</strong> across{' '}
                <strong>{impact.totalPaidClaims}</strong> paid claim
                {impact.totalPaidClaims === 1 ? '' : 's'}.
              </p>
              <p>
                Best-performing post: <strong>{fmtInt(impact.bestPostImpressions)}</strong> impressions.
              </p>
              <p className="gc-creator-sub">
                All payouts are on-chain ETH transfers. Verify individual transactions on{' '}
                <a
                  href={`https://etherscan.io/address/${profile.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Etherscan
                </a>
                .
              </p>
            </div>
          )}
        </section>
      )}

      {/* ─── CERTIFICATES ────────────────────────────────────────────── */}
      {certs.length > 0 && (
        <section className="gc-creator-certs">
          <h2 className="gc-creator-certs-title">Reach Certificates</h2>
          <p className="gc-creator-certs-sub">
            Soulbound ERC-721 tokens minted by GASCOIN for verified milestones. Non-transferable.
          </p>
          <ul className="gc-creator-cert-list">
            {certs.map((c) => (
              <li key={`${c.milestone}-${c.tokenId}`} className="gc-creator-cert">
                <span className="gc-creator-cert-badge">{c.milestone}</span>
                <span className="gc-creator-cert-amount">{fmtInt(c.amount)}</span>
                {c.mintedAt && <span className="gc-creator-cert-date">{fmtDate(c.mintedAt)}</span>}
                {c.txHash && !c.txHash.startsWith('DRYRUN_') && (
                  <a
                    href={`https://etherscan.io/tx/${c.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gc-creator-cert-link"
                  >
                    view tx →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="gc-creator-footer">
        <Link href="/how-it-works">How GASCOIN works →</Link>
      </footer>
    </main>
  );
}
