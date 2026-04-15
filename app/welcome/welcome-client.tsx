'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  gateCount: number;
  treasuryUsd: string;
  testersRedeemed: number;
  claimsSubmitted: number;
  isDryRun: boolean;
};

type HotspotKey = 'enter' | 'manifesto' | 'howitworks' | 'roadmap';

export function WelcomeClient({
  gateCount,
  treasuryUsd,
  testersRedeemed,
  claimsSubmitted,
  isDryRun,
}: Props) {
  const [splashGone, setSplashGone] = useState(false);
  const [openModal, setOpenModal] = useState<HotspotKey | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotKey | 'docs' | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss splash after 2.2s (matches CSS animation)
  useEffect(() => {
    const t = setTimeout(() => setSplashGone(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // ESC to close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll while a modal is open
  useEffect(() => {
    if (openModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [openModal]);

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Client-only for now — just acknowledges. Real list integration is a
    // follow-up decision (Resend / ConvertKit / Mailchimp per user prefs).
    if (emailInputRef.current?.value) setEmailSubmitted(true);
  };

  return (
    <div className="wlc-root" data-theme="dark">
      {/* ── Splash intro ─────────────────────────────────────────────── */}
      {!splashGone && (
        <div className="wlc-splash" aria-hidden>
          <div className="wlc-splash-scanline" />
          <div className="wlc-splash-noise" />
          <div className="wlc-splash-center">
            <div className="wlc-splash-kicker">INITIALIZING</div>
            <div className="wlc-splash-title">GASCOIN</div>
            <div className="wlc-splash-sub">SOLANA · SEASON 1 BETA</div>
          </div>
        </div>
      )}

      {/* ── Grain overlay (always on) ────────────────────────────────── */}
      <div className="wlc-grain" aria-hidden />

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="wlc-topbar">
        <Link href="/" className="wlc-brand">
          <span className="wlc-brand-mark">[G]</span>
          <span className="wlc-brand-word">GASCOIN</span>
        </Link>
        <nav className="wlc-topnav">
          <Link href="/docs" className="wlc-topnav-link">DOCS</Link>
          <Link href="/gates" className="wlc-topnav-link">GATES</Link>
          <Link href="/community" className="wlc-topnav-link">COMMUNITY</Link>
          <Link href="/submit" className="wlc-topnav-link wlc-topnav-link--primary">
            ENTER →
          </Link>
        </nav>
      </header>

      {/* ── Hero section with interactive pump ───────────────────────── */}
      <section className="wlc-hero">
        <div className="wlc-hero-kicker">— SOLANA · COMMUNITY GAS REFUNDS</div>
        <h1 className="wlc-hero-title">
          Burn gas.<br />
          Post proof.<br />
          <span className="wlc-hero-title-glow">Get paid in SOL.</span>
        </h1>
        <p className="wlc-hero-sub">
          Click any part of the pump. The display screen is the door.
        </p>

        {/* The pump — breathing + interactive hotspots */}
        <div className={`wlc-pump-stage${splashGone ? ' wlc-pump-stage--live' : ''}`}>
          {/* Radial halo behind the pump */}
          <div className="wlc-pump-halo" aria-hidden />
          {/* The pump image */}
          <div className="wlc-pump-wrap">
            <img
              src="/welcome/pump.png"
              alt="GASCOIN gas pump — Gas. Paid Back."
              className="wlc-pump-img"
              draggable={false}
            />

            {/* CRT scanline overlay on the display screen */}
            <div className="wlc-pump-crt" aria-hidden />

            {/* Hotspot: TOP HANDLE → /docs */}
            <Link
              href="/docs"
              className={`wlc-hotspot wlc-hotspot--handle${hoveredHotspot === 'docs' ? ' is-hot' : ''}`}
              aria-label="Docs"
              onMouseEnter={() => setHoveredHotspot('docs')}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              <span className="wlc-hotspot-label">[ DOCS ↗ ]</span>
            </Link>

            {/* Hotspot: DISPLAY SCREEN → Enter the app modal */}
            <button
              type="button"
              className={`wlc-hotspot wlc-hotspot--display${hoveredHotspot === 'enter' ? ' is-hot' : ''}`}
              aria-label="Enter the protocol"
              onClick={() => setOpenModal('enter')}
              onMouseEnter={() => setHoveredHotspot('enter')}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              <span className="wlc-hotspot-label wlc-hotspot-label--display">[ ENTER ]</span>
            </button>

            {/* Hotspot: NOZZLE → How It Works modal */}
            <button
              type="button"
              className={`wlc-hotspot wlc-hotspot--nozzle${hoveredHotspot === 'howitworks' ? ' is-hot' : ''}`}
              aria-label="How it works"
              onClick={() => setOpenModal('howitworks')}
              onMouseEnter={() => setHoveredHotspot('howitworks')}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              <span className="wlc-hotspot-label wlc-hotspot-label--right">[ HOW IT WORKS ]</span>
            </button>

            {/* Hotspot: PUMP BODY → Manifesto modal
                (the frame around the display — left strip) */}
            <button
              type="button"
              className={`wlc-hotspot wlc-hotspot--body${hoveredHotspot === 'manifesto' ? ' is-hot' : ''}`}
              aria-label="Manifesto"
              onClick={() => setOpenModal('manifesto')}
              onMouseEnter={() => setHoveredHotspot('manifesto')}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              <span className="wlc-hotspot-label">[ MANIFESTO ]</span>
            </button>

            {/* Hotspot: BASE → Roadmap modal */}
            <button
              type="button"
              className={`wlc-hotspot wlc-hotspot--base${hoveredHotspot === 'roadmap' ? ' is-hot' : ''}`}
              aria-label="Roadmap"
              onClick={() => setOpenModal('roadmap')}
              onMouseEnter={() => setHoveredHotspot('roadmap')}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              <span className="wlc-hotspot-label">[ ROADMAP ]</span>
            </button>
          </div>
        </div>

        {/* Idle nudge — pulses under the pump telling users what to click */}
        <div className="wlc-pump-nudge">
          <span className="wlc-pump-nudge-dot" />
          CLICK THE <strong>GASCOIN</strong> DISPLAY TO ENTER
        </div>
      </section>

      {/* ── Live stats strip ─────────────────────────────────────────── */}
      <section className="wlc-stats">
        <div className="wlc-stats-rule" />
        <div className="wlc-stats-grid">
          <div className="wlc-stat">
            <div className="wlc-stat-label">TREASURY</div>
            <div className="wlc-stat-value">{treasuryUsd}</div>
            <div className="wlc-stat-sub">On-chain · live</div>
          </div>
          <div className="wlc-stat">
            <div className="wlc-stat-label">{isDryRun ? 'BETA TESTERS' : 'CLAIMS SUBMITTED'}</div>
            <div className="wlc-stat-value">{isDryRun ? testersRedeemed : claimsSubmitted}</div>
            <div className="wlc-stat-sub">
              {isDryRun ? 'Invite codes redeemed' : 'Total lifetime'}
            </div>
          </div>
          <div className="wlc-stat">
            <div className="wlc-stat-label">CLAIMS</div>
            <div className="wlc-stat-value">{claimsSubmitted}</div>
            <div className="wlc-stat-sub">Season 1 · points only</div>
          </div>
          <div className="wlc-stat">
            <div className="wlc-stat-label">GATES</div>
            <div className="wlc-stat-value">{gateCount}</div>
            <div className="wlc-stat-sub">Deterministic</div>
          </div>
        </div>
        <div className="wlc-stats-rule" />
      </section>

      {/* ── 3-AI strip ───────────────────────────────────────────────── */}
      <section className="wlc-ai">
        <div className="wlc-ai-kicker">— THE REVIEW PIPELINE</div>
        <h2 className="wlc-ai-title">Three models. One verdict.</h2>
        <div className="wlc-ai-grid">
          <div className="wlc-ai-card">
            <div className="wlc-ai-card-num">I</div>
            <div className="wlc-ai-card-name">GEMINI SEES</div>
            <p className="wlc-ai-card-body">
              Extracts the receipt photo. Reads the total, the station, the
              date, your handwritten wallet last-4. Flags tampering and
              AI-generation.
            </p>
          </div>
          <div className="wlc-ai-card">
            <div className="wlc-ai-card-num">II</div>
            <div className="wlc-ai-card-name">GROK REASONS</div>
            <p className="wlc-ai-card-body">
              Cross-references the combined signals for elevated risk. X account
              history, posting patterns, receipt anomalies, wallet behavior —
              all in one reasoning pass.
            </p>
          </div>
          <div className="wlc-ai-card">
            <div className="wlc-ai-card-num">III</div>
            <div className="wlc-ai-card-name">CLAUDE DECIDES</div>
            <p className="wlc-ai-card-body">
              Runs asynchronously in the payout worker. Sees Gemini's output,
              Grok's verdict, the {gateCount}-gate results, and the wallet's
              full trust history. Signs off before any SOL moves.
            </p>
          </div>
        </div>
      </section>

      {/* ── Email capture ────────────────────────────────────────────── */}
      <section className="wlc-capture">
        <div className="wlc-capture-inner">
          <div className="wlc-capture-kicker">— SEASON 1 · INVITE ONLY</div>
          <h2 className="wlc-capture-title">Get an invite code.</h2>
          <p className="wlc-capture-sub">
            Season 1 is gated to verified X accounts with a single-use code.
            Drop your email and we'll send you one when the next batch opens.
          </p>
          {emailSubmitted ? (
            <div className="wlc-capture-ok">
              [ OK ] · You're on the list. Watch your inbox.
            </div>
          ) : (
            <form className="wlc-capture-form" onSubmit={handleEmailSubmit}>
              <input
                ref={emailInputRef}
                type="email"
                required
                placeholder="you@example.com"
                className="wlc-capture-input"
                aria-label="Email address"
              />
              <button type="submit" className="wlc-capture-btn">
                NOTIFY ME →
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="wlc-footer">
        <div className="wlc-footer-grid">
          <div className="wlc-footer-brand">
            <div className="wlc-footer-brand-mark">[G]</div>
            <div className="wlc-footer-brand-word">GASCOIN</div>
            <div className="wlc-footer-brand-tag">GAS. PAID BACK.</div>
          </div>
          <div className="wlc-footer-nav">
            <div className="wlc-footer-col-label">PROTOCOL</div>
            <Link href="/submit" className="wlc-footer-link">Submit Receipt</Link>
            <Link href="/gates" className="wlc-footer-link">{gateCount} Gates</Link>
            <Link href="/community" className="wlc-footer-link">Community</Link>
            <Link href="/leaderboard" className="wlc-footer-link">Leaderboard</Link>
          </div>
          <div className="wlc-footer-nav">
            <div className="wlc-footer-col-label">LEARN</div>
            <Link href="/docs" className="wlc-footer-link">Docs</Link>
            <Link href="/how-it-works" className="wlc-footer-link">How It Works</Link>
            <Link href="/referral" className="wlc-footer-link">Referrals</Link>
            <Link href="/perks" className="wlc-footer-link">Perks</Link>
          </div>
          <div className="wlc-footer-nav">
            <div className="wlc-footer-col-label">SOCIAL</div>
            <a
              href="https://x.com/GasCoinApp"
              target="_blank"
              rel="noopener noreferrer"
              className="wlc-footer-link"
            >
              @GasCoinApp on X ↗
            </a>
          </div>
        </div>
        <div className="wlc-footer-bottom">
          <div className="wlc-footer-legal">
            SEASON 1 · DRY-RUN MODE · POINTS ONLY · REAL SOL AT TOKEN LAUNCH
          </div>
          <Link href="/submit" className="wlc-footer-enter">
            ENTER THE PROTOCOL →
          </Link>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {openModal && (
        <Modal onClose={() => setOpenModal(null)}>
          {openModal === 'enter' && <EnterModal />}
          {openModal === 'manifesto' && <ManifestoModal gateCount={gateCount} />}
          {openModal === 'howitworks' && <HowItWorksModal gateCount={gateCount} />}
          {openModal === 'roadmap' && <RoadmapModal />}
        </Modal>
      )}
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="wlc-modal-backdrop" onClick={onClose}>
      <div className="wlc-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="wlc-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          [ CLOSE ✕ ]
        </button>
        <div className="wlc-modal-inner">{children}</div>
      </div>
    </div>
  );
}

// ─── Enter the Protocol modal (display screen click) ────────────────

function EnterModal() {
  return (
    <>
      <div className="wlc-modal-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
      <h2 className="wlc-modal-title">Entering the protocol.</h2>
      <p className="wlc-modal-body">
        Entering GASCOIN requires a single-use beta invite code. You'll sign in
        with your verified X account first, then enter your <code>GC-XXXX-XXXX</code>{' '}
        code to unlock the submission flow.
      </p>
      <p className="wlc-modal-body">
        Browsing the docs, gates, and community stays public — the code is only
        required to submit a receipt.
      </p>
      <div className="wlc-modal-callout">
        <div className="wlc-modal-callout-label">WHAT YOU'LL NEED</div>
        <ul className="wlc-modal-list">
          <li>A verified X account (blue / business / government checkmark)</li>
          <li>100+ X followers</li>
          <li>A connected Solana wallet</li>
          <li>Your single-use invite code</li>
        </ul>
      </div>
      <p className="wlc-modal-body wlc-modal-body--muted">
        Don't have a code yet? Scroll down and join the list — we send the next
        batch when seats open.
      </p>
      <div className="wlc-modal-cta-row">
        <Link href="/submit" className="wlc-modal-btn wlc-modal-btn--primary">
          PROCEED TO SUBMIT →
        </Link>
        <Link href="/docs" className="wlc-modal-btn">
          READ THE DOCS
        </Link>
      </div>
    </>
  );
}

// ─── Manifesto modal (pump body click) ───────────────────────────────

function ManifestoModal({ gateCount }: { gateCount: number }) {
  return (
    <>
      <div className="wlc-modal-kicker">[ THE MANIFESTO ]</div>
      <h2 className="wlc-modal-title wlc-modal-title--big">
        Gas money belongs to you.
      </h2>

      <p className="wlc-modal-body">
        Gas prices are crushing everyday people. The average driver spends
        thousands a year filling up, and every year the number climbs. The
        mechanic, the rideshare driver, the parent doing school pickup at 6 a.m.
        — they all pay it.
      </p>

      <p className="wlc-modal-body">
        Crypto promised to send value back to real people. It mostly sent JPEGs
        instead. Nobody actually pays the person standing at the pump.
      </p>

      <h3 className="wlc-modal-h3">The alternative.</h3>
      <p className="wlc-modal-body">
        GASCOIN is a public Solana treasury that refunds real gas receipts in
        SOL. You buy gas like you always do. You post a tweet. You upload the
        receipt. The protocol verifies you automatically through {gateCount}{' '}
        deterministic gates and a three-AI review pipeline, then sends SOL
        directly to your wallet.
      </p>
      <p className="wlc-modal-body">
        No middlemen. No custodians. No paperwork. The treasury is a transparent
        Solana wallet — you can watch its balance on-chain in real time.
      </p>

      <h3 className="wlc-modal-h3">Why three AIs instead of one.</h3>
      <p className="wlc-modal-body">
        Any one model can be fooled. A photo can be AI-generated. A receipt can
        be photoshopped. An X account can be a bot farm. So we don't trust one
        model. <strong>Gemini sees the image. Grok reasons across the signals.
        Claude signs off on every payout before any SOL moves.</strong> Fraud
        has to beat all three. You only have to convince all three once.
      </p>

      <h3 className="wlc-modal-h3">The tiers.</h3>
      <div className="wlc-tier-table">
        <div className="wlc-tier-row wlc-tier-row--head">
          <span>TIER</span><span>HOLD</span><span>MAX SOL</span><span>COOLDOWN</span>
        </div>
        <div className="wlc-tier-row">
          <span>Standard</span><span>1</span><span>0.10</span><span>7d</span>
        </div>
        <div className="wlc-tier-row">
          <span>Commuter</span><span>100K</span><span>0.25</span><span>7d</span>
        </div>
        <div className="wlc-tier-row">
          <span>Road Warrior</span><span>5M</span><span>0.50</span><span>3.5d</span>
        </div>
        <div className="wlc-tier-row">
          <span>Fleet</span><span>10M+</span><span>1.00</span><span>1.75d</span>
        </div>
      </div>

      <div className="wlc-modal-signoff">
        REAL PEOPLE. REAL GAS. REAL REFUNDS.
      </div>
    </>
  );
}

// ─── How It Works modal (nozzle click) ───────────────────────────────

function HowItWorksModal({ gateCount }: { gateCount: number }) {
  const steps = [
    {
      roman: 'I',
      title: 'BUY GAS',
      body: 'Fill up at any station. Keep the paper receipt.',
      foot: 'Must be within 7 days of submission. Minimum $5 USD.',
    },
    {
      roman: 'II',
      title: 'WRITE YOUR WALLET',
      body: 'Put the last 4 characters of your Solana wallet on the receipt in pen.',
      foot: 'Any pen. Any surface of the receipt. OCR reads it during verification.',
    },
    {
      roman: 'III',
      title: 'POST ON X',
      body: 'Public tweet tagging @GasCoinApp. Include #gascoin or $GASCOIN.',
      foot: 'The $GASCOIN cashtag unlocks X\'s price chart overlay on your post.',
    },
    {
      roman: 'IV',
      title: 'SUBMIT',
      body: 'Paste the tweet URL. Upload the receipt. Connect your Solana wallet.',
      foot: 'Season 1 beta is invite-only. Codes unlock after you sign in with X.',
    },
    {
      roman: 'V',
      title: 'GET PAID',
      body: `${gateCount} verification gates plus the three-AI review pipeline run automatically. If you pass, SOL hits your wallet.`,
      foot: 'Gemini sees. Grok reasons. Claude decides. No middleman ever holds your funds.',
    },
  ];

  return (
    <>
      <div className="wlc-modal-kicker">[ THE FLOW · {gateCount} GATES · 3 AIs ]</div>
      <h2 className="wlc-modal-title wlc-modal-title--big">How it works.</h2>
      <p className="wlc-modal-body">
        Five steps. No accounts to create. No paperwork. No middlemen.
      </p>

      <div className="wlc-steps">
        {steps.map((s) => (
          <div key={s.roman} className="wlc-step">
            <div className="wlc-step-roman">{s.roman}</div>
            <div className="wlc-step-content">
              <div className="wlc-step-title">{s.title}</div>
              <p className="wlc-step-body">{s.body}</p>
              <div className="wlc-step-foot">{s.foot}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="wlc-modal-cta-row">
        <Link href="/submit" className="wlc-modal-btn wlc-modal-btn--primary">
          START SUBMISSION →
        </Link>
        <Link href="/how-it-works" className="wlc-modal-btn">
          FULL WALKTHROUGH
        </Link>
      </div>
    </>
  );
}

// ─── Roadmap modal (base click) ──────────────────────────────────────

function RoadmapModal() {
  const rows: Array<{ item: string; status: string; done?: boolean }> = [
    { item: '15-gate verification engine', status: 'SHIPPED', done: true },
    { item: 'Gemini + Grok + Claude pipeline', status: 'SHIPPED', done: true },
    { item: 'mem0 entity memory + trust graph', status: 'SHIPPED', done: true },
    { item: 'Single-page docs monolith', status: 'SHIPPED', done: true },
    { item: 'Invite-code beta (Season 1)', status: 'LIVE', done: true },
    { item: 'Dry-run SOL payouts', status: 'SEASON 1', done: false },
    { item: 'Live SOL refunds', status: 'AT TOKEN LAUNCH', done: false },
    { item: 'Token launch', status: 'Q3 2026', done: false },
    { item: 'Tier perks + referral compounding', status: 'Q4 2026', done: false },
    { item: 'Fleet/enterprise tooling', status: 'Q4 2026', done: false },
  ];

  return (
    <>
      <div className="wlc-modal-kicker">[ ROADMAP · STATION #01 ]</div>
      <h2 className="wlc-modal-title wlc-modal-title--big">What ships next.</h2>

      <div className="wlc-receipt">
        <div className="wlc-receipt-head">
{`════════════════════════════
  GASCOIN · ROADMAP RECEIPT
  STATION #01 · GASCOIN.APP
════════════════════════════`}
        </div>
        <div className="wlc-receipt-cols">
          <span>ITEM</span>
          <span>STATUS</span>
        </div>
        <div className="wlc-receipt-sep">── ──────────────── ──────────</div>
        {rows.map((r, i) => (
          <div
            key={i}
            className={`wlc-receipt-row${r.done ? ' wlc-receipt-row--done' : ''}`}
          >
            <span className="wlc-receipt-item">{r.item}</span>
            <span className="wlc-receipt-status">{r.status}</span>
          </div>
        ))}
        <div className="wlc-receipt-foot">
{`────────────────────────────
  RECEIPT AUTHENTIC · ON CHAIN
════════════════════════════`}
        </div>
      </div>

      <p className="wlc-modal-body wlc-modal-body--muted">
        Dates beyond Q4 2026 are intentionally omitted. Ship first, schedule
        later.
      </p>
    </>
  );
}
