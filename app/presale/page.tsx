import { PresaleNav } from '../../components/presale/PresaleNav';
import { ScrollReveal } from '../../components/ui/ScrollReveal';
import { HeroStagger, HeroItem } from '../../components/ui/HeroStagger';
import { PresaleContribute } from '../../components/presale/PresaleContribute';

export const metadata = {
  title: 'GASCOIN Presale — Fuel the Refund Treasury',
  description:
    'Contribute ETH to the GASCOIN presale and join the community gas-refund protocol before mainnet launch. Tiered allocations. Transparent treasury.',
  // Unlisted page — accessible only by direct URL. Do not index.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Placeholder presale numbers. Every value here is a stub — tweak these
// constants once the raise terms are finalized. Keep them in this block so
// we have a single source of truth to swap for on-chain reads later.
// ────────────────────────────────────────────────────────────────────────────
const PRESALE = {
  raisedEth: 0,
  targetEth: 500,
  pricePerTokenEth: 0.00005, // 1 GASCOIN = 0.00005 ETH (placeholder)
  minContribEth: 0.05,
  maxContribEth: 10,
  startsIso: '2026-05-01T16:00:00Z',
  endsIso: '2026-05-15T16:00:00Z',
  treasuryAddress: '0x0000000000000000000000000000000000000000', // TODO: replace with live multisig
  softCapEth: 100,
  hardCapEth: 500,
  tgeUnlockPct: 20,
  vestingMonths: 6,
};

const TIERS = [
  { key: 'standard',     name: 'Standard',      minEth: 0.05, maxEth: 0.5,  perks: ['Early access to Season 1', 'Standard payout priority'] },
  { key: 'commuter',     name: 'Commuter',      minEth: 0.5,  maxEth: 2,    perks: ['Commuter tier badge', 'Weekly refund cap +2×', 'Elevated payout queue'] },
  { key: 'road-warrior', name: 'Road Warrior',  minEth: 2,    maxEth: 5,    perks: ['Road Warrior tier', 'Featured on community feed', 'Priority payout dispatch'] },
  { key: 'fleet',        name: 'Fleet',         minEth: 5,    maxEth: 10,   perks: ['Fleet tier badge', 'Cooldown halved', 'First-look governance seat', 'Access to station-network rollout'] },
];

const PHASES = [
  { label: 'Foundation',        status: 'done',       body: 'RPC proxy, Redis cache, Vercel AI Gateway, mem0 Pro, 15-gate fraud engine.' },
  { label: 'Season 1 Beta',     status: 'done',       body: 'Invite codes, X OAuth, receipt OCR pipeline, admin cockpit, public docs.' },
  { label: 'Presale',           status: 'current',    body: 'ETH-denominated community raise on Ethereum mainnet. Funds seed the refund treasury + seed liquidity for the GASCOIN ERC-20.' },
  { label: 'Season 1 Launch',   status: 'next',       body: 'Live ETH refunds, GASCOIN ERC-20 tiers active, engagement scoring, referral engine.' },
  { label: 'Station Network',   status: 'future',     body: 'Direct station integrations, $GAS utility expansion, DAO governance.' },
];

const FAQ = [
  { q: 'Is this a real protocol or a pitch?',
    a: 'The refund engine is live end-to-end on Ethereum mainnet in dry-run mode today. Submissions, fraud gates, Claude oversight, and payout queuing all work — the presale capitalizes the treasury that pays verified drivers back.' },
  { q: 'What do contributors receive?',
    a: `Allocation of $GAS (ERC-20 on Ethereum mainnet) proportional to contribution at ${PRESALE.pricePerTokenEth} ETH per token. ${PRESALE.tgeUnlockPct}% unlocks at TGE; the rest vests linearly over ${PRESALE.vestingMonths} months.` },
  { q: 'What are the raise limits?',
    a: `Soft cap ${PRESALE.softCapEth} ETH, hard cap ${PRESALE.hardCapEth} ETH. Per-wallet minimum ${PRESALE.minContribEth} ETH, maximum ${PRESALE.maxContribEth} ETH.` },
  { q: 'Is there a refund if the soft cap isn\'t reached?',
    a: 'Yes. If the raise closes below soft cap, every wallet that contributed can claim a full ETH refund from the presale contract for 30 days after close.' },
  { q: 'What are gas-receipt payouts denominated in?',
    a: 'Paid directly in ETH to the driver\'s wallet. No bridging, no wrappers — treasury holds ETH, EIP-1559 gas estimation on every payout, Alchemy Address Activity webhook confirms every dispatch on-chain.' },
  { q: 'How is the treasury governed post-raise?',
    a: 'Presale receipts are held in a multisig for the first 90 days, after which governance migrates to the community DAO outlined in the Beyond phase of the roadmap.' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PresalePage() {
  const progressPct = Math.min(100, Math.round((PRESALE.raisedEth / PRESALE.targetEth) * 100));

  return (
    <>
      <PresaleNav />
      <main className="gc-presale">
        {/* ─── HERO ────────────────────────────────────────────────────── */}
        <section className="gc-presale-hero">
          <HeroStagger>
            <HeroItem>
              <span className="gc-presale-eyebrow">Community raise · ETH denominated</span>
            </HeroItem>
            <HeroItem>
              <h1 className="gc-presale-headline">
                Fuel the refund treasury.<br />
                Own a piece of the road ahead.
              </h1>
            </HeroItem>
            <HeroItem>
              <p className="gc-presale-sub">
                GASCOIN turns real-world gas receipts into on-chain refunds.
                The presale seeds the treasury that pays every driver back —
                and gives contributors tiered access to Season 1.
              </p>
            </HeroItem>
            <HeroItem>
              <PresaleContribute
                treasuryAddress={PRESALE.treasuryAddress}
                minContribEth={PRESALE.minContribEth}
                maxContribEth={PRESALE.maxContribEth}
              />
            </HeroItem>
          </HeroStagger>
        </section>

        {/* ─── RAISE STATS ─────────────────────────────────────────────── */}
        <ScrollReveal>
          <section className="gc-presale-stats">
            <div className="gc-presale-stat-grid">
              <div className="gc-presale-stat">
                <span className="gc-presale-stat-label">Raised</span>
                <span className="gc-presale-stat-value">{PRESALE.raisedEth} ETH</span>
                <span className="gc-presale-stat-sub">of {PRESALE.targetEth} ETH target</span>
              </div>
              <div className="gc-presale-stat">
                <span className="gc-presale-stat-label">Price</span>
                <span className="gc-presale-stat-value">{PRESALE.pricePerTokenEth} ETH</span>
                <span className="gc-presale-stat-sub">per $GAS</span>
              </div>
              <div className="gc-presale-stat">
                <span className="gc-presale-stat-label">Window</span>
                <span className="gc-presale-stat-value">{formatDate(PRESALE.startsIso)}</span>
                <span className="gc-presale-stat-sub">through {formatDate(PRESALE.endsIso)}</span>
              </div>
              <div className="gc-presale-stat">
                <span className="gc-presale-stat-label">Unlock</span>
                <span className="gc-presale-stat-value">{PRESALE.tgeUnlockPct}% TGE</span>
                <span className="gc-presale-stat-sub">remainder vests {PRESALE.vestingMonths}mo linear</span>
              </div>
            </div>
            <div className="gc-presale-progress">
              <div className="gc-presale-progress-bar" style={{ width: `${progressPct}%` }} />
              <div className="gc-presale-progress-markers">
                <span>Soft cap · {PRESALE.softCapEth} ETH</span>
                <span>Hard cap · {PRESALE.hardCapEth} ETH</span>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ─── ALLOCATION TIERS ────────────────────────────────────────── */}
        <ScrollReveal>
          <section className="gc-presale-section">
            <h2 className="gc-presale-section-title">Allocation tiers</h2>
            <p className="gc-presale-section-kicker">
              Contribution size maps to the same four tiers the refund engine
              uses in production. Bigger commit, earlier payout queue.
            </p>
            <div className="gc-presale-tier-grid">
              {TIERS.map((t) => (
                <div key={t.key} className={`gc-presale-tier gc-presale-tier--${t.key}`}>
                  <div className="gc-presale-tier-head">
                    <h3>{t.name}</h3>
                    <span className="gc-presale-tier-range">{t.minEth}–{t.maxEth} ETH</span>
                  </div>
                  <ul className="gc-presale-tier-perks">
                    {t.perks.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ─── ROADMAP / WHY ───────────────────────────────────────────── */}
        <ScrollReveal>
          <section className="gc-presale-section">
            <h2 className="gc-presale-section-title">Where the raise fits</h2>
            <p className="gc-presale-section-kicker">
              The protocol is already live in dry-run. Presale capital bridges
              Season 1 Beta to Season 1 Launch.
            </p>
            <ol className="gc-presale-phases">
              {PHASES.map((p) => (
                <li key={p.label} className={`gc-presale-phase gc-presale-phase--${p.status}`}>
                  <span className="gc-presale-phase-marker" aria-hidden>
                    {p.status === 'done' ? '●' : p.status === 'current' ? '◆' : '○'}
                  </span>
                  <div>
                    <h4>{p.label}</h4>
                    <p>{p.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </ScrollReveal>

        {/* ─── TRUST / NUMBERS ─────────────────────────────────────────── */}
        <ScrollReveal>
          <section className="gc-presale-section">
            <h2 className="gc-presale-section-title">Built, not pitched</h2>
            <div className="gc-presale-proof-grid">
              <div className="gc-presale-proof">
                <span className="gc-presale-proof-num">15</span>
                <span className="gc-presale-proof-label">automated fraud gates</span>
              </div>
              <div className="gc-presale-proof">
                <span className="gc-presale-proof-num">841</span>
                <span className="gc-presale-proof-label">passing unit tests</span>
              </div>
              <div className="gc-presale-proof">
                <span className="gc-presale-proof-num">4</span>
                <span className="gc-presale-proof-label">AI engines in the pipeline</span>
              </div>
              <div className="gc-presale-proof">
                <span className="gc-presale-proof-num">—</span>
                <span className="gc-presale-proof-label">Season 1 testers redeemed</span>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ─── FAQ ─────────────────────────────────────────────────────── */}
        <ScrollReveal>
          <section className="gc-presale-section">
            <h2 className="gc-presale-section-title">Questions</h2>
            <div className="gc-presale-faq">
              {FAQ.map((f) => (
                <details key={f.q} className="gc-presale-faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ─── FINAL CTA ───────────────────────────────────────────────── */}
        <ScrollReveal>
          <section className="gc-presale-cta">
            <h2>Contribute to the refund treasury.</h2>
            <p>
              Connect an ETH wallet to lock in your allocation.
              Minimum {PRESALE.minContribEth} ETH, maximum {PRESALE.maxContribEth} ETH per wallet.
            </p>
            <PresaleContribute
              treasuryAddress={PRESALE.treasuryAddress}
              minContribEth={PRESALE.minContribEth}
              maxContribEth={PRESALE.maxContribEth}
              variant="compact"
            />
          </section>
        </ScrollReveal>
      </main>
    </>
  );
}
