'use client';

/**
 * NavActionsMenu
 *
 * Compact dropdown trigger that collapses the `WalletButton` + `AuthNavButton`
 * actions cluster into a single button at laptop widths (901–1440px).
 *
 * Visibility is CSS-controlled via `.gc-nav-actions-menu` in `app/globals.css`:
 *   - Shown   for 901–1440px (default)
 *   - Hidden  for >=1441px    (inline actions cluster shows instead)
 *   - Hidden  for <=900px     (MobileMenu takes over)
 *
 * The component renders both breakpoints via CSS rather than JS viewport
 * detection, so there's no hydration flicker and no state sync with
 * `useAdaptiveNav`.
 *
 * Aesthetic notes: matches the existing brutalist-monospace nav language
 * (IBM Plex Mono, 1px border, zero radius, ASCII glyph for the trigger,
 * 80ms motion). Do NOT convert this into a generic three-lines hamburger —
 * that's the mobile menu and fires at a different breakpoint.
 */

import { useEffect, useRef, useState } from 'react';
import { WalletButton } from './ui/WalletButton';
import { AuthNavButton } from './AuthNavButton';

export function NavActionsMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape key close
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

  return (
    <div ref={wrapperRef} className="gc-nav-actions-menu-wrap">
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
        <span className="gc-nav-actions-trigger-caret" aria-hidden>{open ? '↑' : '↓'}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Wallet actions"
          className="gc-nav-actions-panel"
          // Stop propagation so clicks inside the panel don't trigger click-outside
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="gc-nav-actions-panel-row">
            <WalletButton />
          </div>
          <div className="gc-nav-actions-panel-row">
            <AuthNavButton />
          </div>
        </div>
      )}
    </div>
  );
}
