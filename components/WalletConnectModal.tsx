'use client';

/**
 * WalletConnectModal
 *
 * Custom wallet picker that replaces the third-party `WalletModalProvider`
 * UI for the `WalletButton` flow. Built on top of `useWallet()` from
 * `@solana/wallet-adapter-react` so we have full control over what's shown.
 *
 * Why custom:
 *   - We can't add `PhantomWalletAdapter` to the manual `wallets` list in
 *     `SolanaProvider.tsx` — there's a documented Brave + React 19 +
 *     `window.solana` crash. The fix has to come from the picker UI.
 *   - We can't monkey-patch the third-party modal — it breaks on adapter
 *     version bumps.
 *   - With our own modal we can render an explicit "INSTALL PHANTOM" row
 *     when Phantom isn't auto-detected via Wallet Standard, giving users
 *     with no wallet installed a clear path forward.
 *
 * Wallets shown:
 *   - Every entry from `useWallet().wallets` (manual list + Wallet
 *     Standard auto-detected). Each row displays DETECTED / READY / INSTALL
 *     based on the adapter's `readyState`.
 *   - If Phantom is NOT in the wallets array, an additional "INSTALL
 *     PHANTOM" row opens https://phantom.app/download in a new tab.
 *
 * Behavior:
 *   - Click a Detected/Loadable wallet → select() + connect()
 *   - Click a NotDetected wallet → opens its adapter.url in a new tab
 *   - Click the install CTA → opens phantom.app/download in a new tab
 *
 * Portaled to `document.body` so it escapes any stacking context (including
 * the navbar's `backdrop-filter` stacking context that trapped the
 * navbar dropdown in PR #11/#12).
 */

import { useEffect, useState } from 'react';
// @ts-ignore — react-dom types not installed but createPortal works at runtime
import { createPortal } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';

const PHANTOM_INSTALL_URL = 'https://phantom.app/download';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function WalletConnectModal({ open, onClose }: Props) {
  const { wallets, select, connect } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);

  // Portal target — wait for client mount so SSR doesn't try to touch document.body
  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key close
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const phantomInList = wallets.some((w) => w.adapter.name === 'Phantom');

  async function handlePick(walletName: string) {
    setBusyName(walletName);
    try {
      // The wallet adapter's `select` is synchronous but the resulting
      // `connect` happens on a state-driven side effect. We call connect()
      // explicitly here to trigger immediately rather than waiting for the
      // adapter's next render cycle.
      select(walletName as any);
      // small await tick so React state propagates select() before connect()
      await new Promise((r) => setTimeout(r, 0));
      try {
        await connect();
      } catch {
        // adapter logs the error; modal closes regardless
      }
    } finally {
      setBusyName(null);
      onClose();
    }
  }

  function handleInstall(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return createPortal(
    <div className="gc-wcm-overlay" onClick={onClose}>
      <div
        className="gc-wcm"
        role="dialog"
        aria-modal="true"
        aria-label="Connect a Solana wallet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gc-wcm-header">
          <span className="gc-wcm-title">CONNECT WALLET</span>
          <button
            type="button"
            className="gc-wcm-close"
            onClick={onClose}
            aria-label="Close wallet connect dialog"
          >
            ✕
          </button>
        </div>

        <div className="gc-wcm-body">
          {wallets.length === 0 && (
            <div className="gc-wcm-empty">
              NO WALLETS REGISTERED. INSTALL PHANTOM BELOW TO GET STARTED.
            </div>
          )}

          {wallets.map((w) => {
            const installed = w.readyState === WalletReadyState.Installed;
            const loadable = w.readyState === WalletReadyState.Loadable;
            const canConnect = installed || loadable;
            const badge = installed ? 'DETECTED' : loadable ? 'READY' : 'INSTALL';
            const isBusy = busyName === w.adapter.name;
            return (
              <button
                key={w.adapter.name}
                type="button"
                className={`gc-wcm-row${isBusy ? ' gc-wcm-row--busy' : ''}`}
                onClick={() => {
                  if (canConnect) handlePick(w.adapter.name);
                  else handleInstall(w.adapter.url);
                }}
                disabled={isBusy}
              >
                {w.adapter.icon ? (
                  // adapter.icon is typically a data URL — safe to render directly
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.adapter.icon} alt="" className="gc-wcm-icon" />
                ) : (
                  <span className="gc-wcm-icon" aria-hidden>◉</span>
                )}
                <span className="gc-wcm-name">{w.adapter.name.toUpperCase()}</span>
                <span className={`gc-wcm-badge gc-wcm-badge--${badge.toLowerCase()}`}>
                  {isBusy ? 'CONNECTING…' : badge}
                </span>
              </button>
            );
          })}

          {!phantomInList && (
            <a
              className="gc-wcm-install-cta"
              href={PHANTOM_INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Don't auto-close — the user is leaving for a new tab and
                // may want to reload this tab after install.
              }}
            >
              <span className="gc-wcm-icon gc-wcm-icon--emoji" aria-hidden>👻</span>
              <span className="gc-wcm-name">INSTALL PHANTOM</span>
              <span className="gc-wcm-badge gc-wcm-badge--cta">↗</span>
            </a>
          )}
        </div>

        <div className="gc-wcm-footer">
          {phantomInList
            ? 'PICK A WALLET TO CONTINUE.'
            : 'NEW TO SOLANA? PHANTOM IS THE MOST POPULAR WALLET — INSTALL IT FIRST, THEN RELOAD THIS PAGE.'}
        </div>
      </div>
    </div>,
    document.body,
  );
}
