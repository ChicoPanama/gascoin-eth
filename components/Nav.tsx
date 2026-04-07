'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthNavButton } from './AuthNavButton';
import { WalletButton } from './ui/WalletButton';
import { MobileMenu } from './ui/MobileMenu';

const NAV_LINKS = [
  { href: '/submit', label: 'Submit' },
  { href: '/dashboard', label: 'Treasury' },
  { href: '/community', label: 'Community' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/referral', label: 'Refer' },
  { href: '/perks', label: 'Perks' },
  { href: '/gates', label: 'Gates' },
  { href: '/wallet', label: 'Tracker' },
];

export function Nav() {
  const pathname = usePathname();

  return <nav className="nav">
    <Link href="/" className="nav-brand">GASCOIN</Link>
    {NAV_LINKS.map(({ href, label }) => (
      <Link
        key={href}
        href={href}
        className={`nav-link-desktop${pathname === href ? ' nav-link-active' : ''}`}
      >
        {label}
      </Link>
    ))}
    <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
      <WalletButton />
      <AuthNavButton />
      <Link href="/docs" className={`btn nav-link-desktop${pathname.startsWith('/docs') ? ' nav-link-active' : ''}`} style={{ fontSize: 10, padding: '6px 14px', letterSpacing: '0.1em' }}>DOCS</Link>
      <MobileMenu />
    </span>
  </nav>
}
