import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getTreasuryBalances } from '../../../lib/integrations/solana';
import { formatSol } from '../../../lib/formatters';

export default async function TreasuryPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  const [treasury, { count: pendingRefunds }, { count: pendingReferrals }, { data: recentPayouts }] =
    await Promise.all([
      getTreasuryBalances(),
      supabase
        .from('payout_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued'),
      supabase
        .from('referral_conversions')
        .select('*', { count: 'exact', head: true })
        .eq('reward_status', 'pending'),
      supabase
        .from('payout_jobs')
        .select('id, claim_id, wallet, amount_sol, status, created_at, tx_hash')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  const treasuryWallet = process.env.GASCOIN_TREASURY_WALLET ?? null;

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / OPERATIONS
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          TREASURY
        </div>
        {treasuryWallet && (
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
            {treasuryWallet.slice(0, 8)}…{treasuryWallet.slice(-8)}
          </div>
        )}
      </div>

      {/* Live balance stats */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="gc-stat">
            <div className="gc-stat-label">SOL BALANCE</div>
            <div className="gc-stat-value">{treasury.solBalance.toFixed(4)}</div>
            <div className="gc-stat-sub">${treasury.solUsd.toFixed(2)} USD</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">GASCOIN BALANCE</div>
            <div className="gc-stat-value">{Math.floor(treasury.gascoinBalance).toLocaleString()}</div>
            <div className="gc-stat-sub">${treasury.gascoinUsd.toFixed(2)} USD</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">PENDING REFUNDS</div>
            <div className="gc-stat-value" style={{ color: pendingRefunds ? 'rgba(255,200,80,0.8)' : 'inherit' }}>
              {pendingRefunds ?? 0}
            </div>
            <div className="gc-stat-sub">queued payout jobs</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">PENDING REFERRALS</div>
            <div className="gc-stat-value" style={{ color: pendingReferrals ? 'rgba(255,200,80,0.8)' : 'inherit' }}>
              {pendingReferrals ?? 0}
            </div>
            <div className="gc-stat-sub">awaiting dispatch</div>
          </div>
        </div>
      </div>

      {/* Live payout mode indicator */}
      <div style={{
        fontFamily: 'IBM Plex Mono',
        fontSize: 11,
        padding: '12px 16px',
        marginBottom: 32,
        background: process.env.ENABLE_LIVE_PAYOUT === 'true'
          ? 'rgba(100,220,120,0.08)'
          : 'rgba(255,200,80,0.06)',
        border: `1px solid ${process.env.ENABLE_LIVE_PAYOUT === 'true' ? 'rgba(100,220,120,0.2)' : 'rgba(255,200,80,0.2)'}`,
        color: process.env.ENABLE_LIVE_PAYOUT === 'true' ? 'rgba(100,220,120,0.9)' : 'rgba(255,200,80,0.8)',
      }}>
        PAYOUT MODE: {process.env.ENABLE_LIVE_PAYOUT === 'true' ? 'LIVE — real SOL transactions' : 'DRY RUN — no real transactions'}
      </div>

      {/* Recent payouts */}
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
        RECENT PAYOUT JOBS
      </div>

      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>CLAIM ID</th>
              <th>WALLET</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
              <th>TX</th>
            </tr>
          </thead>
          <tbody>
            {!recentPayouts || recentPayouts.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={5} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  No payout jobs found.
                </td>
              </tr>
            ) : (
              recentPayouts.map((job: any) => {
                const statusColor =
                  job.status === 'completed' ? 'rgba(100,220,120,0.9)'
                  : job.status === 'queued' ? 'rgba(255,200,80,0.8)'
                  : job.status === 'failed' ? 'rgba(255,80,80,0.8)'
                  : 'rgba(255,255,255,0.4)';
                return (
                  <tr key={job.id} className="lb-table-row">
                    <td className="lb-table-time" style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, padding: '14px 16px' }}>
                      {job.claim_id?.slice(0, 8)}…
                    </td>
                    <td className="lb-table-wallet">
                      {job.wallet ? `${job.wallet.slice(0, 4)}…${job.wallet.slice(-4)}` : '—'}
                    </td>
                    <td className="lb-table-sol">{formatSol(job.amount_sol ?? 0)}</td>
                    <td className="lb-table-time">
                      <span style={{ color: statusColor }}>{(job.status ?? '—').toUpperCase()}</span>
                    </td>
                    <td className="lb-table-time" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {job.tx_hash ? (
                        job.tx_hash.startsWith('DRYRUN_') ? (
                          <span style={{ color: 'var(--status-warn)' }}>{job.tx_hash}</span>
                        ) : (
                          <a
                            href={`https://solscan.io/tx/${job.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--status-info)', textDecoration: 'underline' }}
                          >
                            {job.tx_hash.slice(0, 8)}…{job.tx_hash.slice(-6)}
                          </a>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
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
