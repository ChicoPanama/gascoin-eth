import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { truncateWallet, timeAgo } from '../../../lib/formatters';

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const params = await searchParams;
  const claimFilter = params.claim;

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('claims')
    .select(`
      id,
      wallet,
      status,
      created_at,
      claim_receipts (
        id,
        storage_path_private,
        is_image_redacted,
        ocr_confidence,
        created_at
      )
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  if (claimFilter) {
    query = supabase
      .from('claims')
      .select(`
        id,
        wallet,
        status,
        created_at,
        claim_receipts (
          id,
          storage_path_private,
          is_image_redacted,
          ocr_confidence,
          created_at
        )
      `)
      .eq('id', claimFilter)
      .limit(1);
  }

  const { data: claims } = await query;

  const receipts: Array<{
    claimId: string;
    wallet: string;
    claimStatus: string;
    claimCreatedAt: string;
    receiptId: string;
    storagePath: string;
    ocrConfidence: number | null;
    isRedacted: boolean;
    receiptCreatedAt: string;
  }> = [];

  for (const claim of claims ?? []) {
    const claimReceipts: any[] = Array.isArray((claim as any).claim_receipts)
      ? (claim as any).claim_receipts
      : (claim as any).claim_receipts
      ? [(claim as any).claim_receipts]
      : [];

    for (const r of claimReceipts) {
      receipts.push({
        claimId: claim.id,
        wallet: claim.wallet,
        claimStatus: claim.status,
        claimCreatedAt: claim.created_at,
        receiptId: r.id,
        storagePath: r.storage_path_private ?? '—',
        ocrConfidence: r.ocr_confidence ?? null,
        isRedacted: r.is_image_redacted ?? false,
        receiptCreatedAt: r.created_at,
      });
    }
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / MODERATION
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          RECEIPT REVIEW
        </div>
        {claimFilter && (
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            Filtered to claim: {claimFilter}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="gc-stat">
            <div className="gc-stat-label">RECEIPT ENTRIES</div>
            <div className="gc-stat-value">{receipts.length}</div>
            <div className="gc-stat-sub">{claimFilter ? 'for this claim' : 'approved claims'}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">REDACTED</div>
            <div className="gc-stat-value" style={{ color: 'rgba(255,80,80,0.8)' }}>
              {receipts.filter((r) => r.isRedacted).length}
            </div>
            <div className="gc-stat-sub">flagged images</div>
          </div>
        </div>
      </div>

      {/* Receipts table */}
      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>CLAIM ID</th>
              <th>WALLET</th>
              <th>STORAGE PATH</th>
              <th>OCR CONFIDENCE</th>
              <th>REDACTED</th>
              <th>SUBMITTED</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={6} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  No receipt records found.
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.receiptId} className="lb-table-row">
                  <td className="lb-table-time" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, padding: '14px 16px' }}>
                    {r.claimId.slice(0, 8)}…
                  </td>
                  <td className="lb-table-wallet">{truncateWallet(r.wallet)}</td>
                  <td
                    className="lb-table-time"
                    style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={r.storagePath}
                  >
                    {r.storagePath}
                  </td>
                  <td className="lb-table-time">
                    {r.ocrConfidence != null ? `${(r.ocrConfidence * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="lb-table-time">
                    {r.isRedacted ? (
                      <span style={{ color: 'rgba(255,80,80,0.8)' }}>YES</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                    )}
                  </td>
                  <td className="lb-table-time">{timeAgo(r.claimCreatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
