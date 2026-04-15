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

  // Enriched select: added ai_score, tamper_score, ocr_text, phash, hash_sha256
  // for the new forensic columns. ocr_text is only shown as a truncated
  // preview to keep the table scannable.
  const receiptSelect = `
    id,
    storage_path_private,
    is_image_redacted,
    ocr_confidence,
    ai_score,
    tamper_score,
    ocr_text,
    phash,
    hash_sha256,
    created_at
  `;

  let query = supabase
    .from('claims')
    .select(`
      id,
      wallet,
      status,
      created_at,
      claim_receipts (${receiptSelect})
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
        claim_receipts (${receiptSelect})
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
    aiScore: number | null;
    tamperScore: number | null;
    ocrText: string | null;
    phash: string | null;
    hashSha256: string | null;
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
        aiScore: r.ai_score != null ? Number(r.ai_score) : null,
        tamperScore: r.tamper_score != null ? Number(r.tamper_score) : null,
        ocrText: r.ocr_text ?? null,
        phash: r.phash ?? null,
        hashSha256: r.hash_sha256 ?? null,
        isRedacted: r.is_image_redacted ?? false,
        receiptCreatedAt: r.created_at,
      });
    }
  }

  // Phash collision map — count repetitions across the current view so
  // admins can see dedup at a glance. A phash that appears more than
  // once is a visible "this image was submitted by another wallet too"
  // warning.
  const phashCounts = new Map<string, number>();
  for (const r of receipts) {
    if (r.phash) phashCounts.set(r.phash, (phashCounts.get(r.phash) || 0) + 1);
  }

  // Risk color thresholds match the fraud engine in lib/integrations/fraud.ts:
  // ai_score >= 0.65  → AI-generated (fail)
  // tamper_score >= 0.55 → tampered (fail)
  const aiColor = (s: number | null) => {
    if (s == null) return 'var(--text-tertiary)';
    if (s >= 0.65) return 'var(--status-fail)';
    if (s >= 0.4) return 'var(--status-warn)';
    return 'var(--status-pass)';
  };
  const tamperColor = (s: number | null) => {
    if (s == null) return 'var(--text-tertiary)';
    if (s >= 0.55) return 'var(--status-fail)';
    if (s >= 0.35) return 'var(--status-warn)';
    return 'var(--status-pass)';
  };

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(var(--fg-rgb),0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(var(--fg-rgb),0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / MODERATION
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          RECEIPT REVIEW
        </div>
        {claimFilter && (
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(var(--fg-rgb),0.4)', marginTop: 8 }}>
            Filtered to claim: {claimFilter}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">RECEIPT ENTRIES</div>
            <div className="gc-stat-value">{receipts.length}</div>
            <div className="gc-stat-sub">{claimFilter ? 'for this claim' : 'approved claims'}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">AI-FLAGGED</div>
            <div className="gc-stat-value" style={{ color: 'var(--status-fail)' }}>
              {receipts.filter((r) => (r.aiScore ?? 0) >= 0.65).length}
            </div>
            <div className="gc-stat-sub">ai_score ≥ 0.65</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">TAMPER-FLAGGED</div>
            <div className="gc-stat-value" style={{ color: 'var(--status-fail)' }}>
              {receipts.filter((r) => (r.tamperScore ?? 0) >= 0.55).length}
            </div>
            <div className="gc-stat-sub">tamper_score ≥ 0.55</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">DUP PHASH</div>
            <div className="gc-stat-value" style={{ color: 'var(--status-warn)' }}>
              {receipts.filter((r) => r.phash && (phashCounts.get(r.phash) || 0) > 1).length}
            </div>
            <div className="gc-stat-sub">collision in view</div>
          </div>
        </div>
      </div>

      {/* Receipts table — now with forensic columns */}
      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>CLAIM</th>
              <th>WALLET</th>
              <th>OCR CONF</th>
              <th>AI SCORE</th>
              <th>TAMPER</th>
              <th>DEDUP</th>
              <th>OCR PREVIEW</th>
              <th>REDACTED</th>
              <th>SUBMITTED</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={9} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  No receipt records found.
                </td>
              </tr>
            ) : (
              receipts.map((r) => {
                const collisions = r.phash ? (phashCounts.get(r.phash) || 0) : 0;
                const preview = (r.ocrText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
                return (
                  <tr key={r.receiptId} className="lb-table-row">
                    <td className="lb-table-time" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, padding: '14px 16px' }}>
                      {r.claimId.slice(0, 8)}…
                    </td>
                    <td className="lb-table-wallet">{truncateWallet(r.wallet)}</td>
                    <td className="lb-table-time">
                      {r.ocrConfidence != null ? `${(r.ocrConfidence * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="lb-table-time">
                      <span style={{ color: aiColor(r.aiScore), fontWeight: 700 }}>
                        {r.aiScore != null ? r.aiScore.toFixed(2) : '—'}
                      </span>
                    </td>
                    <td className="lb-table-time">
                      <span style={{ color: tamperColor(r.tamperScore), fontWeight: 700 }}>
                        {r.tamperScore != null ? r.tamperScore.toFixed(2) : '—'}
                      </span>
                    </td>
                    <td className="lb-table-time" style={{ textAlign: 'center' }}>
                      {collisions <= 1 ? (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      ) : (
                        <span
                          style={{ color: 'var(--status-fail)', fontWeight: 700 }}
                          title={`phash appears in ${collisions} receipts in this view`}
                        >
                          ×{collisions}
                        </span>
                      )}
                    </td>
                    <td
                      className="lb-table-time"
                      style={{
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-secondary)',
                        fontFamily: 'IBM Plex Mono',
                        fontSize: 10,
                      }}
                      title={r.ocrText || ''}
                    >
                      {preview || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="lb-table-time">
                      {r.isRedacted ? (
                        <span style={{ color: 'var(--status-fail)', fontWeight: 700 }}>YES</span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td className="lb-table-time">{timeAgo(r.claimCreatedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-tertiary)' }}>
        AI Score ≥ 0.65 = model-generated. Tamper Score ≥ 0.55 = image manipulated.
        Dedup = phash collisions in the current view. Hover OCR Preview to see the full text.
      </p>
    </div>
  );
}
