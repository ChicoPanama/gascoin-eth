import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';

// ═══════════════════════════════════════════
// Admin / Season 1 Invite Codes
// ═══════════════════════════════════════════
//
// Admin-only tracking page for Season 1 beta invite codes. Shows all
// codes with their redemption status, lets the admin generate N new
// codes inline via a server action, and gives at-a-glance stats
// (total / redeemed / available).
//
// Single-use model: each row either has used_by_x_user_id set
// (REDEEMED by that handle) or NULL (AVAILABLE). No multi-use counts.
//
// Distribution workflow after generating:
//   1. Click "Generate N codes" — new rows appear in the table
//   2. Copy the codes from the AVAILABLE rows
//   3. DM / tweet / share to a closed channel
//   4. Testers redeem at /submit after signing in with Privy
//   5. This page shows who redeemed what + when

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const pick = (n: number) => {
    const buf = randomBytes(n);
    let out = '';
    for (let i = 0; i < n; i++) out += CHARSET[buf[i] % CHARSET.length];
    return out;
  };
  return `GC-${pick(4)}-${pick(4)}`;
}

// ─── Server actions ──────────────────────────────────────────────

async function generateCodes(formData: FormData) {
  'use server';
  const session = await verifyAdminSession();
  if (!session.valid) return;

  const count = Math.min(Math.max(Number(formData.get('count') || 10), 1), 100);
  const notes = String(formData.get('notes') || '').slice(0, 200) || null;

  const supabase = getSupabaseAdmin();
  const rows = Array.from({ length: count }, () => ({
    code: generateCode(),
    created_by: session.walletAddress || 'admin',
    notes,
  }));

  await supabase.from('invite_codes').insert(rows);
  revalidatePath('/admin/invites');
}

async function revokeCode(formData: FormData) {
  'use server';
  const session = await verifyAdminSession();
  if (!session.valid) return;

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  const supabase = getSupabaseAdmin();
  // Only revoke AVAILABLE codes — never touch a redeemed one (we want
  // the audit trail of who redeemed what to survive)
  await supabase.from('invite_codes').delete().eq('id', id).is('used_by_x_user_id', null);
  revalidatePath('/admin/invites');
}

// ─── Page ────────────────────────────────────────────────────────

export default async function AdminInvitesPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from('invite_codes')
    .select('id, code, created_by, created_at, notes, used_by_x_user_id, used_by_x_handle, redeemed_at')
    .order('created_at', { ascending: false })
    .limit(500);

  const codes = rows || [];
  const total = codes.length;
  const redeemed = codes.filter((c: any) => c.used_by_x_user_id).length;
  const available = total - redeemed;

  return (
    <div>
      <div className="admin-page-header">ADMIN / BETA</div>
      <h1 className="admin-page-title">Season 1 Invite Codes</h1>

      {/* ── Stats ── */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Total</div>
            <div className="gc-stat-value">{total}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Redeemed</div>
            <div className="gc-stat-value">{redeemed}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Available</div>
            <div className="gc-stat-value">{available}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Redemption %</div>
            <div className="gc-stat-value">
              {total === 0 ? '—' : Math.round((redeemed / total) * 100) + '%'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Generate form ── */}
      <div
        style={{
          border: '1px solid var(--line)',
          padding: 20,
          marginBottom: 32,
          background: 'rgba(var(--fg-rgb), 0.02)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          Generate New Codes
        </div>
        <form
          action={generateCodes}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--text-tertiary)',
                marginBottom: 4,
              }}
            >
              COUNT
            </label>
            <input
              type="number"
              name="count"
              min={1}
              max={100}
              defaultValue={10}
              style={{
                width: 80,
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                borderRadius: 0,
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--text-tertiary)',
                marginBottom: 4,
              }}
            >
              NOTES (distribution context, optional)
            </label>
            <input
              type="text"
              name="notes"
              placeholder="e.g. TG announce batch 1, or @chico_panama DM"
              maxLength={200}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                borderRadius: 0,
              }}
            />
          </div>
          <button
            type="submit"
            className="gc-btn-solid"
            style={{ padding: '10px 20px' }}
          >
            Generate
          </button>
        </form>
      </div>

      {/* ── Codes table ── */}
      <div
        style={{
          border: '1px solid var(--line)',
          overflow: 'auto',
        }}
      >
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
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Redeemed By</th>
              <th style={thStyle}>Redeemed At</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>
                  No invite codes yet. Generate some above.
                </td>
              </tr>
            )}
            {codes.map((c: any) => {
              const isRedeemed = !!c.used_by_x_user_id;
              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid var(--line)',
                    background: isRedeemed ? 'rgba(var(--fg-rgb), 0.01)' : 'transparent',
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, letterSpacing: '0.05em' }}>{c.code}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        background: isRedeemed ? 'var(--text-tertiary)' : 'var(--status-pass)',
                        color: '#FFFFFF',
                      }}
                    >
                      {isRedeemed ? 'REDEEMED' : 'AVAILABLE'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {c.used_by_x_handle ? `@${c.used_by_x_handle}` : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                    {c.redeemed_at ? new Date(c.redeemed_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.notes || '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11 }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>
                    {!isRedeemed && (
                      <form action={revokeCode} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--line)',
                            color: 'var(--status-fail)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            padding: '3px 8px',
                            cursor: 'crosshair',
                          }}
                        >
                          REVOKE
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
        Showing up to 500 most recent codes. Redeemed codes cannot be revoked — the audit
        trail is permanent.
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
