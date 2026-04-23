'use client';

import { useState, useEffect } from 'react';
// @ts-ignore — react-dom types not installed but createPortal works at runtime
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/submit', label: 'Submit' },
  { href: '/dashboard', label: 'Treasury' },
  { href: '/community', label: 'Community' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/points', label: 'Points' },
  { href: '/referral', label: 'Refer' },
  { href: '/standing', label: 'Standing' },
  { href: '/gates', label: 'Gates' },
  { href: '/wallet', label: 'Tracker' },
  { href: '/docs', label: 'Docs' },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { authenticated } = usePrivy();

  // Portal needs to wait for client mount
  useEffect(() => { setMounted(true); }, []);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        className="mobile-menu-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span className={`mobile-menu-bar${open ? ' mobile-menu-bar--open' : ''}`} />
      </button>

      {open && mounted && createPortal(
        <div className="mobile-menu-overlay" onClick={() => setOpen(false)}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`mobile-menu-link${pathname === href ? ' mobile-menu-link--active' : ''}`}
              >
                {label}
              </Link>
            ))}
            {authenticated && (
              <Link
                href="/me"
                className={`mobile-menu-link${pathname === '/me' ? ' mobile-menu-link--active' : ''}`}
              >
                Me
              </Link>
            )}
          </nav>
        </div>,
        document.body
      )}
    </>
  );
}
