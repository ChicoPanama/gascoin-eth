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

      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— Live Treasury Transparency · Real-Time Payout Health</span>
        </div>
        <h1 className="lb-title lb-title--iconed">
          <span className="lb-title-icon-wrap" aria-hidden>
            <img src="/icons/treasury-chest.jpg" alt="" className="lb-title-icon" />
          </span>
          TREASURY
        </h1>
        <p className="gt-header-body">
          Track treasury balances, payout throughput, queue pressure, and verification pipeline status in one live control surface.
        </p>
        <div className="lb-header__live">
          <span className="lb-pulse" />
          <span className="lb-live-label">LIVE TREASURY FEED</span>
        </div>
      </header>

      {/* Season 1 banner — only renders when ENABLE_LIVE_PAYOUT !== 'true'. */}
      {/* When you go live: flip ENABLE_LIVE_PAYOUT=true in Vercel and this disappears automatically. */}
      {process.env.ENABLE_LIVE_PAYOUT !== 'true' && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.08em',
          padding: '14px 20px',
          marginBottom: 32,
          background: 'rgba(255,200,80,0.06)',
          border: '1px solid rgba(255,200,80,0.25)',
          color: 'rgba(255,220,140,0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(255,200,80,0.15)', border: '1px solid rgba(255,200,80,0.3)', letterSpacing: '0.15em' }}>
            SEASON 1
          </span>
          <span>
            Points-only mode. Treasury activates at token launch — current balances reflect dry-run accounting only.
          </span>
        </div>
      )}

      {/* Zone 1 — Stats */}
      <LiveStatsBar
        refundsToday={refundsToday}
        totalPaid={totalPaid}
        queueDepth={queueDepth}
      />

      {/* Zone 2 — Chart */}
      <div className="gc-dash-section">
        <div className="gc-section-num">7-Day Treasury Value (USDC)</div>
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
