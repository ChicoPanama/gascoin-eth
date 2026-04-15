'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PumpSvg, type PumpRegion } from '../../components/welcome/PumpSvg';

type Props = {
  gateCount: number;
  treasuryUsd: string;
  testersRedeemed: number;
  claimsSubmitted: number;
  isDryRun: boolean;
};

type PopoverKind = 'enter' | 'manifesto' | 'howitworks' | 'roadmap';

type PopoverState = {
  kind: PopoverKind;
  rect: DOMRect;
} | null;

type HoverState = {
  region: PumpRegion;
  labelX: number;
  labelY: number;
} | null;

const REGION_LABELS: Record<PumpRegion, string> = {
  handle: 'DOCS ↗',
  display: 'ENTER',
  body: 'MANIFESTO',
  nozzle: 'HOW IT WORKS',
  base: 'ROADMAP',
};

/**
 * /welcome — PR #45 rewrite.
 *
 * Major changes from PR #44:
 *
 * 1. **Splash screen DELETED.** The pump IS the page from load. No more
 *    full-screen "ENTER THE STATION" gate. The pump display pulses every
 *    few seconds to draw attention as the real entry point. On page load,
 *    the pump scales in with a subtle entry animation.
 *
 * 2. **SVG is now a React component (PumpSvg)**, not an HTML-injected
 *    asset. Every hotspot <g> has real React onClick + onMouseEnter
 *    + onMouseLeave props, routed through React's synthetic event system.
 *    Clicks are guaranteed to fire — no addEventListener race, no
 *    dependency churn, no stale closures.
 *
 * 3. **Simplified click pipeline**: click → playFlash() (DOM class
 *    re-application, pure visual) → dispatch action immediately. No
 *    setTimeout, no armAction guard, no useCallback dep tracking.
 *
 * 4. **Status LED restored** inside the pump body (SVG <animate>).
 */
export function WelcomeClient({
  gateCount,
  testersRedeemed,
  isDryRun,
}: Props) {
  const router = useRouter();
  const [popover, setPopover] = useState<PopoverState>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const stageRef = useRef<HTMLElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  /** Replay the CRT flash by yanking and re-adding the animation class. */
  const playFlash = useCallback(() => {
    const el = flashRef.current;
    if (!el) return;
    el.classList.remove('is-flashing');
    // Force a reflow so the animation restarts on the next tick
    void el.offsetWidth;
    el.classList.add('is-flashing');
  }, []);

  /** Hotspot click dispatch — called directly from PumpSvg onClick handlers. */
  const onHotspotClick = useCallback(
    (region: PumpRegion, rect: DOMRect) => {
      // eslint-disable-next-line no-console
      console.log(`[welcome] click → ${region}`);
      playFlash();
      switch (region) {
        case 'handle':
          router.push('/docs');
          break;
        case 'display':
          setPopover({ kind: 'enter', rect });
          break;
        case 'body':
          setPopover({ kind: 'manifesto', rect });
          break;
        case 'nozzle':
          setPopover({ kind: 'howitworks', rect });
          break;
        case 'base':
          setPopover({ kind: 'roadmap', rect });
          break;
      }
    },
    [playFlash, router]
  );

  /** Hotspot hover dispatch — tracks the rect so the floating label
   *  can position directly above the hovered region. */
  const onHotspotHover = useCallback(
    (region: PumpRegion | null, rect: DOMRect | null) => {
      if (!region || !rect) {
        setHover(null);
        return;
      }
      const stage = stageRef.current;
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      setHover({
        region,
        labelX: rect.left - stageRect.left + rect.width / 2,
        labelY: rect.top - stageRect.top - 36,
      });
    },
    []
  );

  // ESC closes popover
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll while a popover is open on mobile
  useEffect(() => {
    if (popover) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [popover]);

  return (
    <div className="wlc-root" data-theme="dark">
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

        {hover && !popover && (
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

        <div className="wlc-pump wlc-pump--live">
          <PumpSvg
            hoverRegion={hover?.region ?? null}
            onHotspotClick={onHotspotClick}
            onHotspotHover={onHotspotHover}
          />
        </div>

        <div className="wlc-nudge">
          <span className="wlc-nudge-dot" />
          CLICK THE GASCOIN SCREEN TO ENTER
        </div>

        {/* Click-flash overlay — always present, animates when .is-flashing */}
        <div ref={flashRef} className="wlc-click-flash" aria-hidden />
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

      {popover && (
        <Popover anchor={popover.rect} onClose={() => setPopover(null)}>
          {popover.kind === 'enter' && (
            <EnterPopover testersRedeemed={testersRedeemed} />
          )}
          {popover.kind === 'manifesto' && (
            <ManifestoPopover gateCount={gateCount} />
          )}
          {popover.kind === 'howitworks' && (
            <HowItWorksPopover gateCount={gateCount} />
          )}
          {popover.kind === 'roadmap' && <RoadmapPopover />}
        </Popover>
      )}
    </div>
  );
}

// ─── Popover shell ────────────────────────────────────────────────────

function Popover({
  anchor,
  onClose,
  children,
}: {
  anchor: DOMRect;
  onClose: () => void;
  children: ReactNode;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; side: 'right' | 'left' | 'below' }>(() => ({
    left: 0,
    top: 0,
    side: 'right',
  }));
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      setPlaced(true);
      return;
    }

    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;

    let left = anchor.right + pad;
    let top = anchor.top + anchor.height / 2 - ph / 2;
    let side: 'right' | 'left' | 'below' = 'right';

    if (left + pw > vw - pad) {
      left = anchor.left - pw - pad;
      side = 'left';
    }
    if (left < pad) {
      left = Math.max(pad, Math.min(vw - pw - pad, anchor.left + anchor.width / 2 - pw / 2));
      top = anchor.bottom + pad;
      side = 'below';
    }
    if (top < pad) top = pad;
    if (top + ph > vh - pad) top = vh - ph - pad;

    setPos({ left, top, side });
    setPlaced(true);
  }, [anchor]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = popRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };
    const t = window.setTimeout(() => {
      document.addEventListener('click', onDoc);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('click', onDoc);
    };
  }, [onClose]);

  return (
    <>
      <div className="wlc-popover-scrim" aria-hidden />
      <div
        ref={popRef}
        className={`wlc-popover wlc-popover--${pos.side}`}
        role="dialog"
        aria-modal="true"
        style={placed ? { left: pos.left, top: pos.top } : { opacity: 0, pointerEvents: 'none' }}
      >
        <button
          type="button"
          className="wlc-popover-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <div className="wlc-popover-inner">{children}</div>
      </div>
    </>
  );
}

