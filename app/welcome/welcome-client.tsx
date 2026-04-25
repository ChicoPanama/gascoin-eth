'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { PumpSvg, type PumpRegion } from '../../components/welcome/PumpSvg';
import { GLOBAL_GAS_PRICES } from '../../lib/gas-prices-global';
import { GATE_COUNT } from '../../lib/policy';

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
  regionRect: DOMRect;
} | null;

type Callout = {
  labelLeft: number;
  labelTop: number;
  lineX1: number;
  lineY1: number;
  lineX2: number;
  lineY2: number;
};

const REGION_LABELS: Record<PumpRegion, string> = {
  handle: 'DOCS ↗',
  display: 'ENTER',
  body: 'MANIFESTO',
  nozzle: 'HOW IT WORKS',
  base: 'ROADMAP',
};

/**
 * Compute where to place the floating hover label for each region, plus
 * a callout line from the label back to the region's edge.
 *
 * "Outward" direction by region:
 *   - handle → UP   (80px above the pump top)
 *   - display → LEFT (320px left of the region center)
 *   - body → LEFT (340px left)
 *   - nozzle → RIGHT (200px right)
 *   - base → DOWN (80px below)
 *
 * All coordinates are relative to the stage container (not the viewport).
 */
function computeCallout(
  region: PumpRegion,
  regionRect: DOMRect,
  stageRect: DOMRect
): Callout {
  const rx = regionRect.left - stageRect.left + regionRect.width / 2;
  const ry = regionRect.top - stageRect.top + regionRect.height / 2;
  const rTop = regionRect.top - stageRect.top;
  const rBottom = regionRect.bottom - stageRect.top;
  const rLeft = regionRect.left - stageRect.left;
  const rRight = regionRect.right - stageRect.left;

  const stageW = stageRect.width;
  const stageH = stageRect.height;
  const pad = 32;

  // Default (shouldn't hit)
  let labelLeft = rx;
  let labelTop = ry;
  let lineX1 = rx;
  let lineY1 = ry;
  let lineX2 = rx;
  let lineY2 = ry;

  switch (region) {
    case 'handle': {
      // Callout UP
      labelLeft = rx;
      labelTop = Math.max(pad + 8, rTop - 72);
      lineX1 = rx;
      lineY1 = rTop;
      lineX2 = rx;
      lineY2 = labelTop + 22;
      break;
    }
    case 'display': {
      // Callout LEFT (far outside the pump)
      const target = Math.max(pad + 80, rLeft - 240);
      labelLeft = target;
      labelTop = ry;
      lineX1 = rLeft;
      lineY1 = ry;
      lineX2 = target + 40;
      lineY2 = ry;
      break;
    }
    case 'body': {
      // Callout LEFT, slightly lower
      const target = Math.max(pad + 80, rLeft - 260);
      labelLeft = target;
      labelTop = ry + 20;
      lineX1 = rLeft;
      lineY1 = ry + 20;
      lineX2 = target + 40;
      lineY2 = ry + 20;
      break;
    }
    case 'nozzle': {
      // Callout RIGHT
      const target = Math.min(stageW - pad - 80, rRight + 140);
      labelLeft = target;
      labelTop = ry;
      lineX1 = rRight;
      lineY1 = ry;
      lineX2 = target - 40;
      lineY2 = ry;
      break;
    }
    case 'base': {
      // Callout DOWN
      labelLeft = rx;
      labelTop = Math.min(stageH - pad - 8, rBottom + 72);
      lineX1 = rx;
      lineY1 = rBottom;
      lineX2 = rx;
      lineY2 = labelTop - 22;
      break;
    }
  }

  return { labelLeft, labelTop, lineX1, lineY1, lineX2, lineY2 };
}

/**
 * /welcome — PR #46.
 *
 * Changes from PR #45:
 *   1. Top-left brand is now a real logo <img>, not "[G] GASCOIN" text
 *   2. Bottom @GasCoinApp link embeds the official X icon SVG
 *   3. Display rotates through country gas-price averages when idle
 *   4. Hover labels are pushed OUTSIDE the pump with a connecting dashed
 *      line back to the hotspot (tech-diagram callout style)
 *   5. Manifesto popover is blank — "coming soon, follow @GasCoinApp"
 *   6. Pump has a sub-display (GALLONS/PRICE), keypad, grade selector,
 *      card reader, brand plate, and corner rivets
 */
