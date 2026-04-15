'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Props = {
  pumpSvg: string;
  gateCount: number;
  treasuryUsd: string;
  testersRedeemed: number;
  claimsSubmitted: number;
  isDryRun: boolean;
};

type HotspotKey = 'enter' | 'manifesto' | 'howitworks' | 'roadmap';
type Region = 'handle' | 'display' | 'body' | 'nozzle' | 'base';

const REGION_LABELS: Record<Region, string> = {
  handle: 'DOCS ↗',
  display: 'ENTER',
  body: 'MANIFESTO',
  nozzle: 'HOW IT WORKS',
  base: 'ROADMAP',
};

type HoverState = {
  region: Region;
  labelX: number;
  labelY: number;
} | null;

/**
 * /welcome — single-viewport interactive pump landing page (v3).
 *
 * PR #43 audit fixes:
 *   - Click feedback via a 120ms CRT flash overlay
 *   - Soft nav with next/navigation router.push for the handle hotspot
 *   - Hover labels tracked via getBoundingClientRect so they appear near
 *     the actual hovered region instead of hardcoded positions
 *   - Centered modals (was bottom-anchored)
 *   - Simplified strips (top: LIVE · GATES only; bottom: X / label / ENTER)
 *   - Tester count moved into the Enter modal as proof of traction
 *   - treasuryUsd + claimsSubmitted accepted but not displayed on this page
 *     to keep the top bar uncluttered and the data honest (dry-run state
 *     makes both display as "—" / 0 which looks broken)
 *   - prefers-reduced-motion disables click flash + pump animations
 */
