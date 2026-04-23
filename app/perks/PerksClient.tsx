'use client';

import { useEffect, useState } from 'react';
import { Nav } from '../../components/Nav';
import { WalletButton } from '../../components/ui/WalletButton';
import { TierBadge } from '../../components/shared/TierBadge';
import { LadderRung } from '../../components/perks/LadderRung';
import { useTokenGating } from '../../hooks/useTokenGating';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';
import { TOKEN_TIERS } from '../../lib/token-tiers';
import { refreshTokenBalance } from '../actions/token-gating';

interface LadderData {
  wallet: string;
  xHandle: string;
  earn: {
    pointsLast30: number;
    pointsPrior30: number;
    pointsLifetime: number;
    pointsTrend: 'up' | 'down' | 'flat';
  };
  reach: Array<{
    slug: string;
    label: string;
    description: string;
    axis: string;
    threshold: number;
    current: number;
    progressPct: number;
    minted: boolean;
  }>;
  influence: {
    composite: number;
    band: { id: string; label: string; description: string };
    nextBand: { id: string; label: string; min: number } | null;
    axes: {
      payoutPct: number;
      engagementPct: number;
      consistencyPct: number;
      referralPct: number;
    };
    computedAt: string | null;
  };
  market: {
    live: boolean;
    eligibleBriefs: Array<{
      id: number;
      title: string;
      amountUsdc: number;
      deadline: string;
      minCreatorTier: string | null;
    }>;
  };
}

