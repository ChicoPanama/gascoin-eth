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

type Props = {
  pumpSvg: string;
  gateCount: number;
  treasuryUsd: string;
  testersRedeemed: number;
  claimsSubmitted: number;
  isDryRun: boolean;
};

type PopoverKind = 'enter' | 'manifesto' | 'howitworks' | 'roadmap';
type Region = 'handle' | 'display' | 'body' | 'nozzle' | 'base';

type PopoverState = {
  kind: PopoverKind;
  rect: DOMRect;
} | null;

type HoverState = {
  region: Region;
  labelX: number;
  labelY: number;
} | null;

const REGION_LABELS: Record<Region, string> = {
  handle: 'DOCS ↗',
  display: 'ENTER',
  body: 'MANIFESTO',
  nozzle: 'HOW IT WORKS',
  base: 'ROADMAP',
};

/**
 * /welcome — PR #44 rewrite.
 *
 * Three big changes from PR #43:
 *
 * 1. **Ref-based armAction** (fixes dead clicks). The previous version wrapped
 *    armAction in useCallback with `[flashing]` as a dep. Every click set
 *    flashing=true, which recreated armAction, which re-ran the click-listener
 *    effect mid-flight, which tore down and re-attached DOM listeners during
 *    an in-flight event. The result was click events silently dying in the
 *    race. Now armAction reads `flashingRef.current` instead of closure
 *    state, is wrapped with `[]` deps, and never changes identity.
 *
 * 2. **Event delegation on the pump container**. Instead of per-region
 *    addEventListener calls (one per hotspot), a single click listener on
 *    the pump div uses `event.target.closest('g.pump-region')` to find the
 *    hit region and dispatch. One listener, attached once, never re-attached.
 *
 * 3. **Anchored Popover replaces full-screen Modal**. When a region is
 *    clicked, we capture its getBoundingClientRect and pass it to the
 *    Popover. The Popover places itself near the clicked region (right,
 *    left, or above depending on viewport fit). On mobile (≤ 768px), CSS
 *    flips it to a full-screen sheet.
 */
