'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { ThemeToggle } from '../ThemeToggle';

/**
 * /me dashboard sidebar — X-style.
 *
 * Fixed-position left rail on desktop (≥901px). Hidden on mobile, which
 * falls back to the existing top `<Nav />` rendered by the /me layout.
 *
 * Sections are in-page anchors (#overview, #claims, etc.) rather than
 * sub-routes so a single /api/me fetch hydrates the whole page. Scroll
 * position determines the active highlight.
 */

interface SidebarItem {
  id: string;        // anchor id in page
  label: string;
  icon: string;      // single-glyph icon, matches gc-nav-link-icon style
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

export interface MeSidebarProps {
  xHandle?: string | null;
  wallet?: string | null;
}

function truncate(s: string, n = 6): string {
  if (!s || s.length <= n * 2) return s;
  return `${s.slice(0, n)}...${s.slice(-n)}`;
}

export function MeSidebar({ xHandle, wallet }: MeSidebarProps) {
  const { authenticated, logout } = usePrivy();
  const [activeId, setActiveId] = useState<string>('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  // Scrollspy: update activeId as sections scroll past the viewport top.
  useEffect(() => {
    const ids = SECTIONS.map((s) => s.id);
    const els = ids
      .map((id) => ({ id, el: document.getElementById(id) }))
      .filter((x): x is { id: string; el: HTMLElement } => !!x.el);
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    els.forEach((x) => obs.observe(x.el));
    return () => obs.disconnect();
  }, []);

  return (
    <aside className="me-sidebar" aria-label="Dashboard navigation">
      <div className="me-sidebar-top">
        <Link href="/" className="me-sidebar-brand" aria-label="GASCOIN home">
          <img src="/logo/gascoin-g.jpg" alt="" className="me-sidebar-logo" aria-hidden />
          <span className="me-sidebar-brand-text">GASCOIN</span>
        </Link>

        <nav className="me-sidebar-nav">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`me-sidebar-link${activeId === s.id ? ' me-sidebar-link--active' : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              <span className="me-sidebar-link-icon" aria-hidden>{s.icon}</span>
              <span className="me-sidebar-link-label">{s.label}</span>
            </a>
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