export function WelcomeClient({
  pumpSvg,
  gateCount,
  testersRedeemed,
  isDryRun,
}: Props) {
  const router = useRouter();
  const [splashGone, setSplashGone] = useState(false);
  const [openModal, setOpenModal] = useState<HotspotKey | null>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const [flashing, setFlashing] = useState(false);
  const pumpRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  /** Trigger the click flash, then run `action` after 120ms. */
  const armAction = useCallback(
    (action: () => void) => {
      if (flashing) return;
      setFlashing(true);
      const prefersReduce = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delay = prefersReduce ? 0 : 120;
      window.setTimeout(() => {
        setFlashing(false);
        action();
      }, delay);
    },
    [flashing]
  );

  // Wire up the injected SVG's pump-region groups
  useEffect(() => {
    const root = pumpRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const regions = Array.from(
      root.querySelectorAll<SVGGElement>('g.pump-region')
    );
    if (regions.length === 0) return;

    const actions: Record<string, () => void> = {
      'pump-handle': () => router.push('/docs'),
      'pump-display': () => setOpenModal('enter'),
      'pump-body': () => setOpenModal('manifesto'),
      'pump-nozzle': () => setOpenModal('howitworks'),
      'pump-base': () => setOpenModal('roadmap'),
    };
    const keys: Record<string, Region> = {
      'pump-handle': 'handle',
      'pump-display': 'display',
      'pump-body': 'body',
      'pump-nozzle': 'nozzle',
      'pump-base': 'base',
    };

    const listeners: Array<{ el: SVGGElement; type: string; fn: EventListener }> = [];
    for (const el of regions) {
      const id = el.id;
      const action = actions[id];
      const key = keys[id];
      if (!action || !key) continue;

      el.style.cursor = 'pointer';
      el.setAttribute('role', 'button');

      const onClick: EventListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        armAction(action);
      };
      const onEnter: EventListener = () => {
        const stageRect = stage.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        setHover({
          region: key,
          labelX: rect.left - stageRect.left + rect.width / 2,
          labelY: rect.top - stageRect.top - 36,
        });
      };
      const onLeave: EventListener = () => setHover(null);
      const onKey: EventListener = (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          armAction(action);
        }
      };

      el.addEventListener('click', onClick);
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('keydown', onKey);
      listeners.push(
        { el, type: 'click', fn: onClick },
        { el, type: 'mouseenter', fn: onEnter },
        { el, type: 'mouseleave', fn: onLeave },
        { el, type: 'keydown', fn: onKey }
      );
    }

    return () => {
      for (const l of listeners) l.el.removeEventListener(l.type, l.fn);
    };
  }, [armAction, router]);

  // Apply the hover class to the root SVG so CSS drives per-region anims
  useEffect(() => {
    const root = pumpRef.current;
    if (!root) return;
    const svg = root.querySelector('svg');
    if (!svg) return;
    svg.classList.remove(
      'is-hover-handle',
      'is-hover-display',
      'is-hover-body',
      'is-hover-nozzle',
      'is-hover-base'
    );
    if (hover) svg.classList.add(`is-hover-${hover.region}`);
  }, [hover]);

  // ESC closes modals
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
      return () => { document.body.style.overflow = ''; };
    }
  }, [openModal]);

  const handleEnterSplash = useCallback(() => setSplashGone(true), []);

  useEffect(() => {
    if (splashGone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEnterSplash();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [splashGone, handleEnterSplash]);

  return (
    <div className="wlc-root" data-theme="dark">
      {!splashGone && (
        <button
          type="button"
          className="wlc-splash"
          onClick={handleEnterSplash}
          aria-label="Enter the station"
        >
          <div className="wlc-splash-scanline" aria-hidden />
          <div className="wlc-splash-noise" aria-hidden />
          <div className="wlc-splash-inner">
            <div className="wlc-splash-kicker">&gt; INITIALIZING_</div>
            <div className="wlc-splash-brand">GASCOIN</div>
            <div className="wlc-splash-sub">SOLANA · SEASON 1 · BETA</div>
            <div className="wlc-splash-cta">
              <span className="wlc-splash-bracket">[</span>
              <span className="wlc-splash-cta-text">ENTER THE STATION</span>
              <span className="wlc-splash-bracket">]</span>
            </div>
            <div className="wlc-splash-hint">click anywhere · or press ENTER</div>
          </div>
        </button>
      )}

      <div className="wlc-grain" aria-hidden />

      <header className="wlc-topstrip">
        <Link href="/" className="wlc-topstrip-brand">
          <span className="wlc-topstrip-mark">[G]</span>
          <span className="wlc-topstrip-word">GASCOIN</span>
        </Link>
        <div className="wlc-topstrip-meta">
          <span className="wlc-topstrip-live">
            <span className="wlc-topstrip-live-dot" /> LIVE
          </span>
          <span className="wlc-topstrip-sep">·</span>
          <span>{gateCount} GATES</span>
        </div>
      </header>

      <main className="wlc-stage" ref={stageRef}>
        <div className="wlc-stage-halo" aria-hidden />

        {hover && (
          <div
            className={`wlc-hover-label wlc-hover-label--${hover.region}`}
            style={{
              left: `${hover.labelX}px`,
              top: `${hover.labelY}px`,
            }}
          >
            [ {REGION_LABELS[hover.region]} ]
          </div>
        )}

        {/*
          The pump SVG is a repo-committed static asset authored by us at
          public/welcome/pump.svg. Not user input. Safe to inject.
        */}
        <div
          ref={pumpRef}
          className={`wlc-pump${splashGone ? ' wlc-pump--live' : ''}`}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: pumpSvg }}
        />

        <div className="wlc-nudge">
          <span className="wlc-nudge-dot" />
          CLICK THE <strong>DISPLAY</strong> TO ENTER
        </div>

        {/* Click-flash overlay — brief white CRT flash before action fires */}
        {flashing && <div className="wlc-click-flash" aria-hidden />}
      </main>

      <footer className="wlc-botstrip">
        <a
          href="https://x.com/GasCoinApp"
          target="_blank"
          rel="noopener noreferrer"
          className="wlc-botstrip-link"
        >
          @GasCoinApp ↗
        </a>
        <div className="wlc-botstrip-legal">
          {isDryRun
            ? 'SEASON 1 · DRY-RUN · POINTS ONLY'
            : 'SEASON 1 · LIVE SOL PAYOUTS'}
        </div>
        <Link href="/submit" className="wlc-botstrip-enter">
          ENTER →
        </Link>
      </footer>

      {openModal && (
        <Modal onClose={() => setOpenModal(null)}>
          {openModal === 'enter' && <EnterModal testersRedeemed={testersRedeemed} />}
          {openModal === 'manifesto' && <ManifestoModal gateCount={gateCount} />}
          {openModal === 'howitworks' && <HowItWorksModal gateCount={gateCount} />}
          {openModal === 'roadmap' && <RoadmapModal />}
        </Modal>
      )}
    </div>
  );
}

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

