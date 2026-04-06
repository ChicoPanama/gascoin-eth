import Link from 'next/link';
import { AuthNavButton } from './AuthNavButton';
import { WalletButton } from './ui/WalletButton';
import { MobileMenu } from './ui/MobileMenu';

export function Nav() {
  return <nav className="nav">
    <Link href="/" className="nav-brand">GASCOIN</Link>
    <Link href="/submit" className="nav-link-desktop">Submit</Link>
    <Link href="/dashboard" className="nav-link-desktop">Treasury</Link>
    <Link href="/community" className="nav-link-desktop">Community</Link>
    <Link href="/leaderboard" className="nav-link-desktop">Leaderboard</Link>
    <Link href="/referral" className="nav-link-desktop">Refer</Link>
    <Link href="/perks" className="nav-link-desktop">Perks</Link>
    <Link href="/gates" className="nav-link-desktop">Gates</Link>
    <Link href="/wallet" className="nav-link-desktop">Tracker</Link>
    <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
      <WalletButton />
      <AuthNavButton />
      <Link href="/docs" className="btn nav-link-desktop" style={{ fontSize: 10, padding: '6px 14px', letterSpacing: '0.1em' }}>DOCS</Link>
      <MobileMenu />
    </span>
  </nav>
}
