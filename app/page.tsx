import Link from 'next/link';
import { CinematicIntro, SiteReveal } from '../components/CinematicIntro';
import { HomeNav } from '../components/HomeNav';
import { LeaderboardTeaser } from '../components/leaderboard/LeaderboardTeaser';
import { CommunityTeaser } from '../components/community/CommunityTeaser';
import { GatesTeaser } from '../components/gates/GatesTeaser';
import { WalletTrackerTeaser } from '../components/wallet-tracker/WalletTrackerTeaser';
import { ReferralTeaser } from '../components/referral/ReferralTeaser';

export default async function Home() {
  let treasuryUsd = '—';
  let treasurySub = 'SOL';
  let marketCap = '—';
  let volume = '—';
  let gates = '11';

  try {
    const { getTreasuryBalances } = await import('../lib/integrations/solana');
    const t = await getTreasuryBalances();
    if (t.solBalance > 0 || t.gascoinBalance > 0) {
      const total = t.solUsd + t.gascoinUsd;
      treasuryUsd = total >= 1_000_000 ? `$${(total / 1_000_000).toFixed(1)}M` : `$${Math.round(total).toLocaleString()}`;
      treasurySub = `${t.solBalance.toFixed(2)} SOL`;
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

  // Gate count is static — reflects the number of verification steps in lib/policy.ts

  return (
    <>
      <CinematicIntro />

      <SiteReveal>
        {/* NAV */}
        <HomeNav />

        {/* HERO */}
        <section className="gc-hero">
          <div className="gc-hero-ghost">G</div>
          <div className="gc-hero-content">
            <div className="gc-section-label">— Solana · On-Chain Gas Refunds</div>
            <h1>
              <span className="line">Post.</span>
              <span className="line">Submit.</span>
              <span className="line-ghost">Get Paid Back.</span>
            </h1>
            <p className="gc-hero-body">
              Gas prices are crushing everyday people. GASCOIN is a community-funded
              movement on Solana that gives real money back for real gas purchases.
              Post proof on X, submit your receipt, and receive SOL directly to your
              wallet. No middlemen. No delays. Just people helping people.
            </p>
            <div className="gc-hero-buttons">
              <Link href="/submit" className="gc-btn-solid">Submit Receipt</Link>
              <Link href="/community" className="gc-btn-ghost">View Community</Link>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="gc-stats">
          <div className="gc-stats-grid">
            <div className="gc-stat">
              <div className="gc-stat-label">Treasury Balance</div>
              <div className="gc-stat-value">{treasuryUsd}</div>
              <div className="gc-stat-sub">{treasurySub}</div>
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
            <div className="gc-section-num">02</div>
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
                on it. Our system runs 11 automated verification gates against
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
              <div className="gc-section-num">03 — The Technology</div>
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
              {/* AI Layer 1 — Receipt Processing */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">01</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">AI Receipt Processing</div>
                  <div className="gc-tech-layer-tag">CLAUDE AI · {'<'}0.3¢ PER RECEIPT</div>
                  <p className="gc-tech-layer-desc">
                    Upload a receipt photo and AI extracts everything in one call — country,
                    date, total amount, and your wallet address. Simultaneously scores
                    5 fraud signals: is it a physical receipt, from a real gas station, is it
                    manipulated, does it have handwriting, and is the wallet readable.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Auto-Extract</span>
                    <span className="gc-tech-catch">OCR</span>
                    <span className="gc-tech-catch">Fraud Score</span>
                    <span className="gc-tech-catch">Wallet Match</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* AI Layer 2 — Fraud Detection */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">02</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">4-Layer Fraud Detection</div>
                  <div className="gc-tech-layer-tag">FREE · INSTANT · ON-DEVICE</div>
                  <p className="gc-tech-layer-desc">
                    Before AI even sees the image, three free layers run instantly: EXIF forensics
                    checks camera model, timestamps, and editing software. Dimensional analysis flags
                    AI-generated image sizes. Perceptual hashing catches receipt reuse from any angle.
                    Zero cost. Zero latency.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">EXIF Forensics</span>
                    <span className="gc-tech-catch">Dimension Check</span>
                    <span className="gc-tech-catch">dHash</span>
                    <span className="gc-tech-catch">SHA-256</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* AI Layer 3 — Tweet Verification */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">03</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Automated Tweet Verification</div>
                  <div className="gc-tech-layer-tag">X API V2 · 4 SEQUENTIAL GATES</div>
                  <p className="gc-tech-layer-desc">
                    Your #gascoin tweet is verified automatically through the X API — tweet exists,
                    account is public, hashtag is present, posted within 48 hours. Four gates run
                    sequentially and stop on first failure. No manual review needed.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Tweet Exists</span>
                    <span className="gc-tech-catch">Public Account</span>
                    <span className="gc-tech-catch">#gascoin</span>
                    <span className="gc-tech-catch">48h Window</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* AI Layer 4 — Engagement & Rewards */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">04</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">AI Engagement Scoring</div>
                  <div className="gc-tech-layer-tag">X API METRICS · AUTOMATED EVERY 6H</div>
                  <p className="gc-tech-layer-desc">
                    Your tweet&apos;s real engagement — impressions, likes, retweets, quote tweets,
                    replies — is scored automatically every 6 hours. Points accumulate and
                    convert to SOL. Retweets are worth 5x a like. Quote tweets are worth 10x.
                    The algorithm rewards virality.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Auto-Scoring</span>
                    <span className="gc-tech-catch">Points → SOL</span>
                    <span className="gc-tech-catch">Streak Bonus</span>
                    <span className="gc-tech-catch">Rank Multiplier</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* AI Layer 5 — Referral Validation */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">05</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Automated Referral Pipeline</div>
                  <div className="gc-tech-layer-tag">EVERY 15 MIN · ELIGIBILITY CHECKS</div>
                  <p className="gc-tech-layer-desc">
                    Referral conversions are verified automatically — self-referral detection,
                    referrer approval status, monthly cap enforcement, and rolling window limits.
                    Legitimate referrals earn SOL rewards automatically. No manual processing.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Anti-Farm</span>
                    <span className="gc-tech-catch">Cap Enforce</span>
                    <span className="gc-tech-catch">Auto-Verify</span>
                    <span className="gc-tech-catch">SOL Rewards</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom stats */}
            <div className="gc-tech-stats">
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">{'<'}8s</div>
                <div className="gc-tech-stat-label">Receipt to Verdict</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">11</div>
                <div className="gc-tech-stat-label">Automated Gates</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">5</div>
                <div className="gc-tech-stat-label">AI Systems</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">0</div>
                <div className="gc-tech-stat-label">Manual Steps</div>
              </div>
            </div>

            <div className="gc-tech-footer">
              <Link href="/gates" className="gc-teaser-link">See all 11 verification gates</Link>
            </div>
          </div>
        </section>

        {/* LEADERBOARD TEASER */}
        <LeaderboardTeaser />

        {/* GATES TEASER */}
        <GatesTeaser />

        {/* WALLET TRACKER TEASER */}
        <WalletTrackerTeaser />

        {/* REFERRAL TEASER */}
        <ReferralTeaser />

        {/* COMMUNITY TEASER */}
        <CommunityTeaser />

        {/* LIVE TREASURY TEASER */}
        <section className="gc-teaser">
          <div className="gc-section-num">05</div>
          <h2 className="gc-section-title">Live Treasury</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 300, fontSize: 15, maxWidth: 500, lineHeight: 1.75, marginTop: 16 }}>
            On-chain treasury balance updated in real time. Every refund, every
            transaction — fully transparent.
          </p>
          <Link href="/dashboard" className="gc-teaser-link">View full dashboard</Link>
        </section>

        {/* FOOTER */}
        <footer className="gc-footer">
          <div className="gc-footer-brand">GASCOIN</div>
          <div className="gc-footer-copy">&copy; 2026 GASCOIN</div>
        </footer>
      </SiteReveal>
    </>
  );
}