export default function PerksClient() {
  const { address, isConnected } = useGascoinWallet();
  const { balance, tier, nextTier, tokensToNextTier, progressToNextTier, loading } = useTokenGating();
  const [refreshed, setRefreshed] = useState(false);
  const [ladder, setLadder] = useState<LadderData | null>(null);
  const [ladderLoading, setLadderLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setLadder(null);
      return;
    }
    let cancelled = false;
    setLadderLoading(true);
    fetch('/api/me/ladder', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setLadder(data as LadderData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLadderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const handleRefresh = async () => {
    if (!address) return;
    await refreshTokenBalance(address);
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2000);
  };

  return (
    <div className="container">
      <Nav />

      {/* Header */}
      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— One ladder · Driver to Creator</span>
        </div>
        <h1 className="lb-title lb-title--iconed">
          <span className="lb-title-icon-wrap" aria-hidden>
            <img src="/icons/perks-gift.jpg" alt="" className="lb-title-icon" />
          </span>
          PERKS
        </h1>
        <p className="gt-header-body">
          Every rung of the GASCOIN protocol in one place. Hold tokens for driver perks,
          post to earn airdrop points, compound into Reach Certificates, unlock
          Marketplace briefs. Same pipeline, five visible milestones.
        </p>
      </header>

      {/* ─── RUNG 1: HOLD ──────────────────────────────────────────── */}
      <LadderRung
        index="01"
        title="HOLD"
        subtitle="Hold GASCOIN to unlock refund cap, queue priority, and platform badges."
        headline={isConnected ? tier.name.toUpperCase() : 'CONNECT WALLET'}
        subheadline={
          isConnected
            ? loading
              ? 'Checking balance…'
              : `${Math.round(balance).toLocaleString()} GASCOIN`
            : 'See your tier and progress'
        }
        progressPct={isConnected && nextTier ? progressToNextTier : undefined}
        progressTarget={
          isConnected && nextTier
            ? `NEXT: ${nextTier.name.toUpperCase()} · ${tokensToNextTier.toLocaleString()} more GASCOIN`
            : isConnected
              ? 'MAXIMUM TIER REACHED'
              : undefined
        }
        stateBadge={
          isConnected
            ? { label: `${tier.name} tier`, tone: 'good' }
            : { label: 'Locked', tone: 'muted' }
        }
      >
        {!isConnected ? (
          <div style={{ marginTop: 12 }}>
            <WalletButton />
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="sf-btn-ghost"
              style={{ padding: '8px 16px', fontSize: 10 }}
              onClick={handleRefresh}
            >
              {refreshed ? 'REFRESHED ✓' : 'REFRESH BALANCE'}
            </button>
          </div>
        )}
      </LadderRung>

      {/* ─── RUNG 2: EARN ──────────────────────────────────────────── */}
      <LadderRung
        index="02"
        title="EARN"
        subtitle="Every post through the submit flow earns engagement points toward the airdrop. Points also feed your Composite score."
        headline={
          isConnected
            ? (ladder?.earn.pointsLifetime ?? 0).toLocaleString()
            : '—'
        }
        subheadline={isConnected ? 'LIFETIME ENGAGEMENT POINTS' : 'Connect wallet to see points'}
        stateBadge={
          !isConnected
            ? { label: 'Locked', tone: 'muted' }
            : ladder?.earn.pointsTrend === 'up'
              ? { label: 'Trending up', tone: 'good' }
              : ladder?.earn.pointsTrend === 'down'
                ? { label: 'Cooling', tone: 'alert' }
                : { label: 'Flat', tone: 'neutral' }
        }
        locked={!isConnected}
      >
        {isConnected && ladder && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 1,
              background: 'rgba(255,255,255,0.06)',
              marginTop: 16,
            }}
          >
            <StatCell label="LAST 30 DAYS" value={ladder.earn.pointsLast30.toLocaleString()} />
            <StatCell label="PRIOR 30" value={ladder.earn.pointsPrior30.toLocaleString()} />
            <StatCell
              label="DELTA"
              value={
                (ladder.earn.pointsLast30 - ladder.earn.pointsPrior30 >= 0 ? '+' : '') +
                (ladder.earn.pointsLast30 - ladder.earn.pointsPrior30).toLocaleString()
              }
            />
          </div>
        )}
      </LadderRung>

      {/* ─── RUNG 3: REACH ─────────────────────────────────────────── */}
      <LadderRung
        index="03"
        title="REACH"
        subtitle="Five soulbound Reach Certificates. Earned by crossing verified milestones — reach, influence, or referrals. Non-transferable, on-chain."
        headline={
          isConnected
            ? `${(ladder?.reach ?? []).filter((r) => r.minted).length}/5`
            : '—'
        }
        subheadline={isConnected ? 'CERTIFICATES MINTED' : 'Connect wallet to see progress'}
        stateBadge={
          !isConnected
            ? { label: 'Locked', tone: 'muted' }
            : (ladder?.reach ?? []).some((r) => r.minted)
              ? { label: 'Minting active', tone: 'good' }
              : { label: 'In progress', tone: 'neutral' }
        }
        locked={!isConnected}
      >
        {isConnected && ladder && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 1,
              background: 'rgba(255,255,255,0.06)',
              marginTop: 16,
            }}
          >
            {ladder.reach.map((r) => (
              <div
                key={r.slug}
                style={{
                  background: r.minted ? 'rgba(158,228,147,0.06)' : '#000',
                  padding: 16,
                  border: r.minted ? '1px solid rgba(158,228,147,0.3)' : undefined,
                }}
              >
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, marginBottom: 4 }}>
                  {r.label.toUpperCase()}
                </div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: 12,
                    minHeight: 28,
                  }}
                >
                  {r.description}
                </div>
                <div className="gt-progress-track" style={{ marginBottom: 6 }}>
                  <div className="gt-progress-fill" style={{ width: `${r.progressPct}%` }} />
                </div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 10,
                    color: r.minted ? '#9EE493' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {r.minted
                    ? '✓ MINTED'
                    : `${formatAxisValue(r.current, r.axis)} / ${formatAxisValue(r.threshold, r.axis)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </LadderRung>

      {/* ─── RUNG 4: INFLUENCE ─────────────────────────────────────── */}
      <LadderRung
        index="04"
        title="INFLUENCE"
        subtitle="Your Composite Influence Score — a 0-100 measure of payout earned, engagement moved, consistency, and referrals. Rebuilt nightly."
        headline={
          isConnected && ladder
            ? Math.round(ladder.influence.composite).toString()
            : '—'
        }
        subheadline={
          isConnected && ladder
            ? `BAND: ${ladder.influence.band.label.toUpperCase()} · ${ladder.influence.band.description}`
            : 'Connect wallet to see composite'
        }
        progressPct={
          isConnected && ladder && ladder.influence.nextBand
            ? Math.min(
                100,
                Math.round(
                  (ladder.influence.composite / (ladder.influence.nextBand.min || 1)) * 100,
                ),
              )
            : undefined
        }
        progressTarget={
          isConnected && ladder?.influence.nextBand
            ? `NEXT BAND: ${ladder.influence.nextBand.label.toUpperCase()} at ${ladder.influence.nextBand.min}`
            : isConnected
              ? 'TOP BAND REACHED'
              : undefined
        }
        stateBadge={
          !isConnected
            ? { label: 'Locked', tone: 'muted' }
            : { label: ladder?.influence.band.label ?? '—', tone: 'neutral' }
        }
        locked={!isConnected}
      >
        {isConnected && ladder && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontFamily: 'IBM Plex Mono',
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 8,
              }}
            >
              AXIS BREAKDOWN
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 1,
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <StatCell label="PAYOUT" value={`${Math.round(ladder.influence.axes.payoutPct)}%`} />
              <StatCell label="ENGAGEMENT" value={`${Math.round(ladder.influence.axes.engagementPct)}%`} />
              <StatCell label="CONSISTENCY" value={`${Math.round(ladder.influence.axes.consistencyPct)}%`} />
              <StatCell label="REFERRALS" value={`${Math.round(ladder.influence.axes.referralPct)}%`} />
            </div>
            {ladder.influence.computedAt && (
              <div
                style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 12,
                }}
              >
                Last rebuild: {new Date(ladder.influence.computedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </LadderRung>

      {/* ─── RUNG 5: EARN-AS-CREATOR ───────────────────────────────── */}
      <LadderRung
        index="05"
        title="EARN AS CREATOR"
        subtitle="Brands escrow USDC. You deliver a post that meets the threshold. The contract releases. No middleman."
        headline={
          !isConnected
            ? '—'
            : !ladder?.market.live
              ? 'COMING SOON'
              : `${ladder.market.eligibleBriefs.length} brief${ladder.market.eligibleBriefs.length === 1 ? '' : 's'}`
        }
        subheadline={
          !isConnected
            ? 'Connect wallet to see eligibility'
            : !ladder?.market.live
              ? 'Marketplace opens after first cohort is onboarded'
              : ladder.market.eligibleBriefs.length > 0
                ? 'YOU QUALIFY — APPLY BELOW'
                : 'Raise your Composite score to unlock briefs'
        }
        stateBadge={
          !isConnected
            ? { label: 'Locked', tone: 'muted' }
            : !ladder?.market.live
              ? { label: 'Soon', tone: 'alert' }
              : ladder.market.eligibleBriefs.length > 0
                ? { label: 'Eligible', tone: 'good' }
                : { label: 'Keep posting', tone: 'neutral' }
        }
        locked={!isConnected}
      >
        {isConnected && ladder?.market.live && ladder.market.eligibleBriefs.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {ladder.market.eligibleBriefs.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: 16,
                  marginBottom: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 500, fontSize: 14 }}>
                    {b.title}
                  </div>
                  <div
                    style={{
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.4)',
                      marginTop: 4,
                    }}
                  >
                    Deadline: {new Date(b.deadline).toLocaleDateString()}
                    {b.minCreatorTier ? ` · Min: ${b.minCreatorTier}` : ''}
                  </div>
                </div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 24 }}>
                  ${b.amountUsdc.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </LadderRung>

      {ladderLoading && !ladder && (
        <div
          style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            padding: 24,
          }}
        >
          LOADING LADDER…
        </div>
      )}

      {/* ─── Rung 1 detail: All Token Tiers ─────────────────────────── */}
      <div className="gc-section-num" style={{ marginBottom: 16, marginTop: 64 }}>
        Rung 01 Detail · All Token Tiers
      </div>
      <div
        className="gc-steps-grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 1,
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        {TOKEN_TIERS.map((t) => {
          const isCurrent = isConnected && tier.id === t.id;
          const isNext = isConnected && nextTier?.id === t.id;
          return (
            <div
              key={t.id}
              className="gc-step"
              style={{
                background: isCurrent ? 'rgba(255,255,255,0.04)' : '#000',
                border: isCurrent
                  ? '1px solid rgba(255,255,255,0.4)'
                  : isNext
                    ? '1px solid rgba(255,255,255,0.2)'
                    : undefined,
              }}
            >
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, marginBottom: 8 }}>
                {t.name.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 16,
                }}
              >
                {t.min_tokens > 0 ? `Hold ${t.min_tokens.toLocaleString()} GASCOIN` : 'No minimum'}
              </div>
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: 16,
                  marginBottom: 16,
                }}
              >
                {t.perks.map((p) => (
                  <div
                    key={p}
                    style={{
                      fontFamily: 'IBM Plex Sans',
                      fontWeight: 300,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.65)',
                      lineHeight: 1.7,
                    }}
                  >
                    → {p}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    Refund Cap
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 500, fontSize: 13 }}>
                    Tier-based
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    Queue
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 500, fontSize: 13 }}>
                    #{t.queue_priority}
                  </div>
                </div>
              </div>
              {isCurrent && (
                <div
                  style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 12,
                  }}
                >
                  ← YOUR CURRENT TIER
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Badges */}
      <div style={{ marginTop: 48, marginBottom: 64 }}>
        <div className="gc-section-num" style={{ marginBottom: 16 }}>
          Tier Badges
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {TOKEN_TIERS.map((t) => (
            <div
              key={t.id}
              style={{
                padding: 16,
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
                minWidth: 120,
              }}
            >
              {t.badge_label ? (
                <TierBadge tier={t} />
              ) : (
                <span
                  style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  No badge
                </span>
              )}
              <div
                style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 8,
                }}
              >
                {t.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DEX links */}
      <div
        style={{
          marginTop: 48,
          marginBottom: 64,
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 32,
        }}
      >
        <div className="gc-section-num" style={{ marginBottom: 16 }}>
          Where to Buy GASCOIN
        </div>
        <p
          style={{
            fontFamily: 'IBM Plex Sans',
            fontWeight: 300,
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          GASCOIN trades on Ethereum DEXes. Your tier is checked live at submission time —
          upgrades take effect immediately, no re-connecting required.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="https://app.uniswap.org/swap"
            target="_blank"
            rel="noopener"
            className="sf-btn-solid"
            style={{ textDecoration: 'none' }}
          >
            Buy on Uniswap →
          </a>
          <a
            href="https://app.1inch.io"
            target="_blank"
            rel="noopener"
            className="sf-btn-ghost"
            style={{ textDecoration: 'none' }}
          >
            Buy on 1inch →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ───────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#000', padding: 16 }}>
      <div
        style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 10,
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 24 }}>{value}</div>
    </div>
  );
}

function formatAxisValue(n: number, axis: string): string {
  if (axis === 'composite') return `Composite ${Math.round(n)}`;
  if (axis === 'paid_conversions') return `${n.toLocaleString()} conv.`;
  return n.toLocaleString();
}
