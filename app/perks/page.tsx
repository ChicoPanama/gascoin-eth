'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Nav } from '../../components/Nav';
import { WalletButton } from '../../components/ui/WalletButton';
import { TierBadge } from '../../components/shared/TierBadge';
import { useTokenGating } from '../../hooks/useTokenGating';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';
import { TOKEN_TIERS } from '../../lib/token-tiers';
import { refreshTokenBalance } from '../actions/token-gating';

export default function PerksPage() {
  const { address, isConnected } = useGascoinWallet();
  const { balance, tier, nextTier, tokensToNextTier, progressToNextTier, loading } = useTokenGating();
  const [refreshed, setRefreshed] = useState(false);

  const handleRefresh = async () => {
    if (!address) return;
    await refreshTokenBalance(address);
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2000);
  };

  return (
    <div className="container">
      <Nav />

      {/* Zone 1 — Header */}
      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— Hold GASCOIN · Unlock Perks</span>
        </div>
        <h1 className="lb-title lb-title--iconed">
          <span className="lb-title-icon-wrap" aria-hidden>
            <img src="/icons/perks-gift.jpg" alt="" className="lb-title-icon" />
          </span>
          TOKEN PERKS
        </h1>
        <p className="gt-header-body">
          Hold GASCOIN in your connected wallet to unlock submission priority,
          higher refund caps, and platform-wide status badges.
        </p>
      </header>

      {/* Zone 2 — Your Status */}
      <div className="ref-link-section" style={{ marginBottom: 48 }}>
        {!isConnected ? (
          <div className="ref-gate" style={{ border: 'none', gridColumn: '1 / -1' }}>
            <div className="wt-input-label" style={{ marginBottom: 16 }}>CONNECT WALLET TO SEE YOUR TIER</div>
            <WalletButton />
          </div>
        ) : (
          <>
            <div className="ref-link-main">
              <div className="wt-input-label">YOUR TIER</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 56, marginBottom: 16 }}>{tier.name.toUpperCase()}</div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 16, marginBottom: 4 }}>
                {loading ? '...' : `${Math.round(balance).toLocaleString()} GASCOIN`}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                {loading ? 'Checking...' : 'Balance checked'}
              </div>
              <button type="button" className="sf-btn-ghost" style={{ padding: '8px 16px', fontSize: 10 }} onClick={handleRefresh}>
                {refreshed ? 'REFRESHED ✓' : 'REFRESH BALANCE'}
              </button>
            </div>
            <div className="ref-link-rewards">
              <div className="wt-input-label" style={{ marginBottom: 24 }}>PROGRESS TO NEXT TIER</div>
              {nextTier ? (
                <>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    NEXT TIER: {nextTier.name.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 300, fontSize: 14, marginBottom: 12 }}>
                    {tokensToNextTier.toLocaleString()} more GASCOIN needed
                  </div>
                  <div className="gt-progress-track" style={{ marginBottom: 8 }}>
                    <div className="gt-progress-fill" style={{ width: `${progressToNextTier}%` }} />
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {progressToNextTier}% of the way there
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 8 }}>MAXIMUM TIER REACHED</div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    You hold the highest GASCOIN tier on the platform.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Zone 3 — Tier Comparison */}
      <div className="gc-section-num" style={{ marginBottom: 16 }}>All Tiers</div>
      <div className="gc-steps-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.06)' }}>
        {TOKEN_TIERS.map((t) => {
          const isCurrent = isConnected && tier.id === t.id;
          const isNext = isConnected && nextTier?.id === t.id;
          return (
            <div key={t.id} className="gc-step" style={{
              background: isCurrent ? 'rgba(255,255,255,0.04)' : '#000',
              borderColor: isCurrent ? 'rgba(255,255,255,0.4)' : isNext ? 'rgba(255,255,255,0.2)' : undefined,
              border: isCurrent ? '1px solid rgba(255,255,255,0.4)' : isNext ? '1px solid rgba(255,255,255,0.2)' : undefined,
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, marginBottom: 8 }}>{t.name.toUpperCase()}</div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                {t.min_tokens > 0 ? `Hold ${t.min_tokens.toLocaleString()} GASCOIN` : 'No minimum'}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginBottom: 16 }}>
                {t.perks.map((p) => (
                  <div key={p} style={{ fontFamily: 'IBM Plex Sans', fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
                    → {p}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Refund Cap</div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 500, fontSize: 13 }}>Tier-based</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Queue</div>
                  <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 500, fontSize: 13 }}>#{t.queue_priority}</div>
                </div>
              </div>
              {isCurrent && <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>← YOUR CURRENT TIER</div>}
            </div>
          );
        })}
      </div>

      {/* Zone 4 — How It Works */}
      <div style={{ marginTop: 64 }}>
        <div className="gc-section-num" style={{ marginBottom: 16 }}>How Token Gating Works</div>
        <div className="gc-steps-grid">
          {[
            { num: '01', title: 'Acquire GASCOIN', desc: 'Buy GASCOIN on Raydium or Jupiter. Or earn through referrals and platform participation. Your tier is checked live at submission time — upgrades take effect immediately, no re-connecting required.' },
            { num: '02', title: 'Hold in Your Wallet', desc: 'Keep GASCOIN in your connected wallet. Balance is checked live on-chain at submission time.' },
            { num: '03', title: 'Submit & Earn More', desc: 'Higher tier = higher refund cap per submission. Your tier is snapshotted at submission time.' },
          ].map((s) => (
            <div key={s.num} className="gc-step">
              <div className="gc-step-ghost">{s.num}</div>
              <div className="gc-step-index">Step {s.num}</div>
              <div className="gc-step-title">{s.title}</div>
              <p className="gc-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Zone 5 — Badge Display */}
      <div style={{ marginTop: 48, marginBottom: 64 }}>
        <div className="gc-section-num" style={{ marginBottom: 16 }}>Tier Badges</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {TOKEN_TIERS.map((t) => (
            <div key={t.id} style={{ padding: 16, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', minWidth: 120 }}>
              {t.badge_label ? <TierBadge tier={t} /> : <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>No badge</span>}
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DEX Links */}
      <div style={{ marginTop: 48, marginBottom: 64, border: '1px solid rgba(255,255,255,0.08)', padding: 32 }}>
        <div className="gc-section-num" style={{ marginBottom: 16 }}>Where to Buy GASCOIN</div>
        <p style={{ fontFamily: 'IBM Plex Sans', fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 24 }}>
          GASCOIN trades on Solana DEXes. Your tier is checked live at submission time — upgrades take effect immediately, no re-connecting required.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="https://raydium.io/swap" target="_blank" rel="noopener" className="sf-btn-solid" style={{ textDecoration: 'none' }}>
            Buy on Raydium →
          </a>
          <a href="https://jup.ag" target="_blank" rel="noopener" className="sf-btn-ghost" style={{ textDecoration: 'none' }}>
            Buy on Jupiter →
          </a>
        </div>
      </div>
    </div>
  );
}
