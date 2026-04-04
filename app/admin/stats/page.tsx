import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { truncateWallet, formatSol } from '../../../lib/formatters';

export default async function StatsPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  const [claimsRes, payoutsRes, refRes] = await Promise.all([
    supabase.from('claims').select('status'),
    supabase.from('payouts').select('wallet, amount_sol').eq('status', 'paid'),
    supabase.from('referral_conversions').select('*', { count: 'exact', head: true }),
  ]);

  const claims = claimsRes.data || [];
  const payouts = payoutsRes.data || [];

  const statusCounts: Record<string, number> = {};
  for (const c of claims) statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;

  const totalSol = payouts.reduce((s: number, p: any) => s + Number(p.amount_sol || 0), 0);

  // Top wallets
  const walletMap: Record<string, { sol: number; count: number }> = {};
  for (const p of payouts) {
    if (!walletMap[p.wallet]) walletMap[p.wallet] = { sol: 0, count: 0 };
    walletMap[p.wallet].sol += Number(p.amount_sol || 0);
    walletMap[p.wallet].count += 1;
  }
  const topWallets = Object.entries(walletMap)
    .map(([w, v]) => ({ wallet: w, ...v }))
    .sort((a, b) => b.sol - a.sol)
    .slice(0, 10);

  const statuses = ['submitted', 'auto_review', 'needs_manual_review', 'approved', 'rejected'];

  return (
    <div>
      <div className="admin-page-header">ADMIN / ANALYTICS</div>
      <h1 className="admin-page-title">Platform Stats</h1>

      <div className="gc-stats" style={{ marginBottom: 40 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Total Claims</div>
            <div className="gc-stat-value">{claims.length}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Total SOL Paid</div>
            <div className="gc-stat-value">{totalSol.toFixed(4)}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Referral Conversions</div>
            <div className="gc-stat-value">{refRes.count ?? 0}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Approval Rate</div>
            <div className="gc-stat-value">
              {claims.length > 0 ? `${(((statusCounts['approved'] || 0) / claims.length) * 100).toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 16 }}>Claims by Status</h3>
      <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 40 }}>
        {statuses.map((s) => (
          <div key={s} style={{ flex: 1, background: '#030303', padding: 24, textAlign: 'center' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.replace(/_/g, ' ')}
            </div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 36, lineHeight: 1 }}>{statusCounts[s] || 0}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 16 }}>Top Wallets by SOL</h3>
      <table className="lb-table">
        <thead><tr><th>#</th><th>Wallet</th><th>SOL</th><th>Claims</th></tr></thead>
        <tbody>
          {topWallets.map((w, i) => (
            <tr key={w.wallet} className="lb-table-row">
              <td className="lb-table-rank">{i + 1}</td>
              <td className="lb-table-wallet">{truncateWallet(w.wallet)}</td>
              <td className="lb-table-sol">{formatSol(w.sol)}</td>
              <td className="lb-table-claims">{w.count}</td>
            </tr>
          ))}
          {topWallets.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.3)' }}>No payouts yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
