import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { truncateWallet, formatEth } from '../../../lib/formatters';

export default async function StatsPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  // All queries run in parallel. No full table scans:
  // get_claims_status_counts() → GROUP BY status (replaces SELECT status FROM claims)
  // get_payouts_by_wallet()    → GROUP BY wallet ORDER BY total_eth LIMIT 10
  // referral_conversions       → COUNT only (head:true, no rows transferred)
  // gate_stats_view            → small view, already aggregated
  const [claimsCountRes, walletRes, refRes, gateStatsRes] = await Promise.all([
    supabase.rpc('get_claims_status_counts'),
    supabase.rpc('get_payouts_by_wallet', { lim: 10 }),
    supabase.from('referral_conversions').select('*', { count: 'exact', head: true }),
    supabase.from('gate_stats_view').select('gate_id, total, passed, pass_rate_pct'),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of claimsCountRes.data || []) {
    statusCounts[row.status] = Number(row.cnt);
  }
  const totalClaims = Object.values(statusCounts).reduce((s, n) => s + n, 0);

  const topWallets = (walletRes.data || []).map((r: any) => ({
    wallet: r.wallet as string,
    eth: Number(r.total_eth),
    count: Number(r.payout_count),
  }));
  const totalEth = topWallets.reduce((s: number, w: any) => s + w.eth, 0);

  const statuses = ['submitted', 'auto_review', 'needs_manual_review', 'approved', 'rejected'];

  const gateStats = (gateStatsRes.data || []).sort((a: any, b: any) => (b.total || 0) - (a.total || 0));

  return (
    <div>
      <div className="admin-page-header">ADMIN / ANALYTICS</div>
      <h1 className="admin-page-title">Platform Stats</h1>

      <div className="gc-stats" style={{ marginBottom: 40 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Total Claims</div>
            <div className="gc-stat-value">{totalClaims}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Total ETH Paid</div>
            <div className="gc-stat-value">{totalEth.toFixed(4)}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Referral Conversions</div>
            <div className="gc-stat-value">{refRes.count ?? 0}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Approval Rate</div>
            <div className="gc-stat-value">
              {totalClaims > 0 ? `${(((statusCounts['approved'] || 0) / totalClaims) * 100).toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 16 }}>Claims by Status</h3>
      <div style={{ display: 'flex', gap: 1, background: 'rgba(var(--fg-rgb),0.06)', marginBottom: 40 }}>
        {statuses.map((s) => (
          <div key={s} style={{ flex: 1, background: 'var(--card)', padding: 24, textAlign: 'center' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(var(--fg-rgb),0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.replace(/_/g, ' ')}
            </div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 36, lineHeight: 1 }}>{statusCounts[s] || 0}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 16 }}>Gate Pass Rates</h3>
      <div style={{ border: '1px solid var(--line)', marginBottom: 40, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(var(--fg-rgb), 0.04)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Gate</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Volume</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Passed</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pass Rate</th>
            </tr>
          </thead>
          <tbody>
            {gateStats.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>No gate evaluations yet</td></tr>
            )}
            {gateStats.map((g: any) => {
              const rate = Number(g.pass_rate_pct ?? 0);
              const rateColor = rate >= 80 ? 'var(--status-pass)' : rate >= 50 ? 'var(--status-warn)' : 'var(--status-fail)';
              return (
                <tr key={g.gate_id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--fg)', fontWeight: 600 }}>{g.gate_id}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', textAlign: 'right' }}>{g.total}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', textAlign: 'right' }}>{g.passed}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: rateColor }}>
                    {rate.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 16 }}>Top Wallets by ETH</h3>
      <table className="lb-table">
        <thead><tr><th>#</th><th>Wallet</th><th>ETH</th><th>Claims</th></tr></thead>
        <tbody>
          {topWallets.map((w: any, i: number) => (
            <tr key={w.wallet} className="lb-table-row">
              <td className="lb-table-rank">{i + 1}</td>
              <td className="lb-table-wallet">{truncateWallet(w.wallet)}</td>
              <td className="lb-table-sol">{formatEth(w.eth)}</td>
              <td className="lb-table-claims">{w.count}</td>
            </tr>
          ))}
          {topWallets.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'rgba(var(--fg-rgb),0.3)' }}>No payouts yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
