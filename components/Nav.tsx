import Link from 'next/link';
import { AuthNavButton } from './AuthNavButton';
import { WalletButton } from './ui/WalletButton';

export function Nav() {
  return <nav className="nav">
    <Link href="/" className="nav-brand">GASCOIN</Link>
    <Link href="/submit">Submit</Link>
    <Link href="/gates">Gates</Link>
    <Link href="/wallet">Tracker</Link>
    <Link href="/referral">Refer</Link>
    <Link href="/perks">Perks</Link>
    <Link href="/community">Community</Link>
    <Link href="/leaderboard">Leaderboard</Link>
    <Link href="/dashboard">Treasury</Link>
    <Link href="/admin">Admin</Link>
    <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
      <WalletButton />
      <AuthNavButton />
    </span>
  </nav>
}
