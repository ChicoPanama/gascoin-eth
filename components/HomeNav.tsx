'use client';

import Link from 'next/link';
import { WalletButton } from './ui/WalletButton';

export function HomeNav() {
  return (
    <nav className="gc-nav">
      <span className="gc-nav-brand">GASCOIN</span>
      <div className="gc-nav-links">
        <Link href="/submit">Submit</Link>
        <Link href="/gates">Gates</Link>
        <Link href="/wallet">Tracker</Link>
        <Link href="/referral">Refer</Link>
        <Link href="/perks">Perks</Link>
        <Link href="/community">Community</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/dashboard">Treasury</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/docs" className="gc-nav-links">Docs</Link>
        <WalletButton />
        <Link href="/submit" className="gc-nav-cta">Submit Receipt</Link>
      </div>
    </nav>
  );
}
