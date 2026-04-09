'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { WalletButton } from './ui/WalletButton';
import { AuthNavButton } from './AuthNavButton';
import { MobileMenu } from './ui/MobileMenu';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works', icon: '?' },
  { href: '/submit', label: 'Submit', icon: '◇' },
  { href: '/dashboard', label: 'Treasury', icon: '▣' },
  { href: '/community', label: 'Community', icon: '◎' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '▲' },
  { href: '/referral', label: 'Refer', icon: '↗' },
  { href: '/perks', label: 'Perks', icon: '✦' },
  { href: '/gates', label: 'Gates', icon: '◈' },
  { href: '/wallet', label: 'Tracker', icon: '⌁' },
];

export function HomeNav() {
  const { authenticated } = usePrivy();

  return (
    <nav className="gc-nav">
      <Link href="/" className="gc-nav-brand-wrap" aria-label="GASCOIN home">
        <img src="/logo/gascoin-g.jpg" alt="" className="gc-nav-logo-icon" aria-hidden />
        <span className="gc-nav-brand">GASCOIN</span>
      </Link>
      <div className="gc-nav-links">
        {NAV_LINKS.map(({ href, label, icon }) => (
          <Link key={href} href={href}>
            <span className="gc-nav-link-inner">
              <span className="gc-nav-link-icon" aria-hidden>{icon}</span>
              <span>{label}</span>
            </span>
          </Link>
        ))}
        {authenticated && (
          <Link href="/me">
            <span className="gc-nav-link-inner">
              <span className="gc-nav-link-icon" aria-hidden>◉</span>
              <span>Me</span>
            </span>
          </Link>
        )}
        <Link href="/docs">
          <span className="gc-nav-link-inner">
            <span className="gc-nav-link-icon" aria-hidden>⧉</span>
            <span>Docs</span>
          </span>
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <WalletButton />
        <AuthNavButton />
        <MobileMenu />
      </div>
    </nav>
  );
}
