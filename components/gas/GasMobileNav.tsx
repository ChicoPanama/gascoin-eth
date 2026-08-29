'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './gas-ui.module.css';

type NavItem = {
  href: string;
  label: string;
  icon: 'home' | 'play' | 'trade' | 'crews' | 'account';
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/play', label: 'Play', icon: 'play' },
  { href: '/trade', label: 'Trade', icon: 'trade' },
  { href: '/crews', label: 'Crews', icon: 'crews' },
  { href: '/account', label: 'Account', icon: 'account' },
];

function NavGlyph({ icon }: { icon: NavItem['icon'] }) {
  if (icon === 'home') {
    return <svg viewBox="0 0 24 24" aria-hidden><path d="m4 10 8-6 8 6v9H4z" /><path d="M9 19v-6h6v6" /></svg>;
  }
  if (icon === 'play') {
    return <svg viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>;
  }
  if (icon === 'trade') {
    return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8h14" /><path d="m15 5 3 3-3 3" /><path d="M20 16H6" /><path d="m9 13-3 3 3 3" /></svg>;
  }
  if (icon === 'crews') {
    return <svg viewBox="0 0 24 24" aria-hidden><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3.5 19c.6-3 2.5-4.5 5.5-4.5s4.9 1.5 5.5 4.5" /><path d="M14 15c2.8-.8 5.3.5 6.2 3.2" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" /></svg>;
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GasMobileNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav} aria-label="GAS primary navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.navIcon}><NavGlyph icon={item.icon} /></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
