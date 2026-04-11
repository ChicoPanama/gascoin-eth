'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { AuthNavButton } from './AuthNavButton';
import { WalletButton } from './ui/WalletButton';
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

export function Nav() {
  const pathname = usePathname();
  const { authenticated } = usePrivy();
  const { compact, navRef, brandRef, linksRef, actionsRef } = useAdaptiveNav();

  return <nav ref={navRef as any} className={`nav${compact ? ' nav--compact' : ''}`}>
    <Link ref={brandRef as any} href="/" className="nav-brand-wrap" aria-label="GASCOIN home">
      <img src="/logo/gascoin-g.jpg" alt="" className="nav-logo-icon" aria-hidden />
      <span className="nav-brand">GASCOIN</span>
    </Link>
    <div ref={linksRef as any} className="nav-links-desktop">
      {NAV_LINKS.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link-desktop${pathname === href ? ' nav-link-active' : ''}`}
        >
          <span className="nav-link-inner">
            <span className="nav-link-icon" aria-hidden>{icon}</span>
            <span>{label}</span>
          </span>
        </Link>
      ))}
      {authenticated && (
        <Link
          href="/me"
          className={`nav-link-desktop${pathname === '/me' ? ' nav-link-active' : ''}`}
        >
          <span className="nav-link-inner">
            <span className="nav-link-icon" aria-hidden>◉</span>
            <span>Me</span>
          </span>
        </Link>
      )}
    </div>
    <span ref={actionsRef as any} style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
      <WalletButton />
      <AuthNavButton />
      <Link href="/docs" className={`btn nav-link-desktop${pathname.startsWith('/docs') ? ' nav-link-active' : ''}`} style={{ fontSize: 10, padding: '6px 14px', letterSpacing: '0.1em' }}>
        <span className="nav-link-inner">
          <span className="nav-link-icon" aria-hidden>⧉</span>
          <span>DOCS</span>
        </span>
      </Link>
      <MobileMenu />
    </span>
  </nav>
}