export function WelcomeClient({
  gateCount,
  testersRedeemed,
  isDryRun,
}: Props) {
  const router = useRouter();
  const [popover, setPopover] = useState<PopoverState>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [stageDims, setStageDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const stageRef = useRef<HTMLElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  // Rotate the display ticker every 2.8 seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      setTickerIdx((i) => (i + 1) % GLOBAL_GAS_PRICES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  // Track stage dimensions for the callout SVG viewBox
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const r = stage.getBoundingClientRect();
      setStageDims({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const tickerPrice = GLOBAL_GAS_PRICES[tickerIdx];

  const playFlash = useCallback(() => {
    const el = flashRef.current;
    if (!el) return;
    el.classList.remove('is-flashing');
    // Force a reflow so the animation restarts
    void el.offsetWidth;
    el.classList.add('is-flashing');
  }, []);

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

  const onHotspotHover = useCallback(
    (region: PumpRegion | null, rect: DOMRect | null) => {
      if (!region || !rect) {
        setHover(null);
        return;
      }
      setHover({ region, regionRect: rect });
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

  // Compute the callout position + line for the currently-hovered region
  const callout = useMemo(() => {
    if (!hover || popover) return null;
    const stage = stageRef.current;
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    return computeCallout(hover.region, hover.regionRect, stageRect);
  }, [hover, popover]);

  return (
    <div className="wlc-root" data-theme="dark">
      <div className="wlc-grain" aria-hidden />

      <header className="wlc-topstrip">
        <Link href="/" className="wlc-topstrip-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/brands/gascoin.svg"
            alt=""
            className="wlc-topstrip-logo"
            width={24}
            height={24}
          />
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

        {/* Callout line overlay — drawn when hovering, not when a popover
            is open. Uses the stage's own dimensions as the viewBox so
            coordinates map 1:1 to pixels. */}
        {callout && stageDims.width > 0 && (
          <svg
            className="wlc-callout-svg"
            width={stageDims.width}
            height={stageDims.height}
            viewBox={`0 0 ${stageDims.width} ${stageDims.height}`}
            aria-hidden
          >
            <line
              x1={callout.lineX1}
              y1={callout.lineY1}
              x2={callout.lineX2}
              y2={callout.lineY2}
              stroke="rgba(231,233,234,0.55)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <circle
              cx={callout.lineX1}
              cy={callout.lineY1}
              r="2.5"
              fill="rgba(231,233,234,0.8)"
            />
          </svg>
        )}

        {hover && !popover && callout && (
          <div
            className={`wlc-hover-label wlc-hover-label--${hover.region}`}
            style={{
              left: `${callout.labelLeft}px`,
              top: `${callout.labelTop}px`,
            }}
          >
            [ {REGION_LABELS[hover.region]} ]
          </div>
        )}

        <div className="wlc-pump wlc-pump--live">
          <PumpSvg
            hoverRegion={hover?.region ?? null}
            tickerPrice={tickerPrice}
            onHotspotClick={onHotspotClick}
            onHotspotHover={onHotspotHover}
          />
        </div>

        <div className="wlc-nudge">
          <span className="wlc-nudge-dot" />
          CLICK THE GASCOIN SCREEN TO ENTER
        </div>

        <div ref={flashRef} className="wlc-click-flash" aria-hidden />
      </main>

      <footer className="wlc-botstrip">
        <a
          href="https://x.com/GasCoinApp"
          target="_blank"
          rel="noopener noreferrer"
          className="wlc-botstrip-link wlc-botstrip-x"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/brands/x.svg"
            alt=""
            className="wlc-botstrip-x-icon"
            width={12}
            height={12}
          />
          <span>@GasCoinApp</span>
          <span className="wlc-botstrip-x-arrow" aria-hidden>↗</span>
        </a>
        <div className="wlc-botstrip-legal">
          {isDryRun
            ? 'SEASON 1 · DRY-RUN · POINTS ONLY'
            : 'SEASON 1 · LIVE ETH PAYOUTS'}
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
          {popover.kind === 'manifesto' && <ManifestoPopover />}
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
  const { ready, authenticated, login, getAccessToken, user, linkTwitter, linkWallet } = usePrivy();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handle = ((user as any)?.twitter?.username || '').toString();

  // Mirror server's wallet-detection (lib/integrations/privy.ts) — Privy v2
  // exposes the active wallet on user.wallet.address; older accounts may
  // only have it in linked_accounts. The redeem endpoint reads the same
  // field, so checking it client-side avoids letting a wallet-less user
  // hit the form just to get a "wallet_connect_required" 400 back.
  const linkedWallet = ((user as any)?.wallet?.address)
    || (((user as any)?.linked_accounts || []).find((a: any) => a?.type === 'wallet')?.address)
    || '';

  // When user signs in, check if they already have an invite → redirect immediately
  useEffect(() => {
    let cancelled = false;
    if (!ready || !authenticated) return;
    (async () => {
      setChecking(true);
      try {
        const token = await getAccessToken();
        if (!token) { setChecking(false); return; }
        const res = await fetch('/api/invites/redeem', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
            'x-privy-user-id': String((user as any)?.id || ''),
            'x-privy-handle': handle,
          },
        });
        const data = await res.json();
        if (!cancelled) {
          if (data?.hasInvite) router.push('/submit');
          setChecking(false);
        }
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken, user, handle, router]);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const normalized = code.trim().toUpperCase();
    if (!/^GC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) {
      setError('Invalid format — expected GC-XXXX-XXXX.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) { setError('Sign in required.'); setSubmitting(false); return; }
      const res = await fetch('/api/invites/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
          'x-privy-user-id': String((user as any)?.id || ''),
          'x-privy-handle': handle,
        },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || data?.error || 'Redemption failed.');
        return;
      }
      router.push('/submit');
    } catch (err: any) {
      setError(err?.message || 'Redemption failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || checking) {
    return (
      <>
        <div className="wlc-pop-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
        <h2 className="wlc-pop-title">Enter the protocol</h2>
        <p className="wlc-pop-body">Loading…</p>
      </>
    );
  }

  if (!authenticated) {
    return (
      <>
        <div className="wlc-pop-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
        <h2 className="wlc-pop-title">Enter the protocol</h2>
        <p className="wlc-pop-body">
          Single-use beta invite code required. Sign in with your verified X account,
          then enter your <code>GC-XXXX-XXXX</code> code to unlock access.
        </p>
        {testersRedeemed > 0 && (
          <div className="wlc-pop-traction">
            <span className="wlc-pop-traction-num">{testersRedeemed}</span>
            <span className="wlc-pop-traction-label">TESTERS ALREADY IN</span>
          </div>
        )}
        <div className="wlc-pop-actions">
          <button
            type="button"
            className="wlc-pop-btn wlc-pop-btn--primary"
            onClick={() => login({ loginMethods: ['twitter'] })}
          >
            SIGN IN WITH X →
          </button>
        </div>
      </>
    );
  }

  // Authenticated but X isn't linked (e.g. signed in via wallet-only
  // from a different surface). Invite redemption requires x_user_id /
  // x_handle so we can enforce one-code-per-X-account. Gate the form
  // behind a "link X" step instead of letting the user hit UNLOCK and
  // get a bare "unauthorized" back from the server.
  if (!handle) {
    return (
      <>
        <div className="wlc-pop-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
        <h2 className="wlc-pop-title">Link your X account</h2>
        <p className="wlc-pop-body">
          You're signed in, but your X account isn't linked yet. Season 1
          invite codes are pinned to your X identity — link it to continue.
        </p>
        <div className="wlc-pop-actions">
          <button
            type="button"
            className="wlc-pop-btn wlc-pop-btn--primary"
            onClick={() => { try { linkTwitter(); } catch { /* Privy handles UI */ } }}
          >
            LINK X ACCOUNT →
          </button>
        </div>
      </>
    );
  }

  // X is linked but no wallet yet. The server pins the Pioneer Bonus
  // payout to the wallet active at redemption time, so we have to
  // collect a wallet BEFORE the form — otherwise the user types the
  // code, hits UNLOCK, and the request 400s with wallet_connect_required.
  if (!linkedWallet) {
    return (
      <>
        <div className="wlc-pop-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
        <h2 className="wlc-pop-title">Connect your wallet</h2>
        <p className="wlc-pop-body">
          Signed in as <strong>@{handle}</strong>. Connect the Ethereum
          wallet you want pinned to your beta account — your Season 1
          Pioneer Bonus and every refund will land here, so use one you
          control and will keep.
        </p>
        <div className="wlc-pop-actions">
          <button
            type="button"
            className="wlc-pop-btn wlc-pop-btn--primary"
            onClick={() => { try { linkWallet(); } catch { /* Privy handles UI */ } }}
          >
            CONNECT WALLET →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="wlc-pop-kicker">[ SEASON 1 · INVITE REQUIRED ]</div>
      <h2 className="wlc-pop-title">Enter your invite code</h2>
      <p className="wlc-pop-body">
        Signed in as <strong>@{handle}</strong>. Enter your single-use
        beta code to unlock the protocol.
      </p>
      <form onSubmit={redeem} style={{ marginTop: 16 }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="GC-XXXX-XXXX"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 4,
            color: 'inherit',
            outline: 'none',
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p style={{ color: '#ff6b6b', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 12, margin: '0 0 12px' }}>
            {error}
          </p>
        )}
        <div className="wlc-pop-actions">
          <button
            type="submit"
            className="wlc-pop-btn wlc-pop-btn--primary"
            disabled={submitting}
          >
            {submitting ? 'REDEEMING…' : 'UNLOCK →'}
          </button>
        </div>
      </form>
    </>
  );
}

function ManifestoPopover() {
  return (
    <>
      <div className="wlc-pop-kicker">[ THE MANIFESTO ]</div>
      <h2 className="wlc-pop-title">Coming soon.</h2>
      <p className="wlc-pop-body">
        The GASCOIN manifesto drops on X first. Follow <strong>@GasCoinApp</strong>{' '}
        to catch it when it lands — then it appears here.
      </p>
      <div className="wlc-pop-actions">
        <a
          href="https://x.com/GasCoinApp"
          target="_blank"
          rel="noopener noreferrer"
          className="wlc-pop-btn wlc-pop-btn--primary"
        >
          FOLLOW @GasCoinApp →
        </a>
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
        <li><span>V</span> {gateCount} gates + 3 AIs verify → CRYPTO to your wallet</li>
      </ol>
      <div className="wlc-pop-actions">
        <a
          href="https://x.com/GasCoinApp"
          target="_blank"
          rel="noopener noreferrer"
          className="wlc-pop-btn wlc-pop-btn--primary"
        >
          FOLLOW @GasCoinApp →
        </a>
      </div>
    </>
  );
}

function RoadmapPopover() {
  const acts = [
    {
      numeral: 'I',
      name: 'INFRASTRUCTURE',
      status: 'SHIPPED',
      state: 'done' as const,
      prose: 'The foundation the whole protocol runs on — built, tested, and hardened.',
      items: [
        'Ethereum payout rails',
        `${GATE_COUNT}-gate automated verification engine`,
        'AI receipt scanning with computer vision',
        'Tweet proof + wallet identity checks',
        'Fraud detection and rate limiting',
        'Admin dashboard and audit logs',
      ],
    },
    {
      numeral: 'II',
      name: 'SEASON 1 BETA',
      status: 'LIVE',
      state: 'live' as const,
      prose: 'Invite-only. Real users, real receipts, real ETH payouts hitting real wallets.',
      items: [
        'Sign in with X (Twitter)',
        'Ethereum wallet linking (MetaMask, Rabby, Rainbow, Coinbase Wallet)',
        'Gas receipt upload and AI review',
        'Live ETH payouts on approval',
        'Claims history and status tracking',
        'Invite code system for early access',
      ],
    },
    {
      numeral: 'III',
      name: 'PUBLIC LAUNCH',
      status: 'NEXT',
      state: 'next' as const,
      prose: 'Doors open to everyone. The more $GAS you hold, the more you earn.',
      items: [
        'Open access — no invite needed',
        '$GAS token tiers (Commuter, Road Warrior, Fleet)',
        'Faster submission cooldowns per tier',
        'Referral rewards with on-chain tracking',
        'Engagement leaderboard',
        'Public claims explorer',
      ],
    },
    {
      numeral: 'IV',
      name: 'THE GAS NETWORK',
      status: 'HORIZON',
      state: 'future' as const,
      prose: 'The only verified creator intelligence layer in crypto. Brands spend billions on creators with no way to prove what happened. The Gas Network is the proof layer.',
      items: [
        'Verified Creator Profiles — wallet-linked identity with AI-scored engagement history',
        'Content Impact Scoring — prove what each post drove on-chain, post by post',
        'Conversion Attribution — content → audience → action, fully traced',
        'Creator Marketplace — smart contracts release payment on verified performance',
        'Intelligence API — $GAS is the access key for projects querying the network',
        'Verified Reach Certificates — earn your rank, prove your audience',
      ],
    },
  ];

  return (
    <>
      <div className="wlc-pop-kicker">[ ROADMAP ]</div>
      <h2 className="wlc-pop-title">The journey.</h2>
      <div className="wlc-roadmap">
        {acts.map((act, i) => (
          <div key={i} className={`wlc-roadmap-act wlc-roadmap-act--${act.state}`}>
            <div className="wlc-roadmap-spine-col" aria-hidden>
              <div className="wlc-roadmap-node" />
              {i < acts.length - 1 && <div className="wlc-roadmap-line" />}
            </div>
            <div className="wlc-roadmap-body">
              <div className="wlc-roadmap-header">
                <span className="wlc-roadmap-numeral">{act.numeral}</span>
                <span className="wlc-roadmap-name">{act.name}</span>
                <span className="wlc-roadmap-status">{act.status}</span>
              </div>
              <p className="wlc-roadmap-prose">{act.prose}</p>
              <ul className="wlc-roadmap-items">
                {act.items.map((item, ii) => (
                  <li key={ii} className="wlc-roadmap-item">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
