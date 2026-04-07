import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { GATES } from '../../../lib/gates';
import { timeAgo } from '../../../lib/formatters';
import { overrideGate } from '../../actions/admin/submissions';

export default async function GatesPage({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const params = await searchParams;
  const prefilledClaim = params.claim ?? '';

  const supabase = getSupabaseAdmin();

  const { data: history } = await supabase
    .from('gate_results')
    .select('id, claim_id, gate_name, passed, reason_code, score, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / MODERATION
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          GATE OVERRIDES
        </div>
      </div>

      {/* Override form */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: 32, marginBottom: 40 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 24 }}>
          MANUAL GATE OVERRIDE
        </div>
        <form action={async (fd: FormData) => {
          'use server';
          const claimId = fd.get('claim_id') as string;
          const gateName = fd.get('gate_name') as string;
          const passed = fd.get('passed') === 'true';
          const reason = fd.get('reason') as string;
          if (claimId && gateName && reason) {
            await overrideGate(claimId, gateName, passed, reason);
          }
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <div className="gc-stat-label" style={{ marginBottom: 8 }}>SUBMISSION ID</div>
              <input
                type="text"
                name="claim_id"
                defaultValue={prefilledClaim}
                placeholder="UUID"
                required
                style={{
                  width: '100%',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--fg)',
                  padding: '10px 14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <div className="gc-stat-label" style={{ marginBottom: 8 }}>GATE</div>
              <select
                name="gate_name"
                required
                style={{
                  width: '100%',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 12,
                  background: 'rgba(20,20,20,1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--fg)',
                  padding: '10px 14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select gate…</option>
                <option value="x_verified">X Verified</option>
                <option value="tweet_hashtag">Tweet Hashtag</option>
                <option value="tweet_live">Tweet Live</option>
                <option value="receipt_hashtag">Receipt Hashtag</option>
                <option value="wallet_match">Wallet Match</option>
                <option value="gascoin_min_hold">GASCOIN Min Hold</option>
                <option value="not_duplicate">Not Duplicate</option>
                <option value="ai_image_check">AI Image Check</option>
                <option value="tamper_check">Tamper Check</option>
                <option value="cooldown">Cooldown</option>
                <option value="min_followers">Min Followers</option>
                <option value="account_quality">Account Quality</option>
              </select>
            </div>
            <div>
              <div className="gc-stat-label" style={{ marginBottom: 8 }}>RESULT</div>
              <select
                name="passed"
                required
                style={{
                  width: '100%',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 12,
                  background: 'rgba(20,20,20,1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--fg)',
                  padding: '10px 14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="true">PASS</option>
                <option value="false">FAIL</option>
              </select>
            </div>
            <div>
              <div className="gc-stat-label" style={{ marginBottom: 8 }}>REASON</div>
              <input
                type="text"
                name="reason"
                placeholder="admin_override / manual_review_pass / …"
                required
                style={{
                  width: '100%',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--fg)',
                  padding: '10px 14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <button type="submit" className="sf-btn-solid">
            APPLY OVERRIDE
          </button>
        </form>
      </div>

      {/* Gate results history */}
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
        GATE RESULT HISTORY
      </div>

      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>CLAIM ID</th>
              <th>GATE</th>
              <th>RESULT</th>
              <th>REASON</th>
              <th>SCORE</th>
              <th>RECORDED</th>
            </tr>
          </thead>
          <tbody>
            {!history || history.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={6} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  No gate results recorded.
                </td>
              </tr>
            ) : (
              history.map((row: any) => (
                <tr key={row.id} className="lb-table-row">
                  <td className="lb-table-time" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, padding: '14px 16px' }}>
                    {row.claim_id?.slice(0, 8)}…
                  </td>
                  <td className="lb-table-wallet" style={{ fontSize: 12 }}>{row.gate_name}</td>
                  <td className="lb-table-time">
                    {row.passed ? (
                      <span style={{ color: 'rgba(100,220,120,0.9)' }}>PASS</span>
                    ) : (
                      <span style={{ color: 'rgba(255,80,80,0.8)' }}>FAIL</span>
                    )}
                  </td>
                  <td className="lb-table-time">{row.reason_code ?? '—'}</td>
                  <td className="lb-table-claims">{row.score != null ? row.score : '—'}</td>
                  <td className="lb-table-time">{timeAgo(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
