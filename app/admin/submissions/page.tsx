import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { truncateWallet, timeAgo, formatSol } from '../../../lib/formatters';
import { approveSubmission, rejectSubmission } from '../../actions/admin/submissions';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'SUBMITTED',
  auto_review: 'AUTO REVIEW',
  ready_for_dispatch: 'READY',
  needs_review: 'NEEDS REVIEW',
  approved: 'DISPATCHED',
  rejected: 'REJECTED',
  paid: 'PAID',
};

const FILTER_MAP: Record<string, string[]> = {
  DISPATCH: ['ready_for_dispatch'],
  REVIEW: ['needs_review'],
  DISPATCHED: ['approved', 'paid'],
  REJECTED: ['rejected'],
  ALL: ['submitted', 'auto_review', 'ready_for_dispatch', 'needs_review', 'approved', 'rejected', 'paid'],
};

function statusColor(status: string): string {
  const map: Record<string, string> = {
    submitted: 'rgba(var(--fg-rgb),0.4)',
    auto_review: 'rgba(255,200,80,0.8)',
    ready_for_dispatch: 'rgba(100,220,120,0.9)',
    needs_review: 'rgba(255,120,60,0.9)',
    approved: 'rgba(100,180,255,0.9)',
    rejected: 'rgba(255,80,80,0.8)',
    paid: 'rgba(100,220,120,0.9)',
  };
  return map[status] || 'rgba(var(--fg-rgb),0.4)';
}

function riskColor(score: number): string {
  if (score >= 0.7) return 'rgba(100,220,120,0.9)';
  if (score >= 0.5) return 'rgba(255,200,80,0.9)';
  return 'rgba(255,80,80,0.9)';
}

