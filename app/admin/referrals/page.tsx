import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getTreasuryBalances } from '../../../lib/integrations/ethereum';
import { truncateWallet, formatSol, timeAgo } from '../../../lib/formatters';
import { REFERRAL_CONFIG, SKIP_REASON_LABELS } from '../../../lib/referral-config';
import { markReferralDispatched, skipReferralReward } from '../../actions/admin/referrals';

export default async function ReferralsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'DISPATCH';

  const supabase = getSupabaseAdmin();

  const statusFilter = tab === 'DISPATCH' ? 'ready_for_dispatch'
    : tab === 'PENDING' ? 'pending'
    : tab === 'DISPATCHED' ? 'dispatched'
    : tab === 'SKIPPED' ? 'skipped'
    : undefined;

  const query = supabase
    .from('referral_conversions')
    .select('id, referrer_wallet, referred_wallet, reward_sol, reward_status, reward_tx_signature, skip_reason, created_at, dispatched_at')
    .order('created_at', { ascending: tab === 'DISPATCH' });

  if (statusFilter) query.eq('reward_status', statusFilter);

  const [{ data: conversions }, treasury] = await Promise.all([
    query.limit(100),
    getTreasuryBalances(),
  ]);

  const readyCount = (conversions || []).filter((c: any) => c.reward_status === 'ready_for_dispatch').length;
  const totalPendingPoints = readyCount * REFERRAL_CONFIG.POINTS_PER_CONVERSION;

  // Get counts for tabs
  const { count: dispatchCount } = await supabase.from('referral_conversions').select('*', { count: 'exact', head: true }).eq('reward_status', 'ready_for_dispatch');
  const { count: pendingCount } = await supabase.from('referral_conversions').select('*', { count: 'exact', head: true }).eq('reward_status', 'pending');

  return (
    <div>
      <div className="admin-page-header">ADMIN / REFERRAL REWARDS</div>
      <h1 className="admin-page-title">Referral Dispatch</h1>

      {/* Stats */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Ready to Dispatch</div>
            <div className="gc-stat-value" style={{ color: 'rgba(100,220,120,0.9)' }}>{dispatchCount ?? 0}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Pending Points</div>
            <div className="gc-stat-value">{totalPendingPoints.toLocaleString()}</div>
            <div className="gc-stat-sub">Points to award</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Treasury</div>
            <div className="gc-stat-value">{treasury.ethBalance.toFixed(4)}</div>
            <div className="gc-stat-sub">ETH available</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Reward Rate</div>
            <div className="gc-stat-value">{REFERRAL_CONFIG.POINTS_PER_CONVERSION}</div>
            <div className="gc-stat-sub">Points per conversion</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['DISPATCH', 'PENDING', 'DISPATCHED', 'SKIPPED', 'ALL'].map((t) => (
          <Link key={t} href={`/admin/referrals?tab=${t}`}
            className={`cf-filter-tab${tab === t ? ' cf-filter-tab--active' : ''}`}>
            {t}{t === 'DISPATCH' && dispatchCount ? ` (${dispatchCount})` : ''}
          </Link>
        ))}
      </div>

      {/* Table */}
      <table className="lb-table">
        <thead>
          <tr>
            <th>Referrer</th>
            <th>Referred</th>
            <th>Reward</th>
            <th>Status</th>
            <th>When</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(!conversions || conversions.length === 0) ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'rgba(var(--fg-rgb),0.3)', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
              {tab === 'DISPATCH' ? 'No referral rewards ready for dispatch' : 'No conversions match this filter'}
            </td></tr>
          ) : conversions.map((c: any) => {
            const canDispatch = c.reward_status === 'ready_for_dispatch';
            const statusColors: Record<string, string> = {
              ready_for_dispatch: 'rgba(100,220,120,0.9)',
              pending: 'rgba(255,200,80,0.8)',
              dispatched: 'rgba(100,180,255,0.9)',
              skipped: 'rgba(255,80,80,0.7)',
            };

            return (
              <tr key={c.id} className="lb-table-row">
                <td className="lb-table-wallet">{truncateWallet(c.referrer_wallet)}</td>
                <td className="lb-table-wallet">{truncateWallet(c.referred_wallet)}</td>
                <td className="lb-table-sol">{REFERRAL_CONFIG.POINTS_PER_CONVERSION} PTS</td>
                <td>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fontWeight: 600, padding: '3px 8px', border: `1px solid ${statusColors[c.reward_status] || 'rgba(var(--fg-rgb),0.2)'}`, color: statusColors[c.reward_status] || 'rgba(var(--fg-rgb),0.4)' }}>
                    {c.reward_status === 'ready_for_dispatch' ? 'READY' : c.reward_status.toUpperCase()}
                  </span>
                  {c.skip_reason && (
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(var(--fg-rgb),0.25)', marginTop: 4 }}>
                      {SKIP_REASON_LABELS[c.skip_reason] || c.skip_reason}
                    </div>
                  )}
                </td>
                <td className="lb-table-time">{timeAgo(c.created_at)}</td>
                <td>
                  {canDispatch && (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <form action={async () => {
                        'use server';
                        await markReferralDispatched(c.id, `MANUAL_${Date.now()}`);
                      }}>
                        <button type="submit" className="sf-btn-solid" style={{ padding: '4px 12px', fontSize: 9 }}>
                          APPROVE {REFERRAL_CONFIG.POINTS_PER_CONVERSION} PTS
                        </button>
                      </form>
                      <form action={async () => {
                        'use server';
                        await skipReferralReward(c.id, 'admin_skip');
                      }}>
                        <button type="submit" className="sf-btn-ghost" style={{ padding: '4px 12px', fontSize: 9 }}>SKIP</button>
                      </form>
                    </div>
                  )}
                  {c.reward_status === 'dispatched' && c.reward_tx_signature && (
                    <a href={`https://etherscan.io/tx/${c.reward_tx_signature}`} target="_blank" rel="noopener"
                      style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(var(--fg-rgb),0.4)' }}>
                      View TX →
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 24, fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(var(--fg-rgb),0.2)' }}>
        Pipeline: Referral click → referred user approved → worker verifies eligibility → AI ring detection → points awarded
      </div>
    </div>
  );
}
