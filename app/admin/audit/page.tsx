import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { truncateWallet, timeAgo } from '../../../lib/formatters';

export default async function AuditPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, actor_type, actor_id, action, target_type, target_id, payload_json, ts, created_at')
    .order('ts', { ascending: false, nullsFirst: false })
    .limit(200);

  const sortedLogs = (logs ?? []).sort((a: any, b: any) => {
    const aTime = a.ts ?? a.created_at ?? '';
    const bTime = b.ts ?? b.created_at ?? '';
    return bTime.localeCompare(aTime);
  });

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / ANALYTICS
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          AUDIT LOG
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
          {sortedLogs.length} entries (most recent 200) — chronological, newest first
        </div>
      </div>

      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>WHEN</th>
              <th>ACTOR</th>
              <th>ACTION</th>
              <th>TARGET TYPE</th>
              <th>TARGET ID</th>
              <th>DETAIL</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={6} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  No audit log entries.
                </td>
              </tr>
            ) : (
              sortedLogs.map((log: any) => {
                const timestamp = log.ts ?? log.created_at;
                const payload = log.payload_json;
                const payloadStr = payload ? JSON.stringify(payload, null, 2) : null;

                return (
                  <tr key={log.id} className="lb-table-row">
                    <td className="lb-table-time" style={{ whiteSpace: 'nowrap' }}>
                      {timestamp ? timeAgo(timestamp) : '—'}
                    </td>
                    <td className="lb-table-wallet">
                      {log.actor_id ? truncateWallet(log.actor_id) : log.actor_type ?? '—'}
                    </td>
                    <td
                      className="lb-table-wallet"
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}
                    >
                      {log.action ?? '—'}
                    </td>
                    <td className="lb-table-time">{log.target_type ?? '—'}</td>
                    <td className="lb-table-time" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.target_id
                        ? log.target_id.length > 16
                          ? `${log.target_id.slice(0, 8)}…`
                          : log.target_id
                        : '—'}
                    </td>
                    <td className="lb-table-action">
                      {payloadStr ? (
                        <details>
                          <summary style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', userSelect: 'none' }}>
                            VIEW JSON
                          </summary>
                          <pre
                            style={{
                              fontFamily: 'IBM Plex Mono',
                              fontSize: 10,
                              color: 'rgba(255,255,255,0.6)',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              padding: 12,
                              marginTop: 8,
                              maxWidth: 400,
                              overflow: 'auto',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              textAlign: 'left',
                            }}
                          >
                            {payloadStr}
                          </pre>
                        </details>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
