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
