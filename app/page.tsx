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
import { GATE_COUNT } from '../lib/policy';

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
  let testersRedeemed = 0;
  let claimsSubmitted = 0;
  const gates = String(GATE_COUNT);

  // Season 1 dry-run check — controls which stats the hero surfaces.
  // In dry-run the token hasn't launched, so Market Cap + 24h Volume are
  // meaningless (always '—'). Replace them with live Season 1 metrics
  // (testers redeemed, claims submitted) pulled from Supabase. Flip
  // ENABLE_LIVE_PAYOUT=true in Vercel and the hero auto-swaps back to
  // market metrics — no code change at token launch.
  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';

  try {
    const { getTreasuryBalances } = await import('../lib/integrations/solana');
    const t = await getTreasuryBalances();
    if (t.solBalance > 0 || t.gascoinBalance > 0) {
      const total = t.solUsd + t.gascoinUsd;
      treasuryUsd = total >= 1_000_000 ? `$${(total / 1_000_000).toFixed(1)}M` : `$${Math.round(total).toLocaleString()}`;
    }
  } catch {}

  if (isDryRun) {
    // Live Season 1 beta metrics — pulled fresh per request
    try {
      const { getSupabaseAdmin } = await import('../lib/supabase');
      const supabase = getSupabaseAdmin();
      const [invitesRes, claimsRes] = await Promise.all([
        supabase
          .from('invite_codes')
          .select('id', { count: 'exact', head: true })
          .not('used_by_x_user_id', 'is', null),
        supabase
          .from('claims')
          .select('id', { count: 'exact', head: true }),
      ]);
      testersRedeemed = invitesRes.count ?? 0;
      claimsSubmitted = claimsRes.count ?? 0;
    } catch {}
  } else {
    try {
      const { getMarketSnapshot } = await import('../lib/integrations/pricing');
      const m = await getMarketSnapshot();
      const mc = Number(m.marketCapUsd);
      const vol = Number(m.volume24hUsd);
      if (mc > 0) marketCap = mc >= 1_000_000 ? `$${(mc / 1_000_000).toFixed(1)}M` : `$${mc.toLocaleString()}`;
      if (vol > 0) volume = vol >= 1_000_000 ? `$${(vol / 1_000_000).toFixed(1)}M` : vol >= 1_000 ? `$${(vol / 1_000).toFixed(0)}K` : `$${vol.toLocaleString()}`;
    } catch {}
  }

  // Demo data fallback — yields to real data when treasury/market are live.
  // During dry-run we intentionally DON'T fall back to demo market data
  // because we're showing beta metrics instead.
  treasuryUsd = fallback(treasuryUsd, DEMO_TREASURY_DISPLAY.treasuryUsd);
  if (!isDryRun) {
    marketCap = fallback(marketCap, DEMO_TREASURY_DISPLAY.marketCap);
    volume = fallback(volume, DEMO_TREASURY_DISPLAY.volume);
  }
  const isDemo = treasuryUsd === DEMO_TREASURY_DISPLAY.treasuryUsd;

  return (
    <>
        {/* NAV */}
        <HomeNav />
        <main id="main-content">

        {/* SEASON 1 BANNER — top of page, above hero. Colors come from the
            --status-warn* tokens so the banner re-tunes for light mode
            without changing its brutalist shape. In light mode the bg is
            solid pale amber (#FFEBA3) with dark amber text (#5A3A00) for
            WCAG AA contrast. Padding uses clamp() for mobile-safe insets. */}
        {isDryRun && (
          <div
            className="gc-season-banner"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              padding: '14px clamp(16px, 4vw, 48px)',
              background: 'var(--status-warn-bg)',
              borderTop: '1px solid var(--status-warn-border)',
              borderBottom: '1px solid var(--status-warn-border)',
              color: 'var(--status-warn)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 10,
                padding: '4px 10px',
                background: 'var(--status-warn-border)',
                color: 'var(--bg)',
                border: '1px solid var(--status-warn-border)',
                letterSpacing: '0.18em',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              SEASON 1 · BETA
            </span>
            <span style={{ flex: '1 1 auto', minWidth: 0 }}>
              Points-only mode. Submit receipts, climb the leaderboard, earn Season 1 points — treasury payouts activate at token launch. No real SOL is dispatched yet.
            </span>
          </div>
        )}

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
                  Post proof on X, submit your receipt, and receive ETH directly to your
                  wallet. No middlemen. No custodians. Just people helping people.
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
            {isDryRun ? (
              <>
                <div className="gc-stat">
                  <div className="gc-stat-label">Beta Testers</div>
                  <div className="gc-stat-value">{testersRedeemed}</div>
                  <div className="gc-stat-sub">Invite codes redeemed</div>
                </div>
                <div className="gc-stat">
                  <div className="gc-stat-label">Claims Submitted</div>
                  <div className="gc-stat-value">{claimsSubmitted}</div>
                  <div className="gc-stat-sub">Season 1 · points-only</div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
            <div className="gc-stat">
              <div className="gc-stat-label">Gates</div>
              <div className="gc-stat-value">{gates}</div>
              <div className="gc-stat-sub">Verification Steps</div>
            </div>
          </div>
          {isDryRun && (
            <div style={{ padding: '12px 48px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--muted-deep)' }}>
              Season 1 Beta · Token Not Yet Launched · Market Metrics Activate At Token Launch
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
              <div className="gc-step-title">Tweet $GASCOIN</div>
              <p className="gc-step-desc">
                Post a tweet tagging <strong>@GasCoinApp</strong> with <strong>$GASCOIN</strong> cashtag and <strong>#gascoin</strong> hashtag from your verified X account. Cashtag unlocks X&apos;s price chart overlay.
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
                on it. Our system runs {gates} automated verification gates against
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
                  <img src="/icons/brands/gemini-bw.svg" alt="Gemini" className="gc-tech-layer-icon-img" />
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
                  <img src="/icons/brands/grok-bw.svg" alt="Grok" className="gc-tech-layer-icon-img" />
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

              {/* Layer 3 — X API v2 (the social network, not xAI the company) */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">03</div>
                <div className="gc-tech-layer-icon">
                  <img src="/icons/brands/x.svg" alt="X" className="gc-tech-layer-icon-img" />
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

              {/* Layer 4 — Referral Pipeline */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">04</div>
                <div className="gc-tech-layer-icon">
                  <img src="/icons/brands/grok-bw.svg" alt="Grok" className="gc-tech-layer-icon-img" />
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Automated Referral Pipeline</div>
                  <div className="gc-tech-layer-tag">GROK-POWERED · EVERY 15 MIN · AUTO-VERIFY</div>
                  <p className="gc-tech-layer-desc">
                    Referral conversions are verified automatically — self-referral detection,
                    referrer approval status, monthly cap enforcement, and rolling window limits.
                    Grok-powered ring detection catches farming schemes across the social graph.
                    Every point award passes through AI verification before it lands.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Anti-Farm</span>
                    <span className="gc-tech-catch">Ring Detection</span>
                    <span className="gc-tech-catch">Auto-Verify</span>
                    <span className="gc-tech-catch">Points Reward</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 5 — Memory Layer */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">05</div>
                <div className="gc-tech-layer-icon" style={{ width: 'auto', gap: '8px' }}>
                  <img src="/icons/brands/memory-layer-bw.svg" alt="Memory Layer" className="gc-tech-layer-icon-img" style={{ width: '30px', height: '30px' }} />
                  <img src="/icons/brands/obsidian-layer-bw.svg" alt="Obsidian" className="gc-tech-layer-icon-img" style={{ width: '30px', height: '30px' }} />
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Memory Layer</div>
                  <div className="gc-tech-layer-tag">PERSISTENT CONTEXT · MEMORY ENGINE + OBSIDIAN · RECURSIVE LEARNING</div>
                  <p className="gc-tech-layer-desc">
                    Every submission, fraud pattern, account behavior, and payout decision is remembered.
                    mem0 provides a persistent AI memory layer that grows smarter with every interaction —
                    flagging repeat offenders, recognizing patterns across submissions, and feeding
                    Claude&apos;s final review with full historical context. Obsidian maintains the structured
                    knowledge protocol behind every verification rule and gate decision.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Recursive Memory</span>
                    <span className="gc-tech-catch">Pattern Recognition</span>
                    <span className="gc-tech-catch">Historical Context</span>
                    <span className="gc-tech-catch">Knowledge Protocol</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 6 — Claude Oversight */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">06</div>
                <div className="gc-tech-layer-icon">
                  <img src="/icons/brands/claude-bw.svg" alt="Claude" className="gc-tech-layer-icon-img" />
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Claude Oversight</div>
                  <div className="gc-tech-layer-tag">CLAUDE OPUS · ANTHROPIC · FINAL REVIEW</div>
                  <p className="gc-tech-layer-desc">
                    Before SOL leaves the treasury, Claude reviews the complete submission package —
                    all {gates} gate results, fraud scores, X account metrics,
                    submission history, and full mem0 intelligence profile.
                    Returns a verdict with a written audit narrative.
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
            </div>

            {/* Bottom stats — facts tied to real code, no stale hardcoded
                numbers. Gate count reads from GATE_COUNT so it auto-updates
                on every gate addition. */}
            <div className="gc-tech-stats">
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">3</div>
                <div className="gc-tech-stat-label">AI Engines</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">{gates}</div>
                <div className="gc-tech-stat-label">Automated Gates</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">4</div>
                <div className="gc-tech-stat-label">Gate Categories</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">9</div>
                <div className="gc-tech-stat-label">Cron Workers</div>
              </div>
            </div>

            <div className="gc-tech-footer">
              <Link href="/gates" className="gc-teaser-link">See all {gates} verification gates</Link>
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
            <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 500, lineHeight: 1.75, marginTop: 16 }}>
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
