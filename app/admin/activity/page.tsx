import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { AutoRefresh } from './AutoRefresh';

// ═══════════════════════════════════════════
// Admin / Live Beta Activity
// ═══════════════════════════════════════════
//
// Single-page operational dashboard for day-of-launch monitoring.
// Aggregates data that lives across ~6 other admin pages into one
// live-refreshing view so the operator can pin this tab during the
// first beta window and see everything without navigating.
//
// Sections (top to bottom):
//   1. Headline stats row (4 tiles)
//   2. Recent invite redemptions (last 10)
//   3. Recent claim pipeline (last 10 submissions with status + risk)
//   4. Top failing gates (which gates are rejecting the most claims)
//   5. Active issues (failed payouts + critical intelligence + new bans)
//
// Client refresh: AutoRefresh island pings router.refresh() every 30s
// so new data streams in without page reloads. Can be paused.
//
// Performance: every query has a tight time window or LIMIT so page
// load stays under ~500ms even with a full beta's worth of data.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(Math.round(n));
}

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '—';
  const diff = Math.max(0, Date.now() - new Date(ts).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminActivityPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Parallel fetches — every query is cheap and bounded.
  const [
    inviteStatsRes,
    recentRedemptionsRes,
    claimsLastHourRes,
    claimsLastDayRes,
    recentClaimsRes,
    gateFailuresRes,
    payoutQueueRes,
    failedPayoutsRes,
    criticalIntelRes,
    recentBansRes,
  ] = await Promise.all([
    supabase
      .from('invite_codes')
      .select('used_by_x_user_id'),
    supabase
      .from('invite_codes')
      .select('code, used_by_x_handle, redeemed_at')
      .not('used_by_x_user_id', 'is', null)
      .order('redeemed_at', { ascending: false })
      .limit(10),
    supabase
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo),
    supabase
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo),
    supabase
      .from('claims')
      .select('id, status, risk_score, parsed_amount, wallet, created_at, users(x_handle, x_verified)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('gate_results')
      .select('gate, passed, reason_code')
      .gte('created_at', oneDayAgo)
      .eq('passed', false),
    supabase
      .from('payout_jobs')
      .select('status'),
    supabase
      .from('payout_jobs')
      .select('id, claim_id, wallet, amount_sol, last_error, attempts, max_attempts, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('intelligence_entries')
      .select('id, severity, entry_type, entity_id, summary, created_at, acknowledged')
      .in('severity', ['critical', 'high'])
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('user_bans')
      .select('id, reason, created_at, users(x_handle)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // Derive aggregates
  const inviteRows = inviteStatsRes.data || [];
  const totalCodes = inviteRows.length;
  const redeemedCodes = inviteRows.filter((r: any) => r.used_by_x_user_id).length;
  const availableCodes = totalCodes - redeemedCodes;

  const claims1h = claimsLastHourRes.count ?? 0;
  const claims24h = claimsLastDayRes.count ?? 0;

  const recentRedemptions = recentRedemptionsRes.data || [];
  const recentClaims = recentClaimsRes.data || [];

  // Gate failure breakdown — count how often each gate rejects a claim
  const gateFailures = new Map<string, number>();
  for (const row of (gateFailuresRes.data || []) as any[]) {
    const key = String(row.gate || row.reason_code || 'unknown');
    gateFailures.set(key, (gateFailures.get(key) || 0) + 1);
  }
  const topGateFailures = Array.from(gateFailures.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const totalGateFailures = Array.from(gateFailures.values()).reduce((s, n) => s + n, 0);

  // Payout queue breakdown
  const payoutByStatus = new Map<string, number>();
  for (const row of (payoutQueueRes.data || []) as any[]) {
    const s = String(row.status || 'unknown');
    payoutByStatus.set(s, (payoutByStatus.get(s) || 0) + 1);
  }
  const queuedCount = payoutByStatus.get('queued') || 0;
  const completedCount = payoutByStatus.get('completed') || 0;
  const failedCount = payoutByStatus.get('failed') || 0;

  const failedPayouts = failedPayoutsRes.data || [];
  const criticalIntel = criticalIntelRes.data || [];
  const recentBans = recentBansRes.data || [];

  // Active-issues count for the header tile
  const activeIssueCount =
    (failedPayouts?.length || 0) +
    (criticalIntel?.length || 0) +
    (recentBans?.length || 0);

  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';

  // Helpers for status coloring
  const statusColor = (s: string) => {
    const c: Record<string, string> = {
      submitted: 'var(--text-secondary)',
      auto_review: 'var(--status-warn)',
      ready_for_dispatch: 'var(--status-pass)',
      needs_review: 'var(--status-warn)',
      approved: 'var(--status-info)',
      paid: 'var(--status-pass)',
      rejected: 'var(--status-fail)',
    };
    return c[s] || 'var(--text-secondary)';
  };

  const riskColor = (r: number) => {
    if (r >= 0.7) return 'var(--status-fail)';
    if (r >= 0.4) return 'var(--status-warn)';
    return 'var(--status-pass)';
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div className="admin-page-header">ADMIN / OPERATIONS</div>
          <h1 className="admin-page-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
            Live Activity
          </h1>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: isDryRun ? 'var(--status-warn)' : 'var(--status-pass)',
              letterSpacing: '0.1em',
            }}
          >
            {isDryRun ? '● DRY RUN · SEASON 1' : '● LIVE'}
          </div>
        </div>
        <AutoRefresh />
      </div>

      <div style={{ borderBottom: '1px solid var(--line)', marginBottom: 32 }} />

      {/* ── Headline stats ── */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Codes Redeemed</div>
            <div className="gc-stat-value">
              {redeemedCodes} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>/ {totalCodes}</span>
            </div>
            <div className="gc-stat-sub">{availableCodes} available</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Claims · 1h</div>
            <div className="gc-stat-value">{claims1h}</div>
            <div className="gc-stat-sub">{claims24h} in 24h</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Dispatch Queue</div>
            <div className="gc-stat-value" style={{ color: queuedCount > 0 ? 'var(--status-warn)' : 'var(--text-secondary)' }}>
              {queuedCount}
            </div>
            <div className="gc-stat-sub">
              {completedCount} done · {failedCount} failed
            </div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Active Issues</div>
            <div
              className="gc-stat-value"
              style={{ color: activeIssueCount > 0 ? 'var(--status-fail)' : 'var(--status-pass)' }}
            >
              {activeIssueCount}
            </div>
            <div className="gc-stat-sub">needs attention</div>
          </div>
        </div>
      </div>

      {/* ── Recent redemptions ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionHeader}>Recent Redemptions</div>
        <div style={{ border: '1px solid var(--line)', overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeadRow}>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Handle</th>
                <th style={thStyle}>When</th>
              </tr>
            </thead>
            <tbody>
              {recentRedemptions.length === 0 && (
                <tr>
                  <td colSpan={3} style={emptyCellStyle}>
                    No redemptions yet. <Link href="/admin/invites" style={{ color: 'var(--status-info)', textDecoration: 'underline' }}>Generate or view codes →</Link>
                  </td>
                </tr>
              )}
              {recentRedemptions.map((r: any) => (
                <tr key={r.code} style={rowBorder}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.code}</td>
                  <td style={tdStyle}>@{r.used_by_x_handle || 'unknown'}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{timeAgo(r.redeemed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent claim pipeline ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionHeader}>Recent Claim Pipeline</div>
        <div style={{ border: '1px solid var(--line)', overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeadRow}>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Handle</th>
                <th style={thStyle}>✓</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Risk</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>USD</th>
                <th style={thStyle}>Wallet</th>
              </tr>
            </thead>
            <tbody>
              {recentClaims.length === 0 && (
                <tr>
                  <td colSpan={7} style={emptyCellStyle}>No claims yet.</td>
                </tr>
              )}
              {recentClaims.map((c: any) => {
                const user = Array.isArray(c.users) ? c.users[0] : c.users;
                const risk = Number(c.risk_score || 0);
                return (
                  <tr key={c.id} style={rowBorder}>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 11 }}>
                      {timeAgo(c.created_at)}
                    </td>
                    <td style={tdStyle}>@{user?.x_handle || '—'}</td>
                    <td style={tdStyle}>
                      {user?.x_verified ? (
                        <span style={{ color: 'var(--status-pass)', fontWeight: 700 }}>✓</span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          padding: '2px 8px',
                          background: statusColor(c.status),
                          color: 'var(--bg)',
                        }}
                      >
                        {c.status?.toUpperCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: riskColor(risk), fontWeight: 700 }}>
                      {risk.toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {c.parsed_amount != null ? `$${Number(c.parsed_amount).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11 }}>
                      {c.wallet ? `${c.wallet.slice(0, 4)}…${c.wallet.slice(-4)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top failing gates ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionHeader}>Top Failing Gates · 24h</div>
        <div style={{ border: '1px solid var(--line)', padding: 16 }}>
          {topGateFailures.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: 16 }}>
              No gate failures in the last 24h — everything passing.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topGateFailures.map(([gate, count]) => {
                const pct = totalGateFailures > 0 ? (count / totalGateFailures) * 100 : 0;
                return (
                  <div key={gate} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <div style={{ width: 180, color: 'var(--fg)', fontWeight: 600 }}>{gate}</div>
                    <div style={{ flex: 1, height: 10, background: 'rgba(var(--fg-rgb), 0.05)', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${pct}%`,
                          background: 'var(--status-fail)',
                        }}
                      />
                    </div>
                    <div style={{ width: 60, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Active issues ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionHeader}>Active Issues</div>

        {failedPayouts.length > 0 && (
          <div style={issueBlock('var(--status-fail)')}>
            <div style={issueLabel}>Failed Payouts · {failedPayouts.length}</div>
            {failedPayouts.map((j: any) => (
              <div key={j.id} style={issueRow}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>claim </span>
                  <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{j.claim_id?.slice(0, 8)}…</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                    attempts {j.attempts}/{j.max_attempts}
                  </span>
                </div>
                <div style={{ color: 'var(--status-fail)', marginTop: 4, fontSize: 11 }}>
                  {j.last_error || '(no error message)'}
                </div>
              </div>
            ))}
          </div>
        )}

        {criticalIntel.length > 0 && (
          <div style={issueBlock('var(--status-warn)')}>
            <div style={issueLabel}>Critical / High Intelligence · {criticalIntel.length} unacked</div>
            {criticalIntel.map((e: any) => (
              <div key={e.id} style={issueRow}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      background: e.severity === 'critical' ? 'var(--status-fail)' : 'var(--status-warn)',
                      color: 'var(--bg)',
                      marginRight: 8,
                    }}
                  >
                    {e.severity?.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{e.entry_type}</span>
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: 11 }}>
                    {timeAgo(e.created_at)}
                  </span>
                </div>
                <div style={{ color: 'var(--fg)', marginTop: 4 }}>{e.summary || '(no summary)'}</div>
              </div>
            ))}
            <Link
              href="/admin/intelligence?ack=pending"
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--status-info)',
                textDecoration: 'underline',
                letterSpacing: '0.1em',
              }}
            >
              VIEW ALL →
            </Link>
          </div>
        )}

        {recentBans.length > 0 && (
          <div style={issueBlock('var(--status-fail)')}>
            <div style={issueLabel}>Recent Auto-Bans · {recentBans.length}</div>
            {recentBans.map((b: any) => {
              const user = Array.isArray(b.users) ? b.users[0] : b.users;
              return (
                <div key={b.id} style={issueRow}>
                  <div>
                    <span style={{ color: 'var(--fg)', fontWeight: 600 }}>@{user?.x_handle || 'unknown'}</span>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: 11 }}>
                      {timeAgo(b.created_at)}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 11 }}>
                    {b.reason || '(no reason)'}
                  </div>
                </div>
              );
            })}
            <Link
              href="/admin/moderation/bans"
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--status-info)',
                textDecoration: 'underline',
                letterSpacing: '0.1em',
              }}
            >
              VIEW ALL →
            </Link>
          </div>
        )}

        {activeIssueCount === 0 && (
          <div
            style={{
              border: '1px solid var(--line)',
              borderLeft: '3px solid var(--status-pass)',
              padding: 16,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ color: 'var(--status-pass)', fontWeight: 700, marginRight: 8 }}>✓ ALL CLEAR</span>
            No failed payouts, no unacked critical intelligence, no new bans.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared inline style tokens ─────────────────────────────────────
const sectionHeader: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 12,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
};

const tableHeadRow: React.CSSProperties = {
  background: 'rgba(var(--fg-rgb), 0.04)',
  borderBottom: '1px solid var(--line)',
};

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

const rowBorder: React.CSSProperties = {
  borderBottom: '1px solid var(--line)',
};

const emptyCellStyle: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
};

function issueBlock(borderColor: string): React.CSSProperties {
  return {
    border: '1px solid var(--line)',
    borderLeft: `3px solid ${borderColor}`,
    padding: 16,
    marginBottom: 12,
    background: 'rgba(var(--fg-rgb), 0.02)',
  };
}

const issueLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 12,
};

const issueRow: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  paddingBottom: 10,
  marginBottom: 10,
  borderBottom: '1px solid rgba(var(--fg-rgb), 0.05)',
};
