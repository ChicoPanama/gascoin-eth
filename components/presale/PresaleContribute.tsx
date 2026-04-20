'use client';

import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

interface Props {
  treasuryAddress: string;
  minContribEth: number;
  maxContribEth: number;
  variant?: 'hero' | 'compact';
}

/**
 * Two-state CTA:
 *   1. Not connected  → "Connect ETH wallet"       (Privy login)
 *   2. Connected      → "Copy contribution address" + the wallet's own ETH
 *                        address rendered for confirmation.
 *
 * The "deposit flow" will swap the copy-address card for a real tx signer
 * once the presale contract ABI + address land. Keep this component's
 * surface area small so that swap is a drop-in change.
 */
export function PresaleContribute({
  treasuryAddress,
  minContribEth,
  maxContribEth,
  variant = 'hero',
}: Props) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState(false);

  // Pick the first EVM wallet — walletChainType is 'ethereum-only' on this deployment.
  // Defensive filter in case a user has a legacy Solana-linked account.
  
  const evmWallet = wallets.find((w: any) => w.chainType === 'ethereum');

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(treasuryAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore — the address is also rendered beneath so the user can select it */
    }
  }

  if (!ready) {
    return <div className="gc-presale-cta-skeleton" aria-busy>Loading wallet…</div>;
  }

  if (!authenticated || !evmWallet) {
    return (
      <div className={`gc-presale-cta-group gc-presale-cta-group--${variant}`}>
        <button className="gc-btn gc-btn--primary gc-btn--lg" onClick={() => login()}>
          Connect ETH wallet
        </button>
        <span className="gc-presale-cta-note">
          Min {minContribEth} ETH · Max {maxContribEth} ETH · per wallet
        </span>
      </div>
    );
  }

  return (
    <div className={`gc-presale-cta-group gc-presale-cta-group--${variant}`}>
      <div className="gc-presale-deposit">
        <div className="gc-presale-deposit-row">
          <span className="gc-presale-deposit-label">Send ETH to</span>
          <code className="gc-presale-deposit-addr mono">{treasuryAddress}</code>
          <button className="gc-btn gc-btn--ghost" onClick={copyAddress}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <div className="gc-presale-deposit-row gc-presale-deposit-row--sub">
          <span className="gc-presale-deposit-label">From</span>
          <code className="mono">{evmWallet.address}</code>
          <button className="gc-btn gc-btn--ghost" onClick={() => logout()}>Disconnect</button>
        </div>
      </div>
      <span className="gc-presale-cta-note">
        Allocations are credited off-chain to the ETH address that sent the funds.
        Min {minContribEth} · Max {maxContribEth} ETH.
      </span>
    </div>
  );
}
