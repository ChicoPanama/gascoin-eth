'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { WalletButton } from './ui/WalletButton';
import { AuthNavButton } from './AuthNavButton';
import { MobileMenu } from './ui/MobileMenu';

export function HomeNav() {
  const { authenticated } = usePrivy();

  return (
    <nav className="gc-nav">
      <Link href="/" className="gc-nav-brand-wrap" aria-label="GASCOIN home">
        <img src="/logo/gascoin-g.jpg" alt="" className="gc-nav-logo-icon" aria-hidden />
        <span className="gc-nav-brand">GASCOIN</span>
      </Link>
      <div className="gc-nav-links">
        <Link href="/submit">Submit</Link>
        <Link href="/dashboard">Treasury</Link>
        <Link href="/community">Community</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/referral">Refer</Link>
        <Link href="/perks">Perks</Link>
        <Link href="/gates">Gates</Link>
        <Link href="/wallet">Tracker</Link>
        {authenticated && <Link href="/me">Me</Link>}
        <Link href="/docs">Docs</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <WalletButton />
        <AuthNavButton />
        <MobileMenu />
      </div>
    </nav>
  );
}
