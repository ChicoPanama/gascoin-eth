'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { ThemeToggle } from '../ThemeToggle';

/**
 * /me dashboard sidebar — X-style.
 *
 * Tab-switch behavior: each link sets ?tab=<id> without scrolling the page.
 * The active tab is read from the URL; the rendered section lives in
 * DashboardClient. No IntersectionObserver / scrollspy — a tab click
 * swaps content, not scroll position.
 */

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

const SECTIONS: SidebarItem[] = [
  { id: 'overview',    label: 'Overview',   icon: '◉' },
  { id: 'claims',      label: 'Claims',     icon: '◎' },
  { id: 'payouts',     label: 'Payouts',    icon: '⇌' },
  { id: 'referrals',   label: 'Referrals',  icon: '↗' },
  { id: 'engagement',  label: 'Engagement', icon: '▲' },
  { id: 'points',      label: 'Points',     icon: '◆' },
  { id: 'analytics',   label: 'Analytics',  icon: '⌁' },
];

export const ME_SECTIONS = SECTIONS;
export type MeTabId = typeof SECTIONS[number]['id'];

export interface MeSidebarProps {
  xHandle?: string | null;
  wallet?: string | null;
}

function truncate(s: string, n = 6): string {
  if (!s || s.length <= n * 2) return s;
  return `${s.slice(0, n)}...${s.slice(-n)}`;
}

export function MeSidebar({ xHandle, wallet }: MeSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated, logout } = usePrivy();
  const [menuOpen, setMenuOpen] = useState(false);

  const rawTab = searchParams?.get('tab') ?? 'overview';
  const activeId: MeTabId = (SECTIONS.some((s) => s.id === rawTab) ? rawTab : 'overview') as MeTabId;

  const selectTab = (id: MeTabId) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (id === 'overview') params.delete('tab');
    else params.set('tab', id);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  return (
    <aside className="me-sidebar" aria-label="Dashboard navigation">
      <div className="me-sidebar-top">
        <Link href="/" className="me-sidebar-brand" aria-label="GASCOIN home">
          <img src="/logo/gascoin-g.jpg" alt="" className="me-sidebar-logo" aria-hidden />
          <span className="me-sidebar-brand-text">GASCOIN</span>
        </Link>

        <nav className="me-sidebar-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`me-sidebar-link${activeId === s.id ? ' me-sidebar-link--active' : ''}`}
              onClick={() => selectTab(s.id as MeTabId)}
              aria-current={activeId === s.id ? 'page' : undefined}
            >
              <span className="me-sidebar-link-icon" aria-hidden>{s.icon}</span>
              <span className="me-sidebar-link-label">{s.label}</span>
            </button>
          ))}
        </nav>

        <Link href="/submit" className="me-sidebar-cta">
          Submit Receipt
        </Link>
      </div>

      <div className="me-sidebar-bottom">
        <button
          type="button"
          className="me-sidebar-identity"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="me-sidebar-identity-avatar">
            <img src="/logo/gascoin-g.jpg" alt="" />
          </span>
          <span className="me-sidebar-identity-text">
            <span className="me-sidebar-identity-handle">
              {xHandle ? `@${xHandle}` : 'Not signed in'}
            </span>
            <span className="me-sidebar-identity-wallet">
              {wallet ? truncate(wallet) : '—'}
            </span>
          </span>
          <span className="me-sidebar-identity-dots" aria-hidden>⋯</span>
        </button>

        {menuOpen && (
          <div className="me-sidebar-menu" role="menu">
            <ThemeToggle />
            {authenticated && (
              <button
                type="button"
                className="me-sidebar-menu-item"
                onClick={() => logout()}
              >
                Disconnect
              </button>
            )}
            <Link href="/referral" className="me-sidebar-menu-item">
              Full referral page ↗
            </Link>
            <Link href="/standing" className="me-sidebar-menu-item">
              Standing ↗
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
