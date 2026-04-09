import { Nav } from '../../components/Nav';
import { getSupabaseAdmin } from '../../lib/supabase';
import { LiveStatsBar, TreasuryChart, SubmissionFeed, GateStatusPanel } from '../../components/DashboardLive';

async function getDashboardData() {
  let refundsToday = 0;
  let totalPaid = 0;
  let queueDepth = 0;

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000).toISOString();

    const [todayRes, totalRes, queueRes] = await Promise.all([
      supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('updated_at', dayAgo),
      supabase
        .from('payouts')
        .select('amount_sol')
        .eq('status', 'paid'),
      supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'auto_review', 'needs_manual_review']),
    ]);

    refundsToday = todayRes.count ?? 0;
    totalPaid = (totalRes.data || []).reduce((s: number, r: any) => s + Number(r.amount_sol || 0), 0);
    queueDepth = queueRes.count ?? 0;
  } catch {}

  return { refundsToday, totalPaid, queueDepth };
}

export default async function Dashboard() {
  const { refundsToday, totalPaid, queueDepth } = await getDashboardData();

  return (
    <div className="container">
      <Nav />

      <div className="gc-dash-header">
        <h1 className="gc-dash-title">
          <span className="gc-dash-title-icon-wrap" aria-hidden>
            <img src="/icons/treasury-chest.jpg" alt="" className="gc-dash-title-icon" />
          </span>
          TREASURY
        </h1>
      </div>

      {/* Zone 1 — Stats */}
      <LiveStatsBar
        refundsToday={refundsToday}
        totalPaid={totalPaid}
        queueDepth={queueDepth}
      />

      {/* Zone 2 — Chart */}
      <div className="gc-dash-section">
        <div className="gc-section-num">7-Day Treasury Balance</div>
        <TreasuryChart />
      </div>

      {/* Zone 3 + 4 — Feed + Gates */}
      <div className="gc-dash-split">
        <SubmissionFeed />
        <GateStatusPanel />
      </div>
    </div>
  );
}
