import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';

// ═══════════════════════════════════════════
// Admin / Engagement Scoring
// ═══════════════════════════════════════════
//
// Surfaces scored_tweets (individual #gascoin posts with their engagement
// metrics and computed point values) joined with wallet_x_links (the
// persistent wallet↔X identity map with quality trends and account
// signals). Answers: "who's earning points from tweets right now, and
// how legit are those tweets?"
//
// Sort by total_points by default. The user can tell from one glance
// whether the highest-earning wallets are real accounts (high
// avg_quality_score, public profile, long-lived account) or potential
// sybils (low quality_score, protected profile, recent account).

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(Math.round(n));
}

function accountAgeDays(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export default async function AdminEngagementPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  // Top-scored tweets (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: tweets } = await supabase
    .from('scored_tweets')
    .select('id, wallet, x_handle, tweet_id, tweet_url, tweet_text, posted_at, impressions, likes, retweets, replies, bookmarks, quality_score, adjusted_points, content_type')
    .gte('last_scored_at', thirtyDaysAgo)
    .order('adjusted_points', { ascending: false })
    .limit(50);

  // Wallet-level aggregate quality — top 50 by avg_quality_score
  const { data: walletLinks } = await supabase
    .from('wallet_x_links')
    .select('wallet, x_handle, avg_quality_score, x_location, bio, x_account_created_at, x_is_protected, last_tweet_scan, is_active')
    .eq('is_active', true)
    .not('avg_quality_score', 'is', null)
    .order('avg_quality_score', { ascending: false })
    .limit(50);

  const tweetRows = tweets || [];
  const walletRows = walletLinks || [];

  // Summary stats
  const totalTweets = tweetRows.length;
  const totalPoints = tweetRows.reduce((sum: number, t: any) => sum + (Number(t.adjusted_points) || 0), 0);
  const avgQuality = tweetRows.length > 0
    ? tweetRows.reduce((s: number, t: any) => s + (Number(t.quality_score) || 0), 0) / tweetRows.length
    : 0;
  const uniqueWallets = new Set(tweetRows.map((t: any) => t.wallet)).size;

  return (
    <div>
      <div className="admin-page-header">ADMIN / ANALYTICS</div>
      <h1 className="admin-page-title">Engagement Scoring</h1>

      {/* ── Top stats ── */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Scored Tweets · 30d</div>
            <div className="gc-stat-value">{totalTweets}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Unique Wallets</div>
            <div className="gc-stat-value">{uniqueWallets}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Points Earned</div>
            <div className="gc-stat-value">{fmt(totalPoints)}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Avg Quality</div>
            <div className="gc-stat-value">{avgQuality.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ── Top scored tweets ── */}
      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 16 }}>
        Top Scored Tweets (30d)
      </h3>
      <div style={{ border: '1px solid var(--line)', overflow: 'auto', marginBottom: 40 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(var(--fg-rgb), 0.04)', borderBottom: '1px solid var(--line)' }}>
              <th style={thStyle}>Handle</th>
              <th style={thStyle}>Type</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Impressions</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Likes</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>RTs</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Replies</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Bookmarks</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Quality</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Points</th>
              <th style={thStyle}>Tweet</th>
            </tr>
          </thead>
          <tbody>
            {tweetRows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...tdStyle, color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>
                  No scored tweets in the last 30 days.
                </td>
              </tr>
            )}
            {tweetRows.map((t: any) => {
              const quality = Number(t.quality_score || 0);
              const qualityColor =
                quality >= 0.8 ? 'var(--status-pass)' :
                quality >= 0.5 ? 'var(--status-warn)' :
                'var(--status-fail)';
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>@{t.x_handle || 'unknown'}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t.content_type || '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(t.impressions)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(t.likes)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(t.retweets)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(t.replies)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(t.bookmarks)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: qualityColor, fontWeight: 700 }}>
                    {quality.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--fg)', fontWeight: 700 }}>
                    {fmt(t.adjusted_points)}
                  </td>
                  <td style={tdStyle}>
                    {t.tweet_url ? (
                      <a
                        href={t.tweet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--status-info)', textDecoration: 'underline', fontSize: 10 }}
                      >
                        view
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Top wallets by quality ── */}
      <h3 style={{ fontFamily: 'Bebas Neue', fontSize: 28, marginBottom: 16 }}>
        Top Wallets by Quality Score
      </h3>
      <div style={{ border: '1px solid var(--line)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(var(--fg-rgb), 0.04)', borderBottom: '1px solid var(--line)' }}>
              <th style={thStyle}>Handle</th>
              <th style={thStyle}>Wallet</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Quality</th>
              <th style={thStyle}>Location</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Age</th>
              <th style={thStyle}>Protected</th>
              <th style={thStyle}>Last Scan</th>
            </tr>
          </thead>
          <tbody>
            {walletRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>
                  No wallet quality data yet.
                </td>
              </tr>
            )}
            {walletRows.map((w: any) => {
              const quality = Number(w.avg_quality_score || 0);
              const qualityColor =
                quality >= 0.8 ? 'var(--status-pass)' :
                quality >= 0.5 ? 'var(--status-warn)' :
                'var(--status-fail)';
              const age = accountAgeDays(w.x_account_created_at);
              return (
                <tr key={w.wallet} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>@{w.x_handle || 'unknown'}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11 }}>
                    {w.wallet ? `${w.wallet.slice(0, 4)}…${w.wallet.slice(-4)}` : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: qualityColor, fontWeight: 700 }}>
                    {quality.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.x_location || '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {age == null ? '—' : `${age}d`}
                  </td>
                  <td style={tdStyle}>
                    {w.x_is_protected ? (
                      <span style={{ color: 'var(--status-fail)', fontWeight: 700 }}>YES</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11 }}>
                    {w.last_tweet_scan ? new Date(w.last_tweet_scan).toLocaleDateString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
        Quality score is computed by the `score-engagement` worker every hour.
        Protected accounts or accounts &lt;30 days old with high point totals
        are strong sybil signals — cross-reference with /admin/intelligence.
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: 'var(--fg)',
  verticalAlign: 'middle',
};