export default async function SubmissionsPage(props: { searchParams: Promise<{ filter?: string }> }) {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const searchParams = await props.searchParams;
  const activeFilter = searchParams.filter || 'DISPATCH';
  const statuses = FILTER_MAP[activeFilter] || FILTER_MAP.ALL;

  const supabase = getSupabaseAdmin();

  // Get claims with receipts and gate results. Added x_verified to users
  // select and phash/hash_sha256 to claim_receipts for the enrichment
  // columns below (verified badge + dedup indicator).
  const { data: claims } = await supabase
    .from('claims')
    .select(`
      id, created_at, wallet, status, risk_score, parsed_amount, claimed_amount, decision_reason,
      users(x_handle, x_verified),
      claim_receipts(storage_path_private, ai_score, tamper_score, ocr_confidence, hash_sha256, phash, metadata_json),
      gate_results(gate_name, passed, score, reason_code)
    `)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(100);

  // Count ready for dispatch
  const { count: readyCount } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ready_for_dispatch');

  const { count: reviewCount } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'needs_review');

  // Risk score distribution across ALL claims in the last 30 days.
  // Surfaces whether the pipeline is sitting in a healthy band or
  // drifting toward high-risk territory.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: riskClaims } = await supabase
    .from('claims')
    .select('risk_score')
    .gte('created_at', thirtyDaysAgo)
    .not('risk_score', 'is', null);

  const riskBuckets = [0, 0, 0, 0, 0]; // [0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8+]
  for (const r of (riskClaims || []) as any[]) {
    const s = Number(r.risk_score || 0);
    const b = Math.min(4, Math.floor(s * 5));
    riskBuckets[b] += 1;
  }
  const riskMax = Math.max(1, ...riskBuckets);

  // Phash collision map — for each phash in the current view, count how
  // many times it appears across the last 7 days of claims. A count >1
  // means the same receipt image (perceptually) is being submitted
  // multiple times. One query, cheap.
  const phashes = (claims || [])
    .flatMap((c: any) => (c.claim_receipts || []).map((r: any) => r.phash))
    .filter((p: string | null | undefined): p is string => !!p);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const collisionMap = new Map<string, number>();
  if (phashes.length > 0) {
    const { data: collisions } = await supabase
      .from('claim_receipts')
      .select('phash')
      .gte('created_at', sevenDaysAgo)
      .in('phash', phashes);
    for (const row of (collisions || []) as any[]) {
      const p = row.phash as string;
      collisionMap.set(p, (collisionMap.get(p) || 0) + 1);
    }
  }

  return (
    <div>
      <div className="admin-page-header">ADMIN / SUBMISSIONS</div>
      <h1 className="admin-page-title">Dispatch Queue</h1>

      {/* Stats */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Ready for Dispatch</div>
            <div className="gc-stat-value" style={{ color: 'rgba(100,220,120,0.9)' }}>{readyCount ?? 0}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Needs Review</div>
            <div className="gc-stat-value" style={{ color: 'rgba(255,120,60,0.9)' }}>{reviewCount ?? 0}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Showing</div>
            <div className="gc-stat-value">{(claims || []).length}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Filter</div>
            <div className="gc-stat-value" style={{ fontSize: 20 }}>{activeFilter}</div>
          </div>
        </div>
      </div>

      {/* Risk distribution histogram (last 30 days) */}
      <div
        style={{
          border: '1px solid var(--line)',
          padding: 16,
          marginBottom: 24,
          background: 'rgba(var(--fg-rgb), 0.02)',
        }}
      >
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
          Risk Score Distribution · last 30 days · {riskClaims?.length ?? 0} claims
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
          {['0–0.2', '0.2–0.4', '0.4–0.6', '0.6–0.8', '0.8+'].map((label, i) => {
            const count = riskBuckets[i];
            const pct = count / riskMax;
            const color =
              i === 0 ? 'var(--status-pass)' :
              i === 1 ? 'var(--status-pass)' :
              i === 2 ? 'var(--status-warn)' :
              i === 3 ? 'var(--status-warn)' :
              'var(--status-fail)';
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)', fontWeight: 600 }}>
                  {count}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(2, pct * 60)}px`,
                    background: color,
                    transition: 'height 0.3s ease',
                  }}
                />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {Object.keys(FILTER_MAP).map((f) => (
          <Link
            key={f}
            href={`/admin/submissions?filter=${f}`}
            className={`cf-filter-tab${activeFilter === f ? ' cf-filter-tab--active' : ''}`}
          >
            {f}
          </Link>
        ))}
      </div>

      {/* Table */}
      <table className="lb-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Submitted</th>
            <th>Wallet</th>
            <th>X Handle</th>
            <th>✓</th>
            <th>Status</th>
            <th>Risk</th>
            <th>Auth Score</th>
            <th>Dedup</th>
            <th>Gates</th>
            <th>SOL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(claims || []).map((c: any) => {
            const receipt = c.claim_receipts?.[0];
            const meta = receipt?.metadata_json || {};
            const gatesPassed = (c.gate_results || []).filter((g: any) => g.passed).length;
            const gatesTotal = (c.gate_results || []).length;
            const authScore = meta.authenticityScore;
            const fraudRisk = meta.fraudRisk;
            const recommendedSol = Math.max(0.001, +(Number(c.parsed_amount || 0) / 200).toFixed(6));
            const canDispatch = ['ready_for_dispatch', 'needs_review'].includes(c.status);

            const user = Array.isArray(c.users) ? c.users[0] : c.users;
            const xVerified = !!user?.x_verified;
            const phash = receipt?.phash;
            const phashCollisions = phash ? (collisionMap.get(phash) || 0) : 0;

            return (
              <tr key={c.id} className="lb-table-row">
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--text-tertiary)' }}>
                  {c.id.slice(0, 8)}
                </td>
                <td className="lb-table-time">{timeAgo(c.created_at)}</td>
                <td className="lb-table-wallet">{truncateWallet(c.wallet)}</td>
                <td className="lb-table-claims">{user?.x_handle || '—'}</td>
                <td style={{ textAlign: 'center', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
                  {xVerified ? (
                    <span style={{ color: 'var(--status-pass)', fontWeight: 700 }} title="X Verified">✓</span>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }} title="Not verified">—</span>
                  )}
                </td>
                <td>
                  <span style={{
                    fontFamily: 'IBM Plex Mono', fontSize: 9, fontWeight: 600,
                    padding: '3px 8px', border: `1px solid ${statusColor(c.status)}`,
                    color: statusColor(c.status),
                  }}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(var(--fg-rgb),0.4)' }}>
                  {Number(c.risk_score || 0).toFixed(2)}
                </td>
                <td>
                  {authScore != null ? (
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: riskColor(authScore) }}>
                      {(authScore * 100).toFixed(0)}%
                    </span>
                  ) : '—'}
                  {fraudRisk && (
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                      {fraudRisk}
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, textAlign: 'center' }}>
                  {phashCollisions <= 1 ? (
                    <span style={{ color: 'var(--text-tertiary)' }} title="Unique phash">—</span>
                  ) : (
                    <span
                      style={{
                        color: 'var(--status-fail)',
                        fontWeight: 700,
                      }}
                      title={`This phash appears in ${phashCollisions} claims in the last 7 days — potential duplicate receipt`}
                    >
                      ×{phashCollisions}
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                  {gatesTotal > 0 ? `${gatesPassed}/${gatesTotal}` : '—'}
                </td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                  {c.parsed_amount ? `$${Number(c.parsed_amount).toFixed(2)}` : '—'}
                </td>
                <td>
                  {canDispatch && (
                    <form action={async () => {
                      'use server';
                      await approveSubmission(c.id, recommendedSol, 'admin_dispatch');
                    }}>
                      <button type="submit" className="sf-btn-solid" style={{ padding: '4px 12px', fontSize: 9 }}>
                        APPROVE {formatSol(recommendedSol)}
                      </button>
                    </form>
                  )}
                  {canDispatch && (
                    <form action={async () => {
                      'use server';
                      await rejectSubmission(c.id, 'admin_rejected');
                    }} style={{ marginTop: 4 }}>
                      <button type="submit" className="sf-btn-ghost" style={{ padding: '4px 12px', fontSize: 9 }}>
                        REJECT
                      </button>
                    </form>
                  )}
                  {!canDispatch && (
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(var(--fg-rgb),0.2)' }}>
                      {c.status === 'approved' ? 'Dispatched' : c.status === 'paid' ? 'Paid' : '—'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {(!claims || claims.length === 0) && (
            <tr>
              <td colSpan={12} style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
                {activeFilter === 'DISPATCH' ? 'No receipts ready for dispatch' : 'No claims match this filter'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pipeline flags for ready_for_dispatch claims */}
      {activeFilter === 'DISPATCH' && (claims || []).length > 0 && (
        <div style={{ marginTop: 24, fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(var(--fg-rgb),0.25)' }}>
          Auth Score: EXIF (20%) + Dimensions (10%) + Model confidence (25%) + Physical receipt (15%) + Gas station (10%) + Not manipulated (10%) + Handwriting (5%) + Wallet found (5%)
        </div>
      )}
    </div>
  );
}
