import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';

// ═══════════════════════════════════════════
// Admin / Moderation / Banned Users
// ═══════════════════════════════════════════
//
// Surfaces the user_bans table which is auto-populated by auto_ban.ts
// when the risk-score engine decides a submitter should be cut off.
// Admins previously had no UI to review or revoke these bans — the only
// way to lift one was manual Supabase SQL. This page fixes that.
//
// Schema: user_bans (id, user_id uuid FK users.id, reason, active,
// created_by, created_at). Joined with users to surface the x_handle
// and x_user_id so the row is identifiable by humans.

async function unbanUser(formData: FormData) {
  'use server';
  const session = await verifyAdminSession();
  if (!session.valid) return;

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  const supabase = getSupabaseAdmin();
  await supabase
    .from('user_bans')
    .update({ active: false })
    .eq('id', id);

  // Audit trail — who unbanned whom and when
  await supabase.from('audit_logs').insert({
    actor_type: 'admin',
    actor_id: session.walletAddress || 'admin',
    action: 'user_unban',
    target_type: 'user_ban',
    target_id: String(id),
    payload_json: { unbanned_at: new Date().toISOString() },
  });

  revalidatePath('/admin/moderation/bans');
}

export default async function AdminBansPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  // Join with users for human-readable identity. Left join so a ban row
  // with an orphaned user_id still shows (shouldn't happen but defensive).
  const { data: bans } = await supabase
    .from('user_bans')
    .select(`
      id,
      user_id,
      reason,
      active,
      created_by,
      created_at,
      users (x_handle, x_user_id, x_verified, trust_score)
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  const rows = bans || [];
  const activeCount = rows.filter((r: any) => r.active).length;
  const revokedCount = rows.length - activeCount;

  return (
    <div>
      <div className="admin-page-header">ADMIN / MODERATION</div>
      <h1 className="admin-page-title">Banned Users</h1>

      {/* ── Stats ── */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Active Bans</div>
            <div className="gc-stat-value" style={{ color: activeCount > 0 ? 'var(--status-fail)' : 'var(--text-secondary)' }}>
              {activeCount}
            </div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Revoked</div>
            <div className="gc-stat-value">{revokedCount}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Total Ever</div>
            <div className="gc-stat-value">{rows.length}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Revocation %</div>
            <div className="gc-stat-value">
              {rows.length === 0 ? '—' : Math.round((revokedCount / rows.length) * 100) + '%'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Ban list ── */}
      <div style={{ border: '1px solid var(--line)', overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ background: 'rgba(var(--fg-rgb), 0.04)', borderBottom: '1px solid var(--line)' }}>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>X Handle</th>
              <th style={thStyle}>Verified</th>
              <th style={thStyle}>Trust</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Banned By</th>
              <th style={thStyle}>When</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>
                  No bans on record. The auto-ban engine hasn&apos;t flagged anyone yet.
                </td>
              </tr>
            )}
            {rows.map((b: any) => {
              const user = Array.isArray(b.users) ? b.users[0] : b.users;
              return (
                <tr
                  key={b.id}
                  style={{
                    borderBottom: '1px solid var(--line)',
                    background: b.active ? 'transparent' : 'rgba(var(--fg-rgb), 0.01)',
                    opacity: b.active ? 1 : 0.7,
                  }}
                >
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        background: b.active ? 'var(--status-fail)' : 'var(--text-tertiary)',
                        color: '#FFFFFF',
                      }}
                    >
                      {b.active ? 'BANNED' : 'REVOKED'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {user?.x_handle || <span style={{ color: 'var(--text-tertiary)' }}>unknown</span>}
                  </td>
                  <td style={tdStyle}>
                    {user?.x_verified ? (
                      <span style={{ color: 'var(--status-pass)', fontWeight: 700 }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                    {user?.trust_score != null ? Number(user.trust_score).toFixed(2) : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--fg)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.reason || '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 11 }}>
                    {b.created_by || 'system'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11 }}>
                    {new Date(b.created_at).toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    {b.active && (
                      <form action={unbanUser} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={b.id} />
                        <button
                          type="submit"
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--line)',
                            color: 'var(--status-pass)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            padding: '3px 10px',
                            cursor: 'crosshair',
                            letterSpacing: '0.08em',
                          }}
                        >
                          UNBAN
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p
        style={{
          marginTop: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}
      >
        Bans are auto-generated by the risk-score engine (`lib/auto-ban.ts`).
        Unban writes an `user_unban` row to `audit_logs` for accountability.
        Showing up to 500 most recent.
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: 'var(--fg)',
  verticalAlign: 'middle',
};
