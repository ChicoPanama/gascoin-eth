'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { WalletButton } from './ui/WalletButton';
import { AuthNavButton } from './AuthNavButton';
import { MobileMenu } from './ui/MobileMenu';
import { useAdaptiveNav } from './useAdaptiveNav';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works', icon: '?' },
  { href: '/submit', label: 'Submit', icon: '◇' },
  { href: '/dashboard', label: 'Treasury', icon: '▣' },
  { href: '/community', label: 'Community', icon: '◎' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '▲' },
  { href: '/points', label: 'Points', icon: '◆' },
  { href: '/referral', label: 'Refer', icon: '↗' },
  { href: '/perks', label: 'Perks', icon: '✦' },
  { href: '/gates', label: 'Gates', icon: '◈' },
  { href: '/wallet', label: 'Tracker', icon: '⌁' },
];

export function HomeNav() {
  const pathname = usePathname();
  const { authenticated } = usePrivy();
  const { compact, navRef, brandRef, linksRef, actionsRef } = useAdaptiveNav();

  return (
    <nav ref={navRef as any} className={`gc-nav${compact ? ' gc-nav--compact' : ''}`}>
      <Link ref={brandRef as any} href="/" className="gc-nav-brand-wrap" aria-label="GASCOIN home">
        <img src="/logo/gascoin-g.jpg" alt="" className="gc-nav-logo-icon" aria-hidden />
        <span className="gc-nav-brand">GASCOIN</span>
      </Link>
      <div ref={linksRef as any} className="gc-nav-links">
        {NAV_LINKS.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={pathname === href ? 'gc-nav-active' : ''}>
            <span className="gc-nav-link-inner">
              <span className="gc-nav-link-icon" aria-hidden>{icon}</span>
              <span>{label}</span>
            </span>
          </Link>
        ))}
        {authenticated && (
          <Link href="/me" className={pathname === '/me' ? 'gc-nav-active' : ''}>
            <span className="gc-nav-link-inner">
              <span className="gc-nav-link-icon" aria-hidden>◉</span>
              <span>Me</span>
            </span>
          </Link>
        )}
      </div>
      <div ref={actionsRef as any} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <WalletButton />
        <AuthNavButton />
        <MobileMenu />
      </div>
    </nav>
  );
}
