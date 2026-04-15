'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Tiny client island that re-fetches the parent server component every
 * REFRESH_SECS seconds via router.refresh(). Lets the admin leave the
 * /admin/activity tab open during a live beta session and see new
 * redemptions / submissions / failures appear without a manual reload.
 *
 * Has a toggle so the admin can pause when debugging specific state.
 * Shows a countdown to next refresh so the "liveness" is visible.
 */

const REFRESH_SECS = 30;

export function AutoRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_SECS);

  useEffect(() => {
    if (!enabled) return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          router.refresh();
          return REFRESH_SECS;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [enabled, router]);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 12px',
        border: '1px solid var(--line)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: enabled ? 'var(--status-pass)' : 'var(--text-tertiary)',
          boxShadow: enabled ? '0 0 8px var(--status-pass)' : 'none',
          transition: 'all 0.3s',
        }}
      />
      <span>
        {enabled ? `LIVE · refresh in ${countdown}s` : 'PAUSED'}
      </span>
      <button
        type="button"
        onClick={() => {
          setEnabled(!enabled);
          setCountdown(REFRESH_SECS);
        }}
        style={{
          background: 'transparent',
          border: '1px solid var(--line)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          padding: '3px 8px',
          cursor: 'crosshair',
          letterSpacing: '0.1em',
        }}
      >
        {enabled ? 'PAUSE' : 'RESUME'}
      </button>
      <button
        type="button"
        onClick={() => {
          router.refresh();
          setCountdown(REFRESH_SECS);
        }}
        style={{
          background: 'transparent',
          border: '1px solid var(--line)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          padding: '3px 8px',
          cursor: 'crosshair',
          letterSpacing: '0.1em',
        }}
      >
        REFRESH NOW
      </button>
    </div>
  );
}
