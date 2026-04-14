import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';

// ═══════════════════════════════════════════
// Admin / System Health
// ═══════════════════════════════════════════
//
// One-glance operational cockpit for the beta. Shows:
//
//   - Dry-run / live mode flag (ENABLE_LIVE_PAYOUT)
//   - Build SHA + deploy region (from Vercel env)
//   - 9 cron workers with last-run status (pulled from audit_logs)
//   - External dependency matrix (Supabase, Upstash, Helius, mem0, Privy, X API)
//   - Season 1 invite redemption count
//
// Intentionally server-rendered so every page load hits fresh data —
// no stale metrics caching. If this ever gets traffic-heavy we can
// flip to a 15s Data Cache, but for admin-only use it's fine.

// ─── Workers we expect to see running ───
const EXPECTED_WORKERS = [
  { path: '/api/workers/process-claims', schedule: '*/5 * * * *', label: 'Process Claims' },
  { path: '/api/workers/verify-referrals', schedule: '*/15 * * * *', label: 'Verify Referrals' },
  { path: '/api/workers/score-engagement', schedule: '0 * * * *', label: 'Score Engagement' },
  { path: '/api/workers/sync-gascoin-followers', schedule: '*/30 * * * *', label: 'Sync GasCoin Followers' },
  { path: '/api/workers/award-points', schedule: '0 6 * * *', label: 'Award Points' },
  { path: '/api/workers/sync-x-handles', schedule: '0 3 * * *', label: 'Sync X Handles' },
  { path: '/api/workers/pre-payout-verify', schedule: '55 23 * * *', label: 'Pre-Payout Verify' },
  { path: '/api/workers/aggregate-intelligence', schedule: '0 7 * * *', label: 'Aggregate Intelligence' },
  { path: '/api/workers/flush-receipts', schedule: '0 3 * * 0', label: 'Flush Receipts' },
];

// ─── Env vars we expect to have ───
const EXPECTED_ENV = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', group: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', group: 'Supabase' },
  { key: 'UPSTASH_REDIS_REST_URL', group: 'Upstash' },
  { key: 'UPSTASH_REDIS_REST_TOKEN', group: 'Upstash' },
  { key: 'HELIUS_API_KEY', group: 'Solana' },
  { key: 'GASCOIN_MINT', group: 'Solana' },
  { key: 'NEXT_PUBLIC_GASCOIN_MINT', group: 'Solana' },
  { key: 'MEM0_API_KEY', group: 'mem0' },
  { key: 'MEM0_ORG_ID', group: 'mem0' },
  { key: 'NEXT_PUBLIC_PRIVY_APP_ID', group: 'Privy' },
  { key: 'PRIVY_APP_SECRET', group: 'Privy' },
  { key: 'X_BEARER_TOKEN', group: 'X API' },
  { key: 'X_STRICT_MODE', group: 'X API' },
  { key: 'CRON_SECRET', group: 'Cron' },
  { key: 'REVIEWER_API_TOKEN', group: 'Admin' },
];

export default async function AdminHealthPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  // Pull recent cron run records. Audit logs capture cron executions via
  // action='cron_run' with the worker path in the target field.
  const { data: recentRuns } = await supabase
    .from('audit_logs')
    .select('action, target, payload, created_at')
    .or(`action.eq.cron_run,action.eq.worker_run`)
    .order('created_at', { ascending: false })
    .limit(200);

  // Bucket the most recent run for each worker
  const lastRunByWorker = new Map<string, { ts: string; ok: boolean; detail: string }>();
  for (const row of (recentRuns || []) as any[]) {
    const key = String(row.target || '');
    if (!key || lastRunByWorker.has(key)) continue;
    const payload = row.payload || {};
    lastRunByWorker.set(key, {
      ts: row.created_at,
      ok: payload?.ok !== false,
      detail: typeof payload?.summary === 'string' ? payload.summary.slice(0, 80) : '',
    });
  }

  // Invite code stats
  const { data: inviteRows } = await supabase
    .from('invite_codes')
    .select('used_by_x_user_id', { count: 'exact' });
  const inviteTotal = inviteRows?.length || 0;
  const inviteRedeemed = (inviteRows || []).filter((r: any) => r.used_by_x_user_id).length;

  // Core flags
  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
  const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 8);
  const region = process.env.VERCEL_REGION || 'local';
  const env = process.env.VERCEL_ENV || 'development';

  // Group env vars
  const envByGroup = new Map<string, Array<{ key: string; present: boolean }>>();
  for (const item of EXPECTED_ENV) {
    const present = !!(process.env[item.key] || '').trim();
    if (!envByGroup.has(item.group)) envByGroup.set(item.group, []);
    envByGroup.get(item.group)!.push({ key: item.key, present });
  }

  return (
    <div>
      <div className="admin-page-header">ADMIN / SYSTEM</div>
      <h1 className="admin-page-title">System Health</h1>

      {/* ── Top stats ── */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Mode</div>
            <div
              className="gc-stat-value"
              style={{ color: isDryRun ? 'var(--status-warn)' : 'var(--status-pass)' }}
            >
              {isDryRun ? 'DRY RUN' : 'LIVE'}
            </div>
            <div className="gc-stat-sub">
              {isDryRun ? 'No SOL dispatched' : 'Real SOL payouts'}
            </div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Build SHA</div>
            <div className="gc-stat-value" style={{ fontSize: 24, fontFamily: 'var(--font-mono)' }}>
              {buildSha}
            </div>
            <div className="gc-stat-sub">{env} · {region}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Invite Codes</div>
            <div className="gc-stat-value">{inviteRedeemed} / {inviteTotal}</div>
            <div className="gc-stat-sub">redeemed of total</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Cron Workers</div>
            <div className="gc-stat-value">{EXPECTED_WORKERS.length}</div>
            <div className="gc-stat-sub">scheduled</div>
          </div>
        </div>
      </div>

      {/* ── Cron workers ── */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          Cron Workers
        </h2>
        <div style={{ border: '1px solid var(--line)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(var(--fg-rgb), 0.04)', borderBottom: '1px solid var(--line)' }}>
                <th style={thStyle}>Worker</th>
                <th style={thStyle}>Schedule</th>
                <th style={thStyle}>Last Run</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {EXPECTED_WORKERS.map((w) => {
                const last = lastRunByWorker.get(w.path);
                const ago = last ? timeAgo(last.ts) : '—';
                return (
                  <tr key={w.path} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={tdStyle}>{w.label}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{w.schedule}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{ago}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          background: !last ? 'var(--text-tertiary)' : last.ok ? 'var(--status-pass)' : 'var(--status-fail)',
                          color: '#FFFFFF',
                        }}
                      >
                        {!last ? 'NO DATA' : last.ok ? 'OK' : 'FAIL'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {last?.detail || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          &quot;Last run&quot; is read from audit_logs. Workers that don&apos;t write audit entries show &quot;NO DATA&quot; even if they&apos;re running.
        </p>
      </div>

      {/* ── Env vars matrix ── */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          Environment Variables
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {Array.from(envByGroup.entries()).map(([group, items]) => (
            <div key={group} style={{ border: '1px solid var(--line)', padding: 16 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                }}
              >
                {group}
              </div>
              {items.map(({ key, present }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: 'var(--fg)' }}>{key}</span>
                  <span style={{ color: present ? 'var(--status-pass)' : 'var(--status-fail)', fontWeight: 700 }}>
                    {present ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          ✓ = value is set and non-empty. Presence only — secrets are never displayed.
        </p>
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const then = new Date(ts).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
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
