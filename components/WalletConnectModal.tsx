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

export function WalletConnectModal({ open, onClose }: Props) {
  const { connectors, connect, isPending, variables } = useConnect();
  const [mounted, setMounted] = useState(false);

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
                onClick={() => {
                  connect({ connector });
                  onClose();
                }}
                disabled={isBusy}
              >
                {connector.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={connector.icon} alt="" className="gc-wcm-icon" />
                ) : (
                  <span className="gc-wcm-icon" aria-hidden>◉</span>
                )}
                <span className="gc-wcm-name">{connector.name.toUpperCase()}</span>
                <span className="gc-wcm-badge gc-wcm-badge--detected">
                  {isBusy ? 'CONNECTING…' : 'CONNECT'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="gc-wcm-footer">
          PICK A WALLET TO CONTINUE.
        </div>
      </div>
    </div>,
    document.body,
  );
}
