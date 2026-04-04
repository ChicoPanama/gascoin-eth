import type { ReactNode } from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '../actions/admin-auth';
import { redirect } from 'next/navigation';

const NAV_SECTIONS = [
  { label: 'OPERATIONS', links: [
    { href: '/admin/submissions', label: 'Submissions' },
    { href: '/admin/referrals', label: 'Referral Rewards' },
    { href: '/admin/treasury', label: 'Treasury' },
  ]},
  { label: 'MODERATION', links: [
    { href: '/admin/receipts', label: 'Receipt Review' },
    { href: '/admin/gates', label: 'Gate Overrides' },
  ]},
  { label: 'ANALYTICS', links: [
    { href: '/admin/stats', label: 'Platform Stats' },
    { href: '/admin/audit', label: 'Audit Log' },
  ]},
  { label: 'SYSTEM', links: [
    { href: '/admin/settings', label: 'Settings' },
  ]},
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await verifyAdminSession();

  // Allow login page without session
  // Layout wraps all /admin/* routes — login page handles its own auth

  return (
    <div className="admin-layout">
      {session.valid && (
        <aside className="admin-sidebar">
          <div className="admin-sidebar-top">
            <div className="admin-sidebar-label">ADMIN</div>
            <div className="admin-sidebar-brand">GASCOIN</div>
          </div>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="admin-nav-section">
              <div className="admin-nav-section-label">{section.label}</div>
              {section.links.map((link) => (
                <Link key={link.href} href={link.href} className="admin-nav-link">{link.label}</Link>
              ))}
            </div>
          ))}
          <div className="admin-sidebar-bottom">
            <div className="admin-sidebar-wallet">{session.walletAddress?.slice(0, 4)}...{session.walletAddress?.slice(-4)}</div>
            <Link href="/admin/login" className="admin-nav-link">Logout</Link>
          </div>
        </aside>
      )}
      <main className={session.valid ? 'admin-main' : 'admin-main--full'}>
        {children}
      </main>
    </div>
  );
}
