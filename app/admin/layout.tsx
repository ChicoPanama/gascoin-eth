import type { ReactNode } from 'react';
import Link from 'next/link';
import { verifyAdminSession, destroyAdminSession } from '../actions/admin-auth';

const NAV_SECTIONS = [
  { label: 'OPERATIONS', links: [
    { href: '/admin/activity', label: 'Live Activity' },
    { href: '/admin/submissions', label: 'Submissions' },
    { href: '/admin/referrals', label: 'Referral Rewards' },
    { href: '/admin/treasury', label: 'Treasury' },
    { href: '/admin/invites', label: 'Beta Invites' },
  ]},
  { label: 'MODERATION', links: [
    { href: '/admin/receipts', label: 'Receipt Review' },
    { href: '/admin/gates', label: 'Gate Overrides' },
    { href: '/admin/moderation/bans', label: 'Banned Users' },
    { href: '/admin/intelligence', label: 'Intelligence Feed' },
  ]},
  { label: 'ANALYTICS', links: [
    { href: '/admin/stats', label: 'Platform Stats' },
    { href: '/admin/engagement', label: 'Engagement Scoring' },
    { href: '/admin/audit', label: 'Audit Log' },
  ]},
  { label: 'SYSTEM', links: [
    { href: '/admin/health', label: 'System Health' },
    { href: '/admin/settings', label: 'Settings' },
  ]},
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await verifyAdminSession();
  // Season 1 dry-run flag — surfaced on every admin page so operators
  // never lose track of which mode prod is in. Flips automatically when
  // ENABLE_LIVE_PAYOUT=true is set in the deployment target.
  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';

  return (
    <div className="admin-layout">
      {session.valid && (
        <aside className="admin-sidebar">
          <div className="admin-sidebar-top">
            <div className="admin-sidebar-label">ADMIN</div>
            <div className="admin-sidebar-brand">GASCOIN</div>
            <div
              className="admin-mode-pill"
              title={isDryRun
                ? 'ENABLE_LIVE_PAYOUT=false — no ETH leaves the treasury. Gates, scoring, and AI run exactly as in production; payout is mocked.'
                : 'ENABLE_LIVE_PAYOUT=true — real ETH dispatched on approved claims.'}
              style={{
                marginTop: 12,
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-mono, monospace)',
                border: `1px solid ${isDryRun ? 'var(--status-warn, #d97706)' : 'var(--status-pass, #10b981)'}`,
                color: isDryRun ? 'var(--status-warn, #d97706)' : 'var(--status-pass, #10b981)',
                background: 'transparent',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {isDryRun ? '● SEASON 1 · DRY RUN' : '● LIVE PAYOUTS'}
            </div>
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
            <div className="admin-sidebar-wallet">Admin Session</div>
            <form action={async () => { 'use server'; await destroyAdminSession(); }}>
              <button type="submit" className="admin-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}>
                Logout
              </button>
            </form>
          </div>
        </aside>
      )}
      <main className={session.valid ? 'admin-main' : 'admin-main--full'}>
        {children}
      </main>
    </div>
  );
}
