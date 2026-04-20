import Link from 'next/link';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { STAGE_ORDER, type AttributionStage } from '../../../lib/attribution';

export const dynamic = 'force-dynamic';

interface FunnelRow {
  source_tweet_id: string;
  stage: AttributionStage;
  event_count: number;
  unique_wallets: number;
  last_event_at: string;
}

export default async function AdminAttributionPage() {
  let rows: FunnelRow[] = [];
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('attribution_funnels')
      .select('*')
      .order('last_event_at', { ascending: false })
      .limit(500);
    rows = (data || []) as FunnelRow[];
  } catch {
    // empty state if DB unreachable
  }

  // Group rows by tweet_id → per-stage counts
  const byTweet = new Map<string, Partial<Record<AttributionStage, FunnelRow>>>();
  for (const r of rows) {
    const t = byTweet.get(r.source_tweet_id) || {};
    t[r.stage] = r;
    byTweet.set(r.source_tweet_id, t);
  }
  const tweets = Array.from(byTweet.entries()).sort((a, b) => {
    const aLast = Object.values(a[1]).reduce((m: string, v) => v.last_event_at > m ? v.last_event_at : m, '');
    const bLast = Object.values(b[1]).reduce((m: string, v) => v.last_event_at > m ? v.last_event_at : m, '');
    return bLast.localeCompare(aLast);
  }).slice(0, 100);

  return (
    <div className="gc-admin">
      <header className="gc-admin-header">
        <h1>Attribution Funnels</h1>
        <p className="gc-admin-sub">
          Conversion attribution per source tweet · {tweets.length} tweet{tweets.length === 1 ? '' : 's'} active
        </p>
      </header>

      {tweets.length === 0 ? (
        <p className="gc-admin-empty">
          No attribution events yet. The payout worker writes events on every
          confirmed payout — data will start flowing once live payouts begin.
        </p>
      ) : (
        <table className="gc-admin-table">
          <thead>
            <tr>
              <th>Tweet</th>
              {STAGE_ORDER.map((s) => <th key={s} className="num">{s.replace('_', ' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {tweets.map(([tweetId, stages]) => (
              <tr key={tweetId}>
                <td className="mono">
                  <a
                    href={`https://x.com/_/status/${tweetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tweetId.slice(0, 16)}…
                  </a>
                </td>
                {STAGE_ORDER.map((s) => {
                  const row = stages[s];
                  return (
                    <td key={s} className="num" title={row ? `${row.unique_wallets} unique wallets` : 'no events'}>
                      {row ? row.event_count : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="gc-admin-sub" style={{ marginTop: 24, fontSize: 12 }}>
        <Link href="/admin/creators">← Creators</Link>
      </p>
    </div>
  );
}
