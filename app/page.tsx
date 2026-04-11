import Link from 'next/link';
import { HomeNav } from '../components/HomeNav';
import { LeaderboardTeaser } from '../components/leaderboard/LeaderboardTeaser';
import { CommunityTeaser } from '../components/community/CommunityTeaser';
import { GatesTeaser } from '../components/gates/GatesTeaser';
import { WalletTrackerTeaser } from '../components/wallet-tracker/WalletTrackerTeaser';
import { ReferralTeaser } from '../components/referral/ReferralTeaser';
import { HeroStagger, HeroItem } from '../components/ui/HeroStagger';
import { ScrollReveal } from '../components/ui/ScrollReveal';
import { DEMO_TREASURY_DISPLAY, fallback } from '../lib/demo-data';

function UsdcIcon() {
  return (
    <span className="gc-mini-icon" aria-hidden>
      <img src="https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694" alt="" loading="lazy" decoding="async" />
    </span>
  );
}

function GascoinTokenIcon() {
  return (
    <span className="gc-mini-icon gc-mini-icon--gascoin" aria-hidden>
      <img src="/logo/gascoin-g.jpg" alt="" loading="lazy" decoding="async" />
    </span>
  );
}

export default async function Home() {
  let treasuryUsd = '—';
  let marketCap = '—';
  let volume = '—';
  let gates = '10';

  try {
    const { getTreasuryBalances } = await import('../lib/integrations/solana');
    const t = await getTreasuryBalances();
    if (t.solBalance > 0 || t.gascoinBalance > 0) {
      const total = t.solUsd + t.gascoinUsd;
      treasuryUsd = total >= 1_000_000 ? `$${(total / 1_000_000).toFixed(1)}M` : `$${Math.round(total).toLocaleString()}`;
    }
  } catch {}

  try {
    const { getMarketSnapshot } = await import('../lib/integrations/pricing');
    const m = await getMarketSnapshot();
    const mc = Number(m.marketCapUsd);
    const vol = Number(m.volume24hUsd);
    if (mc > 0) marketCap = mc >= 1_000_000 ? `$${(mc / 1_000_000).toFixed(1)}M` : `$${mc.toLocaleString()}`;
    if (vol > 0) volume = vol >= 1_000_000 ? `$${(vol / 1_000_000).toFixed(1)}M` : vol >= 1_000 ? `$${(vol / 1_000).toFixed(0)}K` : `$${vol.toLocaleString()}`;
  } catch {}

  // Demo data fallback — yields to real data when treasury/market are live
  treasuryUsd = fallback(treasuryUsd, DEMO_TREASURY_DISPLAY.treasuryUsd);
  marketCap = fallback(marketCap, DEMO_TREASURY_DISPLAY.marketCap);
  volume = fallback(volume, DEMO_TREASURY_DISPLAY.volume);
  const isDemo = treasuryUsd === DEMO_TREASURY_DISPLAY.treasuryUsd;

  return (
    <>
        {/* NAV */}
        <HomeNav />
        <main id="main-content">

        {/* HERO */}
        <section className="gc-hero">
          <div className="gc-hero-ghost">G</div>
          <div className="gc-hero-logo-float" aria-hidden>
            <div className="gc-hero-logo-shadow" />
            <div className="gc-hero-logo-g-layer">
              <img src="/logo/gascoin-g.jpg" alt="" className="gc-hero-logo-image gc-hero-logo-image--g" />
            </div>
          </div>
          <div className="gc-hero-content">
            <HeroStagger>
              <HeroItem>
                <div className="gc-section-label">— Solana · On-Chain Gas Refunds</div>
              </HeroItem>
              <HeroItem>
                <h1>
                  <span className="line">Get <span className="gc-hero-glow">GAS</span>.</span>
                  <span className="line">Post.</span>
                  <span className="line">Submit.</span>
                  <span className="line">Get <span className="gc-hero-glow">PAID BACK</span>.</span>
                </h1>
              </HeroItem>
              <HeroItem>
                <p className="gc-hero-body">
                  Gas prices are crushing everyday people. GASCOIN is a community-funded
                  movement on Solana that gives real money back for real gas purchases.
                  Post proof on X, submit your receipt, and receive SOL directly to your
                  wallet. No middlemen. No delays. Just people helping people.
                </p>
              </HeroItem>
              <HeroItem>
                <div className="gc-hero-buttons">
                  <Link href="/how-it-works" className="gc-btn-ghost">How It Works</Link>
                  <Link href="/submit" className="gc-btn-solid">Submit Receipt</Link>
                  <Link href="/community" className="gc-btn-ghost">View Community</Link>
                </div>
              </HeroItem>
            </HeroStagger>
          </div>
        </section>

        {/* STATS */}
        <section className="gc-stats glass-card">
          <div className="gc-stats-grid">
            <div className="gc-stat">
              <div className="gc-stat-label">
                Treasury Balance
                <span className="gc-pulse" />
              </div>
              <div className="gc-stat-value">{treasuryUsd}</div>
              <div className="gc-stat-sub">
                <span className="gc-inline-token"><UsdcIcon />USDC</span> + <span className="gc-inline-token"><GascoinTokenIcon />GASCOIN</span> · {isDemo ? 'Simulated' : 'Live'}
              </div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Market Cap</div>
              <div className="gc-stat-value">{marketCap}</div>
              <div className="gc-stat-sub">Fully Diluted</div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">24h Volume</div>
              <div className="gc-stat-value">{volume}</div>
              <div className="gc-stat-sub">Trading Volume</div>
            </div>
            <div className="gc-stat">
              <div className="gc-stat-label">Gates</div>
              <div className="gc-stat-value">{gates}</div>
              <div className="gc-stat-sub">Verification Steps</div>
            </div>
          </div>
          {isDemo && (
            <div style={{ padding: '12px 48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--muted-deep)' }}>
              Pre-Launch · Demo Data · Real Payouts Coming Soon
            </div>
          )}
        </section>

        {/* CTA BAND */}
        <section className="gc-cta-band">
          <div className="gc-cta-band-inner">
            <h2 className="gc-cta-band-headline">Ready to Claim?</h2>
            <Link href="/submit" className="gc-btn-solid">Submit Receipt &rarr;</Link>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="gc-section">
          <div className="gc-section-header">
            <div className="gc-section-num">01</div>
            <h2 className="gc-section-title">How It Works</h2>
          </div>
          <div className="gc-steps-grid">
            <div className="gc-step">
              <div className="gc-step-ghost">01</div>
              <div className="gc-step-index">Step 01</div>
              <div className="gc-step-title">Tweet #gascoin</div>
              <p className="gc-step-desc">
                Post a tweet with the #gascoin hashtag from your verified X account.
                This registers your intent and links your social identity to the
                refund pipeline.
              </p>
            </div>
            <div className="gc-step">
              <div className="gc-step-ghost">02</div>
              <div className="gc-step-index">Step 02</div>
              <div className="gc-step-title">Submit Your Receipt</div>
              <p className="gc-step-desc">
                Upload a photo of your gas receipt with your wallet address written
                on it. Our system runs 10 automated verification gates against
                every submission.
              </p>
            </div>
            <div className="gc-step">
              <div className="gc-step-ghost">03</div>
              <div className="gc-step-index">Step 03</div>
              <div className="gc-step-title">Get SOL Back</div>
              <p className="gc-step-desc">
                Once all verification gates pass, SOL is sent directly to your
                wallet. Fully on-chain. Fully transparent. The community funds
                the treasury, the treasury pays you back.
              </p>
            </div>
          </div>
        </section>

        {/* AI-POWERED PLATFORM */}
        <section className="gc-tech">
          <div className="gc-tech-inner">
            <div className="gc-tech-header">
              <div className="gc-section-num">02 — The Technology</div>
              <h2 className="gc-tech-title">
                <span>AI-Powered</span>
                <span className="gc-tech-title-ghost">From Upload to Payout</span>
              </h2>
              <p className="gc-tech-sub">
                Every layer of GASCOIN runs on AI. Receipt verification, fraud detection,
                tweet analysis, engagement scoring, and referral validation — all automated,
                all real-time, all at a fraction of a cent per operation.
              </p>
            </div>

            <div className="gc-tech-pipeline">
              {/* Layer 1 — Gemini Vision */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">01</div>
                <div className="gc-tech-layer-icon">
                  <img src="/icons/grok-icon.jpg" alt="Gemini" className="gc-tech-layer-icon-img" />
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Gemini Vision</div>
                  <div className="gc-tech-layer-tag">GEMINI 2.0 FLASH · RECEIPT ANALYSIS</div>
                  <p className="gc-tech-layer-desc">
                    Upload a receipt photo and Gemini Vision extracts everything in one call — country,
                    date, total amount, and your wallet characters. Simultaneously scores
                    fraud signals: physical receipt check, gas station verification, manipulation
                    detection, handwriting analysis, and EXIF forensics. One API call. Sub-second.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">OCR Extract</span>
                    <span className="gc-tech-catch">EXIF Forensics</span>
                    <span className="gc-tech-catch">Tamper Score</span>
                    <span className="gc-tech-catch">dHash + SHA-256</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 2 — Grok Reasoning */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">02</div>
                <div className="gc-tech-layer-icon">
                  <img src="/icons/xai-icon.jpg" alt="Grok" className="gc-tech-layer-icon-img" />
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Grok Reasoning Engine</div>
                  <div className="gc-tech-layer-tag">GROK 4.1 FAST REASONING · xAI</div>
                  <p className="gc-tech-layer-desc">
                    Grok receives all signals from Gemini and reasons about what they mean together.
                    A receipt that passes image analysis might still be suspicious when cross-referenced
                    against account age, location, and submission history. Grok catches what individual
                    checks miss. Also powers tweet quality scoring and audit narratives.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Cross-Validation</span>
                    <span className="gc-tech-catch">Fraud Reasoning</span>
                    <span className="gc-tech-catch">Tweet Quality</span>
                    <span className="gc-tech-catch">Pattern Analysis</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 3 — X API v2 */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">03</div>
                <div className="gc-tech-layer-icon">
                  <img src="/icons/xai-icon.jpg" alt="X" className="gc-tech-layer-icon-img" />
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">X API v2 Intelligence</div>
                  <div className="gc-tech-layer-tag">100% DATA PERSISTENCE · REAL-TIME VERIFICATION</div>
                  <p className="gc-tech-layer-desc">
                    Every field from the X API is captured and stored — followers, following, tweets,
                    account age, bio, location, protected status. Historical snapshots track changes
                    over time. Follower dumps and bot injection spikes are detected automatically.
                    Nothing is discarded. Every data point feeds the scoring engine.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Tweet Verification</span>
                    <span className="gc-tech-catch">Account Quality</span>
                    <span className="gc-tech-catch">Historical Tracking</span>
                    <span className="gc-tech-catch">Handle Sync</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 4 — Claude Oversight */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">04</div>
                <div className="gc-tech-layer-icon">
                  <img src="/icons/grok-icon.jpg" alt="Claude" className="gc-tech-layer-icon-img" />
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Claude Oversight</div>
                  <div className="gc-tech-layer-tag">CLAUDE SONNET · ANTHROPIC · FINAL REVIEW</div>
                  <p className="gc-tech-layer-desc">
                    Before SOL leaves the treasury, Claude reviews the complete submission package —
                    all 12 gate results, fraud scores, location signals, X account metrics, and
                    submission history. Returns a verdict with a written audit narrative.
                    The manager that signs off before money moves.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Full Context Review</span>
                    <span className="gc-tech-catch">Audit Narrative</span>
                    <span className="gc-tech-catch">Final Verdict</span>
                    <span className="gc-tech-catch">Payout Gate</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 5 — Location Intelligence */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">05</div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Location Intelligence</div>
                  <div className="gc-tech-layer-tag">EDGE PROXY · GEOBLOCKING · GPS CROSS-REFERENCE</div>
                  <p className="gc-tech-layer-desc">
                    Four independent location signals are cross-referenced: Vercel edge IP country,
                    OCR-extracted receipt country, receipt currency, and EXIF GPS coordinates.
                    Mismatches elevate risk. Known bot-farm countries are blocked at the edge
                    before any processing occurs.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">IP Geolocation</span>
                    <span className="gc-tech-catch">OCR Country</span>
                    <span className="gc-tech-catch">Currency Match</span>
                    <span className="gc-tech-catch">EXIF GPS</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 6 — Referral Pipeline */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">06</div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Automated Referral Pipeline</div>
                  <div className="gc-tech-layer-tag">EVERY 15 MIN · RING DETECTION · AUTO-VERIFY</div>
                  <p className="gc-tech-layer-desc">
                    Referral conversions are verified automatically — self-referral detection,
                    referrer approval status, monthly cap enforcement, and rolling window limits.
                    AI ring detection catches farming schemes across the social graph.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Anti-Farm</span>
                    <span className="gc-tech-catch">Ring Detection</span>
                    <span className="gc-tech-catch">Auto-Verify</span>
                    <span className="gc-tech-catch">Points Reward</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom stats */}
            <div className="gc-tech-stats">
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">3</div>
                <div className="gc-tech-stat-label">AI Engines</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">12</div>
                <div className="gc-tech-stat-label">Automated Gates</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">6</div>
                <div className="gc-tech-stat-label">Verification Layers</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">225</div>
                <div className="gc-tech-stat-label">Stress Tests</div>
              </div>
            </div>

            <div className="gc-tech-footer">
              <Link href="/gates" className="gc-teaser-link">See all 10 verification gates</Link>
            </div>
          </div>
        </section>

        {/* LEADERBOARD TEASER */}
        <ScrollReveal>
          <LeaderboardTeaser />
        </ScrollReveal>

        {/* GATES TEASER */}
        <ScrollReveal delay={0.08}>
          <GatesTeaser />
        </ScrollReveal>

        {/* WALLET TRACKER TEASER */}
        <ScrollReveal delay={0.08}>
          <WalletTrackerTeaser />
        </ScrollReveal>

        {/* REFERRAL TEASER */}
        <ScrollReveal delay={0.08}>
          <ReferralTeaser />
        </ScrollReveal>

        {/* COMMUNITY TEASER */}
        <ScrollReveal delay={0.08}>
          <CommunityTeaser />
        </ScrollReveal>

        {/* LIVE TREASURY TEASER */}
        <ScrollReveal delay={0.08}>
          <section className="gc-teaser glass-card glass-card--glow" style={{ padding: '48px' }}>
            <div className="gc-section-num">09</div>
            <h2 className="gc-section-title">Live Treasury</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 300, fontSize: 15, maxWidth: 500, lineHeight: 1.75, marginTop: 16 }}>
              On-chain treasury balance updated in real time. Every refund, every
              transaction — fully transparent.
            </p>
            <Link href="/dashboard" className="gc-teaser-link">View full dashboard</Link>
          </section>
        </ScrollReveal>

        </main>
    </>
  );
}