function EnterModal({ testersRedeemed }: { testersRedeemed: number }) {
  return (
    <>
      <div className="wlc-modal-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
      <h2 className="wlc-modal-title">Enter the protocol</h2>
      <p className="wlc-modal-body">
        Entering GASCOIN requires a single-use beta invite code. You&apos;ll sign in
        with your verified X account first, then enter your <code>GC-XXXX-XXXX</code>{' '}
        code to unlock the submission flow.
      </p>
      <p className="wlc-modal-body">
        Browsing the docs, gates, and community stays public — the code is only
        required to submit a receipt.
      </p>

      {testersRedeemed > 0 && (
        <div className="wlc-modal-traction">
          <span className="wlc-modal-traction-num">{testersRedeemed}</span>
          <span className="wlc-modal-traction-label">
            TESTERS ALREADY IN · SEASON 1 IS ACTIVE
          </span>
        </div>
      )}

      <div className="wlc-modal-callout">
        <div className="wlc-modal-callout-label">WHAT YOU&apos;LL NEED</div>
        <ul className="wlc-modal-list">
          <li>A verified X account (blue / business / government checkmark)</li>
          <li>100+ X followers</li>
          <li>A connected Solana wallet</li>
          <li>Your single-use invite code</li>
        </ul>
      </div>
      <div className="wlc-modal-cta-row">
        <Link href="/submit" className="wlc-modal-btn wlc-modal-btn--primary">
          PROCEED TO SUBMIT →
        </Link>
        <Link href="/docs" className="wlc-modal-btn">READ THE DOCS</Link>
      </div>
    </>
  );
}

function ManifestoModal({ gateCount }: { gateCount: number }) {
  return (
    <>
      <div className="wlc-modal-kicker">[ THE MANIFESTO ]</div>
      <h2 className="wlc-modal-title wlc-modal-title--big">Gas money belongs to you.</h2>
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
        be photoshopped. An X account can be a bot farm. So we don&apos;t trust one
        model. <strong>Gemini sees the image. Grok reasons across the signals.
        Claude signs off on every payout before any SOL moves.</strong> Fraud
        has to beat all three. You only have to convince all three once.
      </p>
      <h3 className="wlc-modal-h3">The tiers.</h3>
      <div className="wlc-tier-table">
        <div className="wlc-tier-row wlc-tier-row--head"><span>TIER</span><span>HOLD</span><span>MAX SOL</span><span>COOLDOWN</span></div>
        <div className="wlc-tier-row"><span>Standard</span><span>1</span><span>0.10</span><span>7d</span></div>
        <div className="wlc-tier-row"><span>Commuter</span><span>100K</span><span>0.25</span><span>7d</span></div>
        <div className="wlc-tier-row"><span>Road Warrior</span><span>5M</span><span>0.50</span><span>3.5d</span></div>
        <div className="wlc-tier-row"><span>Fleet</span><span>10M+</span><span>1.00</span><span>1.75d</span></div>
      </div>
      <div className="wlc-modal-signoff">REAL PEOPLE. REAL GAS. REAL REFUNDS.</div>
    </>
  );
}

