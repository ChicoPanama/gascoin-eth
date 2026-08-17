'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './GasResponsiveShell.module.css';

type DesktopNavItem = {
  href: string;
  label: string;
};

const DESKTOP_NAV_ITEMS: readonly DesktopNavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/play', label: 'Play' },
  { href: '/trade', label: 'Trade' },
  { href: '/crews', label: 'Crews' },
  { href: '/reserve', label: 'Reserve' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GasDesktopNav() {
  const pathname = usePathname();

  return (
    <aside className={styles.desktopRail} aria-label="GAS desktop navigation">
      <Link href="/" className={styles.desktopBrand} aria-label="GAS home">
        <span className={styles.desktopBrandWord}>GAS</span>
        <span className={styles.desktopBrandPhase}>UX prototype</span>
      </Link>

      <nav className={styles.desktopPrimaryNav} aria-label="GAS primary navigation">
        {DESKTOP_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.desktopNavItem} ${active ? styles.desktopNavItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{item.label}</span>
              <span className={styles.desktopNavMark} aria-hidden>{active ? '—' : ''}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.desktopRailFooter}>
        <span className={styles.desktopRailLabel}>Project GAS</span>
        <span className={styles.desktopRailMeta}>One product model · responsive presentation</span>
      </div>
    </aside>
  );
}