export function WelcomeClient({
  pumpSvg,
  gateCount,
  testersRedeemed,
  isDryRun,
}: Props) {
  const router = useRouter();
  const [splashGone, setSplashGone] = useState(false);
  const [popover, setPopover] = useState<PopoverState>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const [flashing, setFlashing] = useState(false);

  const pumpRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  // Ref-based "currently flashing" guard — decoupled from React state so
  // event listeners can read the latest value without re-attaching.
  const flashingRef = useRef(false);

  /**
   * Stable click-action arming. Reads the LATEST flashing state via ref,
   * not via closure. useCallback deps are empty so identity is stable
   * across renders.
   */
  const armAction = useCallback((action: () => void) => {
    if (flashingRef.current) return;
    flashingRef.current = true;
    setFlashing(true);

    const prefersReduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = prefersReduce ? 0 : 120;

    window.setTimeout(() => {
      flashingRef.current = false;
      setFlashing(false);
      action();
    }, delay);
  }, []);

  // Event delegation on the pump container — attach once, tear down once.
  useEffect(() => {
    const root = pumpRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    // Verify the injected SVG mounted before we try to wire it up.
    const regions = Array.from(
      root.querySelectorAll<SVGGElement>('g.pump-region')
    );
    if (regions.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[welcome] no pump-region groups found in SVG');
      return;
    }
    // eslint-disable-next-line no-console
    console.log(`[welcome] attached to ${regions.length} pump regions`);

    // Per-region affordance — set once, never touched again
    for (const el of regions) {
      el.style.cursor = 'pointer';
      el.setAttribute('role', 'button');
    }

    const regionForId = (id: string): Region | null => {
      switch (id) {
        case 'pump-handle': return 'handle';
        case 'pump-display': return 'display';
        case 'pump-body': return 'body';
        case 'pump-nozzle': return 'nozzle';
        case 'pump-base': return 'base';
        default: return null;
      }
    };

    const actionForId = (id: string, rect: DOMRect): (() => void) | null => {
      switch (id) {
        case 'pump-handle':  return () => router.push('/docs');
        case 'pump-display': return () => setPopover({ kind: 'enter', rect });
        case 'pump-body':    return () => setPopover({ kind: 'manifesto', rect });
        case 'pump-nozzle':  return () => setPopover({ kind: 'howitworks', rect });
        case 'pump-base':    return () => setPopover({ kind: 'roadmap', rect });
        default: return null;
      }
    };

    const findRegion = (target: EventTarget | null): SVGGElement | null => {
      if (!(target instanceof Element)) return null;
      return target.closest<SVGGElement>('g.pump-region');
    };

    const onClick = (e: MouseEvent) => {
      const el = findRegion(e.target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const action = actionForId(el.id, rect);
      if (!action) return;
      armAction(action);
    };

    const onMouseOver = (e: MouseEvent) => {
      const el = findRegion(e.target);
      if (!el) return;
      const key = regionForId(el.id);
      if (!key) return;
      const stageRect = stage.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setHover({
        region: key,
        labelX: rect.left - stageRect.left + rect.width / 2,
        labelY: rect.top - stageRect.top - 36,
      });
    };

    const onMouseOut = (e: MouseEvent) => {
      // Only clear when leaving to something OUTSIDE the current region
      const el = findRegion(e.target);
      if (!el) return;
      const related = findRegion(e.relatedTarget);
      if (related === el) return;
      setHover(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = findRegion(e.target);
      if (!el) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const action = actionForId(el.id, rect);
      if (!action) return;
      armAction(action);
    };

    root.addEventListener('click', onClick);
    root.addEventListener('mouseover', onMouseOver);
    root.addEventListener('mouseout', onMouseOut);
    root.addEventListener('keydown', onKeyDown);

    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('mouseover', onMouseOver);
      root.removeEventListener('mouseout', onMouseOut);
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [armAction, router]);

  // Apply hover class to SVG root for CSS-driven per-region anims
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

  // ESC closes popover
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

        {/*
          The pump SVG is a repo-committed static asset at
          public/welcome/pump.svg — not user input, safe to inject.
        */}
        <div
          ref={pumpRef}
          className={`wlc-pump${splashGone ? ' wlc-pump--live' : ''}`}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: pumpSvg }}
        />

        <div className="wlc-nudge">
          <span className="wlc-nudge-dot" />
          CLICK ANY PART OF THE PUMP
        </div>

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
//
// Anchors itself to a DOMRect (the clicked region's bounding rect). On
// desktop, positions to the right / left / above / below the anchor
// depending on viewport fit. On mobile (≤ 768px), CSS overrides it to
// fill the viewport as a sheet.

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

  // Position after mount — measure actual popover size and place
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

    // Preferred: right of the anchor, vertically centered
    let left = anchor.right + pad;
    let top = anchor.top + anchor.height / 2 - ph / 2;
    let side: 'right' | 'left' | 'below' = 'right';

    // If overflow right, flip to left
    if (left + pw > vw - pad) {
      left = anchor.left - pw - pad;
      side = 'left';
    }
    // If still overflow (very wide popover), place below the anchor
    if (left < pad) {
      left = Math.max(pad, Math.min(vw - pw - pad, anchor.left + anchor.width / 2 - pw / 2));
      top = anchor.bottom + pad;
      side = 'below';
    }
    // Clamp vertically
    if (top < pad) top = pad;
    if (top + ph > vh - pad) top = vh - ph - pad;

    setPos({ left, top, side });
    setPlaced(true);
  }, [anchor]);

  // Outside-click dismiss (delayed one tick so the click that opened the
  // popover doesn't immediately close it)
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

// ─── Popover contents (tight, popover-sized) ─────────────────────────

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
