import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getTreasuryBalances } from '../../../lib/integrations/solana';
import { truncateWallet, formatSol, timeAgo } from '../../../lib/formatters';
import { REFERRAL_CONFIG } from '../../../lib/referral-config';
import { markReferralDispatched, skipReferralReward } from '../../actions/admin/referrals';

export default async function ReferralsPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  const [{ data: conversions }, treasury] = await Promise.all([
    supabase
      .from('referral_conversions')
      .select('id, referrer_wallet, referred_wallet, reward_sol, reward_status, created_at, skip_reason')
      .eq('reward_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100),
    getTreasuryBalances(),
  ]);

  const totalPendingSol = (conversions ?? []).reduce(
    (sum: number, c: any) => sum + (c.reward_sol ?? REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL),
    0
  );

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / OPERATIONS
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          REFERRAL REWARDS
        </div>
      </div>

      {/* Treasury / stats strip */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="gc-stat">
            <div className="gc-stat-label">TREASURY SOL</div>
            <div className="gc-stat-value">{treasury.solBalance.toFixed(3)}</div>
            <div className="gc-stat-sub">${treasury.solUsd.toFixed(2)} USD</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">PENDING QUEUE</div>
            <div className="gc-stat-value">{(conversions ?? []).length}</div>
            <div className="gc-stat-sub">awaiting dispatch</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">PENDING SOL</div>
            <div className="gc-stat-value">{totalPendingSol.toFixed(4)}</div>
            <div className="gc-stat-sub">total to dispatch</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">REWARD RATE</div>
            <div className="gc-stat-value">{REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL}</div>
            <div className="gc-stat-sub">SOL per conversion</div>
          </div>
        </div>
      </div>

      {/* Dispatch queue table */}
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
        DISPATCH QUEUE
      </div>

      <div className="lb-table-wrap" style={{ marginTop: 0 }}>
        <table className="lb-table">
          <thead>
            <tr>
              <th>REFERRER</th>
              <th>REFERRED</th>
              <th>REWARD SOL</th>
              <th>STATUS</th>
              <th>QUEUED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {!conversions || conversions.length === 0 ? (
              <tr className="lb-table-row">
                <td colSpan={6} style={{ padding: '32px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  No pending referral rewards.
                </td>
              </tr>
            ) : (
              conversions.map((conv: any) => (
                <tr key={conv.id} className="lb-table-row">
                  <td className="lb-table-wallet">{truncateWallet(conv.referrer_wallet)}</td>
                  <td className="lb-table-wallet">{truncateWallet(conv.referred_wallet)}</td>
                  <td className="lb-table-sol">{formatSol(conv.reward_sol ?? REFERRAL_CONFIG.REWARD_PER_CONVERSION_SOL)}</td>
                  <td className="lb-table-time">
                    <span style={{ color: 'rgba(255,200,80,0.8)' }}>PENDING</span>
                  </td>
                  <td className="lb-table-time">{timeAgo(conv.created_at)}</td>
                  <td className="lb-table-action">
                    <form style={{ display: 'inline' }} action={async (fd: FormData) => {
                      'use server';
                      const txSig = fd.get('tx_sig') as string;
                      if (txSig) await markReferralDispatched(conv.id, txSig);
                    }}>
                      <input
                        type="text"
                        name="tx_sig"
                        placeholder="TX SIG"
                        style={{
                          fontFamily: 'IBM Plex Mono',
                          fontSize: 10,
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'rgba(255,255,255,0.6)',
                          padding: '4px 8px',
                          width: 160,
                          marginRight: 6,
                        }}
                      />
                      <button type="submit" className="sf-btn-ghost" style={{ padding: '6px 12px', fontSize: 10 }}>
                        DISPATCH
                      </button>
                    </form>
                    <form style={{ display: 'inline', marginLeft: 8 }} action={async (fd: FormData) => {
                      'use server';
                      const reason = fd.get('reason') as string;
                      await skipReferralReward(conv.id, reason || 'admin_skip');
                    }}>
                      <input type="hidden" name="reason" value="admin_skip" />
                      <button type="submit" className="sf-btn-ghost" style={{ padding: '6px 12px', fontSize: 10, color: 'rgba(255,80,80,0.7)', borderColor: 'rgba(255,80,80,0.3)' }}>
                        SKIP
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
