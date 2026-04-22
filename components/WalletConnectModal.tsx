'use client';

/**
 * WalletConnectModal
 *
 * Custom wallet picker built on wagmi's useConnect hook. Replaces the
 * Privy handles X/Twitter auth;
 * this modal handles on-chain wallet connection for payout verification.
 *
 * Portaled to `document.body` so it escapes any stacking context (including
 * the navbar's `backdrop-filter` stacking context).
 */

import { useEffect, useState } from 'react';
// @ts-ignore — react-dom types not installed but createPortal works at runtime
import { createPortal } from 'react-dom';
import { useConnect } from 'wagmi';

type Props = {
  open: boolean;
  onClose: () => void;
};

// Brand SVGs for connectors that wagmi doesn't ship with an `icon` field
// (walletConnect + coinbaseWallet). Data-URIs keep them inline so CSP
// img-src doesn't need any new allow-list entries.
const WALLETCONNECT_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 185"><path fill="#3b99fc" d="M61.4 36.3c49-48 128.3-48 177.3 0l5.9 5.8c2.5 2.4 2.5 6.3 0 8.7l-20.2 19.8c-1.2 1.2-3.2 1.2-4.4 0l-8.1-8c-34.2-33.5-89.7-33.5-123.9 0l-8.7 8.5c-1.2 1.2-3.2 1.2-4.4 0L54.7 51.3c-2.5-2.4-2.5-6.3 0-8.7l6.7-6.3zm219 40.8l18 17.6c2.5 2.4 2.5 6.3 0 8.7l-81 79.5c-2.5 2.4-6.5 2.4-9 0l-57.5-56.4c-.6-.6-1.6-.6-2.2 0L91.2 182.9c-2.5 2.4-6.5 2.4-9 0L1 103.4c-2.5-2.4-2.5-6.3 0-8.7l18-17.6c2.5-2.4 6.5-2.4 9 0l57.5 56.4c.6.6 1.6.6 2.2 0l57.5-56.4c2.5-2.4 6.5-2.4 9 0l57.5 56.4c.6.6 1.6.6 2.2 0l57.5-56.4c2.5-2.4 6.5-2.4 9 0z"/></svg>',
  );

const COINBASE_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><circle cx="512" cy="512" r="512" fill="#0052ff"/><path fill="#fff" d="M516.3 361.8c83.3 0 149.5 51.5 174.4 128.2h157.4C820.7 346.3 679.3 239.6 517 239.6c-149.6 0-286 106.7-322.6 250.4h311c5.4 0 10.6-1.4 15.2-4 4.6-2.6 7.9-6.2 9.4-10.4 15.7-38.2 41.6-113.8 185.4-113.8zM193.9 534c36.5 143.7 172.9 250.4 322.5 250.4 162.3 0 303.7-106.7 331-250.4H689.7c-24.9 76.7-91.1 128.2-174.4 128.2-99 0-136.6-75.6-152.2-113.8-1.5-4.2-4.9-7.7-9.4-10.4-4.6-2.6-9.8-4-15.2-4h-144.6z"/></svg>',
  );

// Map connector id → explicit icon URL when the wagmi connector doesn't
// expose one. Keys match the stable connector `id` values wagmi uses.
const CONNECTOR_ICON_OVERRIDES: Record<string, string> = {
  walletConnect: WALLETCONNECT_ICON,
  coinbaseWallet: COINBASE_ICON,
  coinbaseWalletSDK: COINBASE_ICON,
};

export function WalletConnectModal({ open, onClose }: Props) {
  const { connectors: allConnectors, connectAsync, isPending, variables } = useConnect();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset error each time modal opens
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  // wagmi v2 auto-registers every EIP-6963-announced provider as its own
  // connector ("Rabby", "Phantom", "Brave Wallet", ...). The generic
  // `injected()` entry we also include in lib/wagmi-config.ts then shows
  // up as a redundant row named "Injected" — confusing users who already
  // see their wallet by name.
  //
  // Filter rule: hide the raw `injected` connector when at least one
  // named EIP-6963 variant is present. If no EIP-6963 providers are
  // announced (e.g. exotic / legacy wallet), keep it as the fallback so
  // users aren't stranded.
  const connectors = (() => {
    const eip6963 = allConnectors.filter((c) => c.type === 'injected' && c.id !== 'injected');
    if (eip6963.length === 0) return allConnectors;
    return allConnectors.filter((c) => c.id !== 'injected');
  })();

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

  return createPortal(
    <div className="gc-wcm-overlay" onClick={onClose}>
      <div
        className="gc-wcm"
        role="dialog"
        aria-modal="true"
        aria-label="Connect an Ethereum wallet"
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
          {connectors.length === 0 && (
            <div className="gc-wcm-empty">
              NO WALLETS DETECTED. INSTALL METAMASK OR ANOTHER ETHEREUM WALLET TO CONTINUE.
            </div>
          )}

          {connectors.map((connector) => {
            const isBusy = isPending && variables?.connector === connector;
            return (
              <button
                key={connector.uid}
                type="button"
                className={`gc-wcm-row${isBusy ? ' gc-wcm-row--busy' : ''}`}
                onClick={async () => {
                  setError(null);
                  try {
                    // connectAsync lets us await the mutation and close the
                    // modal only after the wallet handoff actually succeeds.
                    // Using the fire-and-forget `connect({ connector })` +
                    // synchronous `onClose()` closes the modal before the
                    // wallet extension prompt renders — user sees it "just
                    // exit out" with no feedback, and any error is swallowed.
                    await connectAsync({ connector });
                    onClose();
                  } catch (e: any) {
                    // User-facing error stays in the modal so the picker
                    // is still usable for retry / different wallet.
                    const msg = String(e?.shortMessage || e?.message || e || 'Connection failed');
                    // Common case: user rejected in wallet — phrase it
                    // plainly instead of leaking raw provider error.
                    if (/rejected|denied|user cancelled/i.test(msg)) {
                      setError('Connection rejected in wallet.');
                    } else if (/not found|no provider|window.ethereum/i.test(msg)) {
                      setError('No wallet extension detected. Install MetaMask, Rabby, or another Ethereum wallet and refresh.');
                    } else {
                      setError(msg);
                    }
                  }
                }}
                disabled={isBusy}
              >
                {(() => {
                  const icon = connector.icon || CONNECTOR_ICON_OVERRIDES[connector.id];
                  return icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="" className="gc-wcm-icon" />
                  ) : (
                    <span className="gc-wcm-icon" aria-hidden>◉</span>
                  );
                })()}
                <span className="gc-wcm-name">{connector.name.toUpperCase()}</span>
                <span className="gc-wcm-badge gc-wcm-badge--detected">
                  {isBusy ? 'CONNECTING…' : 'CONNECT'}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="gc-wcm-error" role="alert">
            {error}
          </div>
        )}

        <div className="gc-wcm-footer">
          PICK A WALLET TO CONTINUE.
        </div>
      </div>
    </div>,
    document.body,
  );
}
