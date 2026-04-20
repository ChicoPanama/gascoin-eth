'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { ThemeToggle } from '../ThemeToggle';

/**
 * Minimal standalone header for the /presale route.
 * Deliberately NOT the main HomeNav — the presale page is a separate
 * surface (like launchfair's /raise) and doesn't share the product nav.
 */
export function PresaleNav() {
  const { ready, authenticated, login, logout } = usePrivy();

  return (
    <nav className="gc-presale-nav">
      <Link href="/presale" className="gc-presale-nav-brand" aria-label="GASCOIN presale home">
        <img src="/logo/gascoin-g.jpg" alt="" className="gc-presale-nav-logo" aria-hidden />
        <span className="gc-presale-nav-title">GASCOIN</span>
        <span className="gc-presale-nav-tag">Presale</span>
      </Link>
      <div className="gc-presale-nav-actions">
        <span className="gc-presale-nav-chain" aria-label="Network">
          <span className="gc-presale-nav-chain-dot" aria-hidden />
          Ethereum · Mainnet
        </span>
        <ThemeToggle />
        {ready && (
          authenticated ? (
            <button className="gc-btn gc-btn--ghost" onClick={() => logout()}>Disconnect</button>
          ) : (
            <button className="gc-btn gc-btn--primary" onClick={() => login()}>Connect wallet</button>
          )
        )}
      </div>
    </nav>
  );
}
