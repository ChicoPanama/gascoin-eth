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

        {/* VERIFICATION TECH */}
        <section className="gc-tech">
          <div className="gc-tech-inner">
            <div className="gc-tech-header">
              <div className="gc-section-num">03 — The Technology</div>
              <h2 className="gc-tech-title">
                <span>4-Layer</span>
                <span className="gc-tech-title-ghost">Fraud Detection</span>
              </h2>
              <p className="gc-tech-sub">
                Every receipt passes through a multi-layer verification pipeline before
                a single lamport leaves the treasury. AI vision, cryptographic hashing,
                device forensics, and on-chain validation — running in under 8 seconds.
              </p>
            </div>

            <div className="gc-tech-pipeline">
              {/* Layer 1 */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">01</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">EXIF Forensics</div>
                  <div className="gc-tech-layer-tag">FREE · INSTANT</div>
                  <p className="gc-tech-layer-desc">
                    Camera model, GPS coordinates, timestamps, editing software signatures.
                    Real phone photos leave a forensic trail. AI images and screenshots don&apos;t.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Screenshots</span>
                    <span className="gc-tech-catch">AI Images</span>
                    <span className="gc-tech-catch">Photoshop</span>
                  </div>
                </div>
              </div>

              {/* Connector */}
              <div className="gc-tech-connector" />

              {/* Layer 2 */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">02</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="0"/><path d="M3 9h18"/><path d="M9 3v18"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Dimensional Analysis</div>
                  <div className="gc-tech-layer-tag">FREE · INSTANT</div>
                  <p className="gc-tech-layer-desc">
                    Real phone photos are 3000-5000px. AI images are 1024x1024.
                    Screenshots match exact screen resolutions. Pixel dimensions don&apos;t lie.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">DALL·E</span>
                    <span className="gc-tech-catch">Midjourney</span>
                    <span className="gc-tech-catch">Screen Grabs</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 3 */}
              <div className="gc-tech-layer">
                <div className="gc-tech-layer-num">03</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16v16H4z"/><path d="M4 4l16 16"/><path d="M20 4L4 20"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">Perceptual Hashing</div>
                  <div className="gc-tech-layer-tag">FREE · LOCAL</div>
                  <p className="gc-tech-layer-desc">
                    dHash fingerprint computed locally. Two photos of the same receipt
                    from different angles produce similar hashes. SHA-256 catches exact duplicates.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Receipt Reuse</span>
                    <span className="gc-tech-catch">Angle Tricks</span>
                    <span className="gc-tech-catch">Re-uploads</span>
                  </div>
                </div>
              </div>

              <div className="gc-tech-connector" />

              {/* Layer 4 */}
              <div className="gc-tech-layer gc-tech-layer--ai">
                <div className="gc-tech-layer-num">04</div>
                <div className="gc-tech-layer-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
                <div className="gc-tech-layer-content">
                  <div className="gc-tech-layer-title">AI Vision Extraction</div>
                  <div className="gc-tech-layer-tag">GEMINI FLASH · {'<'}0.3¢</div>
                  <p className="gc-tech-layer-desc">
                    One API call extracts station name, city, date, total, and wallet address.
                    Simultaneously scores 5 fraud signals: physical receipt, gas station,
                    manipulation, handwriting, and wallet presence.
                  </p>
                  <div className="gc-tech-layer-catches">
                    <span className="gc-tech-catch">Fake Receipts</span>
                    <span className="gc-tech-catch">Digital Edits</span>
                    <span className="gc-tech-catch">Non-Gas</span>
                    <span className="gc-tech-catch">Missing Wallet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom stats */}
            <div className="gc-tech-stats">
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">{'<'}8s</div>
                <div className="gc-tech-stat-label">Total Processing</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">3,300</div>
                <div className="gc-tech-stat-label">Receipts Per Dollar</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">4</div>
                <div className="gc-tech-stat-label">Detection Layers</div>
              </div>
              <div className="gc-tech-stat">
                <div className="gc-tech-stat-value">0</div>
                <div className="gc-tech-stat-label">Trusted Inputs</div>
              </div>
            </div>

            <div className="gc-tech-footer">
              <Link href="/gates" className="gc-teaser-link">See all 10 verification gates</Link>
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