// ─── Popover contents ────────────────────────────────────────────────

function EnterPopover({ testersRedeemed }: { testersRedeemed: number }) {
  return (
    <>
      <div className="wlc-pop-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
      <h2 className="wlc-pop-title">Enter the protocol</h2>
      <p className="wlc-pop-body">
        Single-use beta invite code required. Verified X accounts only.
        Sign in with X first, then enter your <code>GC-XXXX-XXXX</code> code.
      </p>
      {testersRedeemed > 0 && (
        <div className="wlc-pop-traction">
          <span className="wlc-pop-traction-num">{testersRedeemed}</span>
          <span className="wlc-pop-traction-label">TESTERS ALREADY IN</span>
        </div>
      )}
      <div className="wlc-pop-actions">
        <Link href="/submit" className="wlc-pop-btn wlc-pop-btn--primary">
          PROCEED →
        </Link>
        <Link href="/docs" className="wlc-pop-btn">DOCS</Link>
      </div>
    </>
  );
}

function ManifestoPopover({ gateCount }: { gateCount: number }) {
  return (
    <>
      <div className="wlc-pop-kicker">[ THE MANIFESTO ]</div>
      <h2 className="wlc-pop-title">Gas money belongs to you.</h2>
      <p className="wlc-pop-body">
        A public Solana treasury that refunds real gas receipts in SOL.
        No middlemen, no custodians. Verified by {gateCount} deterministic
        gates and three AI models.
      </p>
      <p className="wlc-pop-body wlc-pop-body--muted">
        Gemini sees the image. Grok reasons. Claude signs off before any
        SOL moves.
      </p>
      <div className="wlc-pop-actions">
        <Link href="/docs" className="wlc-pop-btn wlc-pop-btn--primary">
          READ FULL MANIFESTO →
        </Link>
      </div>
    </>
  );
}

function HowItWorksPopover({ gateCount }: { gateCount: number }) {
  return (
    <>
      <div className="wlc-pop-kicker">[ THE FLOW · 5 STEPS ]</div>
      <h2 className="wlc-pop-title">How it works</h2>
      <ol className="wlc-pop-steps">
        <li><span>I</span> Buy gas at any station</li>
        <li><span>II</span> Write your wallet last-4 on the receipt</li>
        <li><span>III</span> Post a tweet tagging @GasCoinApp</li>
        <li><span>IV</span> Submit · sign in · upload receipt</li>
        <li><span>V</span> {gateCount} gates + 3 AIs verify → SOL to your wallet</li>
      </ol>
      <div className="wlc-pop-actions">
        <Link href="/how-it-works" className="wlc-pop-btn wlc-pop-btn--primary">
          FULL WALKTHROUGH →
        </Link>
        <Link href="/submit" className="wlc-pop-btn">START</Link>
      </div>
    </>
  );
}

function RoadmapPopover() {
  const rows = [
    { item: '15-gate engine', status: 'SHIPPED', done: true },
    { item: 'Gemini + Grok + Claude', status: 'SHIPPED', done: true },
    { item: 'Invite-code beta', status: 'LIVE', done: true },
    { item: 'Docs monolith', status: 'SHIPPED', done: true },
    { item: 'Dry-run payouts', status: 'SEASON 1', done: false },
    { item: 'Live SOL refunds', status: 'AT LAUNCH', done: false },
    { item: 'Tier perks', status: 'POST-LAUNCH', done: false },
  ];
  return (
    <>
      <div className="wlc-pop-kicker">[ ROADMAP · STATION #01 ]</div>
      <h2 className="wlc-pop-title">What ships next</h2>
      <ul className="wlc-pop-roadmap">
        {rows.map((r, i) => (
          <li key={i} className={r.done ? 'is-done' : ''}>
            <span className="wlc-pop-roadmap-item">{r.item}</span>
            <span className="wlc-pop-roadmap-status">{r.status}</span>
          </li>
        ))}
      </ul>
      <p className="wlc-pop-body wlc-pop-body--muted">
        Ship first, schedule later.
      </p>
    </>
  );
}
