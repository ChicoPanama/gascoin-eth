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
    submitted: 'rgba(255,255,255,0.4)',
    auto_review: 'rgba(255,200,80,0.8)',
    ready_for_dispatch: 'rgba(100,220,120,0.9)',
    needs_review: 'rgba(255,120,60,0.9)',
    approved: 'rgba(100,180,255,0.9)',
    rejected: 'rgba(255,80,80,0.8)',
    paid: 'rgba(100,220,120,0.9)',
  };
  return map[status] || 'rgba(255,255,255,0.4)';
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

  // Get claims with receipts and gate results
  const { data: claims } = await supabase
    .from('claims')
    .select(`
      id, created_at, wallet, status, risk_score, parsed_amount, claimed_amount, decision_reason,
      users(x_handle),
      claim_receipts(storage_path_private, ai_score, tamper_score, ocr_confidence, metadata_json),
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
            <th>Status</th>
            <th>Risk</th>
            <th>Auth Score</th>
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

            return (
              <tr key={c.id} className="lb-table-row">
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                  {c.id.slice(0, 8)}
                </td>
                <td className="lb-table-time">{timeAgo(c.created_at)}</td>
                <td className="lb-table-wallet">{truncateWallet(c.wallet)}</td>
                <td className="lb-table-claims">{c.users?.x_handle || '—'}</td>
                <td>
                  <span style={{
                    fontFamily: 'IBM Plex Mono', fontSize: 9, fontWeight: 600,
                    padding: '3px 8px', border: `1px solid ${statusColor(c.status)}`,
                    color: statusColor(c.status),
                  }}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </td>
                <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {Number(c.risk_score || 0).toFixed(2)}
                </td>
                <td>
                  {authScore != null ? (
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: riskColor(authScore) }}>
                      {(authScore * 100).toFixed(0)}%
                    </span>
                  ) : '—'}
                  {fraudRisk && (
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
                      {fraudRisk}
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
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                      {c.status === 'approved' ? 'Dispatched' : c.status === 'paid' ? 'Paid' : '—'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {(!claims || claims.length === 0) && (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
                {activeFilter === 'DISPATCH' ? 'No receipts ready for dispatch' : 'No claims match this filter'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pipeline flags for ready_for_dispatch claims */}
      {activeFilter === 'DISPATCH' && (claims || []).length > 0 && (
        <div style={{ marginTop: 24, fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
          Auth Score: EXIF (20%) + Dimensions (10%) + Model confidence (25%) + Physical receipt (15%) + Gas station (10%) + Not manipulated (10%) + Handwriting (5%) + Wallet found (5%)
        </div>
      )}
    </div>
  );
}