function HowItWorksModal({ gateCount }: { gateCount: number }) {
  const steps = [
    { roman: 'I', title: 'BUY GAS', body: 'Fill up at any station. Keep the paper receipt.', foot: 'Must be within 7 days of submission. Minimum $5 USD.' },
    { roman: 'II', title: 'WRITE YOUR WALLET', body: 'Put the last 4 characters of your Solana wallet on the receipt in pen.', foot: 'Any pen. Any surface of the receipt. OCR reads it during verification.' },
    { roman: 'III', title: 'POST ON X', body: 'Public tweet tagging @GasCoinApp. Include #gascoin or $GASCOIN.', foot: 'The $GASCOIN cashtag unlocks X\'s price chart overlay on your post.' },
    { roman: 'IV', title: 'SUBMIT', body: 'Paste the tweet URL. Upload the receipt. Connect your Solana wallet.', foot: 'Season 1 beta is invite-only. Codes unlock after you sign in with X.' },
    { roman: 'V', title: 'GET PAID', body: `${gateCount} verification gates plus the three-AI review pipeline run automatically. If you pass, SOL hits your wallet.`, foot: 'Gemini sees. Grok reasons. Claude decides. No middleman ever holds your funds.' },
  ];
  return (
    <>
      <div className="wlc-modal-kicker">[ THE FLOW · {gateCount} GATES · 3 AIs ]</div>
      <h2 className="wlc-modal-title wlc-modal-title--big">How it works.</h2>
      <p className="wlc-modal-body">Five steps. No accounts to create. No paperwork. No middlemen.</p>
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
        <Link href="/submit" className="wlc-modal-btn wlc-modal-btn--primary">START SUBMISSION →</Link>
        <Link href="/how-it-works" className="wlc-modal-btn">FULL WALKTHROUGH</Link>
      </div>
    </>
  );
}

function RoadmapModal() {
  const rows: Array<{ item: string; status: string; done?: boolean }> = [
    { item: '15-gate verification engine', status: 'SHIPPED', done: true },
    { item: 'Gemini + Grok + Claude pipeline', status: 'SHIPPED', done: true },
    { item: 'mem0 entity memory + trust graph', status: 'SHIPPED', done: true },
    { item: 'Single-page docs monolith', status: 'SHIPPED', done: true },
    { item: 'Invite-code beta (Season 1)', status: 'LIVE', done: true },
    { item: 'Interactive landing page', status: 'LIVE', done: true },
    { item: 'Dry-run SOL payouts', status: 'SEASON 1', done: false },
    { item: 'Live SOL refunds', status: 'AT TOKEN LAUNCH', done: false },
    { item: 'Tier perks + referral compounding', status: 'POST-LAUNCH', done: false },
    { item: 'Fleet / enterprise tooling', status: 'POST-LAUNCH', done: false },
  ];
  return (
    <>
      <div className="wlc-modal-kicker">[ ROADMAP · STATION #01 ]</div>
      <h2 className="wlc-modal-title wlc-modal-title--big">What ships next.</h2>

      <div className="wlc-receipt">
        <div className="wlc-receipt-head">
          <div className="wlc-receipt-head-title">GASCOIN · ROADMAP RECEIPT</div>
          <div className="wlc-receipt-head-sub">STATION #01 · GASCOIN.APP</div>
        </div>
        <div className="wlc-receipt-cols"><span>ITEM</span><span>STATUS</span></div>
        <div className="wlc-receipt-rule" />
        {rows.map((r, i) => (
          <div
            key={i}
            className={`wlc-receipt-row${r.done ? ' wlc-receipt-row--done' : ''}`}
          >
            <span className="wlc-receipt-item">{r.item}</span>
            <span className="wlc-receipt-status">{r.status}</span>
          </div>
        ))}
        <div className="wlc-receipt-rule" />
        <div className="wlc-receipt-foot">RECEIPT AUTHENTIC · ON CHAIN</div>
      </div>

      <p className="wlc-modal-body wlc-modal-body--muted">
        Dates omitted on purpose. Ship first, schedule later.
      </p>
    </>
  );
}
