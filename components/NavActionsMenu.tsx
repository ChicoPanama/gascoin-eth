'use client';

/**
 * NavActionsMenu
 *
 * Compact dropdown trigger that collapses the `WalletButton` + `AuthNavButton`
 * actions cluster into a single button at laptop widths (901–1440px).
 *
 * ── Why the dropdown is portaled ─────────────────────────────────────
 * `.gc-nav` has `backdrop-filter: blur(24px)` which creates a new CSS
 * stacking context. An `position: absolute` descendant cannot escape the
 * 60px-tall sticky nav's box no matter how high `z-index` is set — it
 * gets visually clipped at the nav's bottom edge.
 *
 * Solution: render the dropdown panel via `createPortal(..., document.body)`
 * with `position: fixed` and coordinates computed from the trigger's
 * `getBoundingClientRect()`. This escapes the nav's stacking context
 * entirely and lets the panel render anywhere on the screen.
 *
 * Same pattern `MobileMenu.tsx` uses for its full-screen overlay.
 *
 * ── Visibility is still CSS-driven ───────────────────────────────────
 * The TRIGGER button is shown/hidden by the `.gc-nav-actions-menu`
 * wrapper class via media queries in `app/globals.css`:
 *   - >=1441px → hidden (full inline cluster shows instead)
 *   - 901–1440 → visible (default)
 *   - <=900px → hidden (MobileMenu takes over)
 *
 * No JS viewport detection, no hydration flicker.
 *
 * ── Aesthetic notes ──────────────────────────────────────────────────
 * Matches the brutalist-monospace nav: IBM Plex Mono, 1px sharp border,
 * zero radius, ASCII glyph trigger (◉), restrained 80ms motion. At
 * ≤1280px the trigger collapses to icon-only to preserve space for the
 * 11 nav links. Do NOT convert to a three-lines hamburger — that glyph
 * is reserved for `<=900px` where MobileMenu takes over.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
// @ts-ignore — react-dom types not installed but createPortal works at runtime
import { createPortal } from 'react-dom';
import { WalletButton } from './ui/WalletButton';
import { AuthNavButton } from './AuthNavButton';

type Coords = { top: number; right: number } | null;

// useLayoutEffect on the client, useEffect on the server (avoids SSR warning)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function NavActionsMenu() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Portal target — wait for client mount so SSR doesn't try to touch document.body
  useEffect(() => { setMounted(true); }, []);

  // Compute the panel's screen coordinates from the trigger rect whenever
  // the dropdown opens. `position: fixed` + these inline styles is what
  // lets the portaled panel float anywhere without a positioned ancestor.
  useIsomorphicLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: Math.round(rect.bottom + 8),
      right: Math.round(window.innerWidth - rect.right),
    });
  }, [open]);

  // Click-outside close. Panel uses e.stopPropagation on mousedown so
  // clicks inside the panel don't bubble to this handler.
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape key close + focus return to trigger
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Close on scroll or resize — the portaled panel's fixed coords go
  // stale the moment the viewport moves. Simpler to close than to
  // recompute on every scroll event.
  useEffect(() => {
    if (!open) return;
    function close() { setOpen(false); }
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="gc-nav-actions-menu-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`gc-nav-actions-trigger${open ? ' gc-nav-actions-trigger--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close wallet menu' : 'Open wallet menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="gc-nav-actions-trigger-glyph" aria-hidden>◉</span>
        <span className="gc-nav-actions-trigger-label">WALLET</span>
        <span className="gc-nav-actions-trigger-caret" aria-hidden>{open ? '▲' : '▼'}</span>
      </button>

      {open && mounted && coords && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label="Wallet actions"
          className="gc-nav-actions-panel"
          style={{ top: coords.top, right: coords.right }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="gc-nav-actions-panel-row">
            <WalletButton />
          </div>
          <div className="gc-nav-actions-panel-row">
            <AuthNavButton />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
