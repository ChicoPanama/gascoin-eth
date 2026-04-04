import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { truncateWallet, timeAgo } from '../../../lib/formatters';

const ALL_STATUSES = ['submitted', 'auto_review', 'needs_manual_review', 'approved', 'rejected'] as const;
type ClaimStatus = typeof ALL_STATUSES[number];

const STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: 'SUBMITTED',
  auto_review: 'AUTO REVIEW',
  needs_manual_review: 'MANUAL REVIEW',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

const FILTER_MAP: Record<string, ClaimStatus[]> = {
  ALL: [...ALL_STATUSES],
  PENDING: ['submitted', 'auto_review', 'needs_manual_review'],
  APPROVED: ['approved'],
  REJECTED: ['rejected'],
};

function statusStyle(status: ClaimStatus): React.CSSProperties {
  const colors: Record<ClaimStatus, string> = {
    submitted: 'rgba(255,255,255,0.4)',
    auto_review: 'rgba(255,200,80,0.8)',
    needs_manual_review: 'rgba(255,120,60,0.9)',
    approved: 'rgba(100,220,120,0.9)',
    rejected: 'rgba(255,80,80,0.8)',
  };
  return { color: colors[status] };
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const params = await searchParams;
  const filter = (params.filter || 'ALL').toUpperCase();
  const activeFilter = FILTER_MAP[filter] ? filter : 'ALL';
  const statuses = FILTER_MAP[activeFilter];

  const supabase = getSupabaseAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [{ data: claims }, { count: pendingCount }, { count: approvedToday }, { count: rejectedToday }] =
    await Promise.all([
      supabase
        .from('claims')
        .select('id, created_at, wallet, status, gate_results(count)')
        .in('status', statuses)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'auto_review', 'needs_manual_review']),
      supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('updated_at', todayIso),
      supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('updated_at', todayIso),
    ]);

  const TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / OPERATIONS
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          SUBMISSIONS
        </div>
      </div>

      {/* Stats strip */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="gc-stat">
            <div className="gc-stat-label">PENDING REVIEW</div>
            <div className="gc-stat-value">{pendingCount ?? 0}</div>
            <div className="gc-stat-sub">awaiting decision</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">APPROVED TODAY</div>
            <div className="gc-stat-value" style={{ color: 'rgba(100,220,120,0.9)' }}>{approvedToday ?? 0}</div>
            <div className="gc-stat-sub">since midnight UTC</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">REJECTED TODAY</div>
            <div className="gc-stat-value" style={{ color: 'rgba(255,80,80,0.8)' }}>{rejectedToday ?? 0}</div>
            <div className="gc-stat-sub">since midnight UTC</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/submissions?filter=${tab}`}
            style={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '12px 24px',
              color: activeFilter === tab ? 'var(--fg)' : 'rgba(255,255,255,0.35)',
              borderBottom: activeFilter === tab ? '2px solid var(--fg)' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            {tab}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>SUBMITTED</th>
              <th>WALLET</th>
              <th>STATUS</th>
              <th>GATES</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {!claims || claims.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={6} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  No submissions found.
                </td>
              </tr>
            ) : (
              claims.map((claim: any) => {
                const gateCount = Array.isArray(claim.gate_results) ? claim.gate_results.length : 0;
                return (
                  <tr key={claim.id} className="lb-table-row">
                    <td className="lb-table-time" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, padding: '14px 16px' }}>
                      {claim.id.slice(0, 8)}…
                    </td>
                    <td className="lb-table-time">{timeAgo(claim.created_at)}</td>
                    <td className="lb-table-wallet">{truncateWallet(claim.wallet)}</td>
                    <td className="lb-table-time">
                      <span style={statusStyle(claim.status as ClaimStatus)}>
                        {STATUS_LABELS[claim.status as ClaimStatus] ?? claim.status}
                      </span>
                    </td>
                    <td className="lb-table-claims">{gateCount}</td>
                    <td className="lb-table-action">
                      <Link
                        href={`/admin/gates?claim=${claim.id}`}
                        style={{ color: 'inherit', textDecoration: 'none', marginRight: 12 }}
                      >
                        GATES
                      </Link>
                      <Link
                        href={`/admin/receipts?claim=${claim.id}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        RECEIPT
                      </Link>
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
