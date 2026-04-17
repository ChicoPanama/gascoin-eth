import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';

// ═══════════════════════════════════════════
// Admin / Intelligence Feed
// ═══════════════════════════════════════════
//
// Surfaces the intelligence_entries table — fraud signals, pipeline
// observations, cross-pipeline flags that the workers are writing as
// they process claims. Up until this page, the pipeline was generating
// intelligence that admins never saw.
//
// Schema: intelligence_entries (id, entry_type, entity_type, entity_id,
// summary, detail_json, severity, pipeline_source, acknowledged, created_at)
//
// Filtering via query params:
//   ?severity=critical|high|medium|low
//   ?type=fraud_signal|cross_flag|anomaly|...
//   ?ack=pending|acked|all (default: pending)
//
// Acknowledgment is a soft "I've seen this, stop highlighting it" state.
// Critical items should never be auto-acked — admin has to click.

async function acknowledgeEntry(formData: FormData) {
  'use server';
  const session = await verifyAdminSession();
  if (!session.valid) return;

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  const supabase = getSupabaseAdmin();
  await supabase
    .from('intelligence_entries')
    .update({ acknowledged: true })
    .eq('id', id);

  await supabase.from('audit_logs').insert({
    actor_type: 'admin',
    actor_id: session.walletAddress || 'admin',
    action: 'intelligence_ack',
    target_type: 'intelligence_entry',
    target_id: String(id),
    payload_json: { acked_at: new Date().toISOString() },
  });

  revalidatePath('/admin/intelligence');
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const params = await searchParams;
  const severityFilter = (typeof params.severity === 'string' ? params.severity : '').toLowerCase();
  const typeFilter = (typeof params.type === 'string' ? params.type : '').toLowerCase();
  const ackFilter = (typeof params.ack === 'string' ? params.ack : 'pending').toLowerCase();

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('intelligence_entries')
    .select('id, entry_type, entity_type, entity_id, summary, detail_json, severity, pipeline_source, acknowledged, created_at')
    .order('created_at', { ascending: false })
    .limit(300);

  if (severityFilter && ['critical', 'high', 'medium', 'low', 'info'].includes(severityFilter)) {
    query = query.eq('severity', severityFilter);
  }
  if (typeFilter) {
    query = query.eq('entry_type', typeFilter);
  }
  if (ackFilter === 'pending') {
    query = query.eq('acknowledged', false);
  } else if (ackFilter === 'acked') {
    query = query.eq('acknowledged', true);
  }

  // Run entries query and severity-count RPC in parallel
  const [{ data: entries }, severityRes] = await Promise.all([
    query,
    // One GROUP BY query instead of four COUNT queries
    supabase.rpc('get_intelligence_severity_counts'),
  ]);
  const rows = entries || [];

  // Extract per-severity counts from the single RPC result
  const sevCounts: Record<string, number> = {};
  for (const row of severityRes.data || []) {
    sevCounts[row.severity] = Number(row.cnt);
  }
  const critCount = sevCounts['critical'] || 0;
  const highCount = sevCounts['high'] || 0;
  const medCount  = sevCounts['medium'] || 0;
  const totalPending = Object.values(sevCounts).reduce((s, n) => s + n, 0);

  return (
    <div>
      <div className="admin-page-header">ADMIN / MODERATION</div>
      <h1 className="admin-page-title">Intelligence Feed</h1>

      {/* ── Severity counts ── */}
      <div className="gc-stats" style={{ marginBottom: 24 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Critical · Pending</div>
            <div className="gc-stat-value" style={{ color: critCount > 0 ? 'var(--status-fail)' : 'var(--text-secondary)' }}>
              {critCount}
            </div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">High · Pending</div>
            <div className="gc-stat-value" style={{ color: highCount > 0 ? 'var(--status-warn)' : 'var(--text-secondary)' }}>
              {highCount}
            </div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Medium · Pending</div>
            <div className="gc-stat-value">{medCount}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Total Pending</div>
            <div className="gc-stat-value">{totalPending}</div>
          </div>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'All', href: '/admin/intelligence?ack=all' },
          { label: 'Pending', href: '/admin/intelligence?ack=pending' },
          { label: 'Acked', href: '/admin/intelligence?ack=acked' },
          { label: 'Critical', href: '/admin/intelligence?severity=critical&ack=pending' },
          { label: 'High', href: '/admin/intelligence?severity=high&ack=pending' },
          { label: 'Medium', href: '/admin/intelligence?severity=medium&ack=pending' },
          { label: 'Low', href: '/admin/intelligence?severity=low&ack=pending' },
        ].map((f) => (
          <a
            key={f.label}
            href={f.href}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '6px 12px',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              textDecoration: 'none',
            }}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* ── Entries ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.length === 0 && (
          <div
            style={{
              border: '1px solid var(--line)',
              padding: 32,
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
            }}
          >
            No intelligence entries matching the current filter.
          </div>
        )}
        {rows.map((e: any) => {
          const severity = (e.severity || 'info').toLowerCase();
          const sevColor =
            severity === 'critical' ? 'var(--status-fail)' :
            severity === 'high' ? 'var(--status-warn)' :
            severity === 'medium' ? 'var(--status-info)' :
            'var(--text-secondary)';
          return (
            <div
              key={e.id}
              style={{
                border: '1px solid var(--line)',
                borderLeft: `3px solid ${sevColor}`,
                padding: 16,
                background: e.acknowledged ? 'rgba(var(--fg-rgb), 0.01)' : 'transparent',
                opacity: e.acknowledged ? 0.65 : 1,
              }}
            >
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    background: sevColor,
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {severity}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                  {e.entry_type || 'unknown'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                  · {e.pipeline_source || 'system'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--fg)', marginBottom: 8 }}>
                {e.summary || '(no summary)'}
              </div>
              <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <span>
                  <span style={{ color: 'var(--text-tertiary)' }}>ENTITY:</span>{' '}
                  {e.entity_type || '—'}:{e.entity_id || '—'}
                </span>
              </div>
              {e.detail_json && Object.keys(e.detail_json).length > 0 && (
                <details>
                  <summary
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                    }}
                  >
                    Detail JSON
                  </summary>
                  <pre
                    style={{
                      marginTop: 8,
                      padding: 12,
                      background: 'rgba(var(--fg-rgb), 0.03)',
                      border: '1px solid var(--line)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      overflow: 'auto',
                      maxHeight: 240,
                    }}
                  >
                    {JSON.stringify(e.detail_json, null, 2)}
                  </pre>
                </details>
              )}
              {!e.acknowledged && (
                <form action={acknowledgeEntry} style={{ marginTop: 12 }}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      padding: '4px 12px',
                      cursor: 'crosshair',
                      letterSpacing: '0.08em',
                    }}
                  >
                    ACKNOWLEDGE
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <p
        style={{
          marginTop: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}
      >
        Showing up to 300 most recent. Pipeline workers write to this table via
        `lib/data-intelligence.ts` and the fraud/oversight modules.
      </p>
    </div>
  );
}
