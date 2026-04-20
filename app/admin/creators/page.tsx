import Link from 'next/link';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { truncateWallet } from '../../../lib/creator-profile';

export const dynamic = 'force-dynamic';

interface Row {
  handle: string;
  wallet: string;
  is_verified: boolean;
  creator_tier: string | null;
  total_posts: number;
  total_impressions: number;
  total_eth_earned: number;
  total_paid_claims: number;
  avg_quality_score: number | null;
  bio: string | null;
  x_location: string | null;
  linked_at: string | null;
}

export default async function AdminCreatorsPage() {
  let rows: Row[] = [];
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('creator_public_view')
      .select('*')
      .order('total_eth_earned', { ascending: false })
      .limit(200);
    rows = (data || []) as Row[];
  } catch {
    // Non-fatal: empty table if DB not configured (dev scaffolding).
  }

  return (
    <div className="gc-admin">
      <header className="gc-admin-header">
        <h1>Creators</h1>
        <p className="gc-admin-sub">
          Gas Network — {rows.length} registered profile{rows.length === 1 ? '' : 's'}.
          Click a handle to view their public page.
        </p>
      </header>

      <table className="gc-admin-table">
        <thead>
          <tr>
            <th>Handle</th>
            <th>Wallet</th>
            <th>Verified</th>
            <th>Tier</th>
            <th className="num">Posts</th>
            <th className="num">Impressions</th>
            <th className="num">ETH earned</th>
            <th className="num">Paid</th>
            <th className="num">Quality</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="gc-admin-empty">
                No creator profiles yet. Run the sync-creator-profiles worker to populate.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.handle}>
                <td>
                  <Link href={`/creator/${r.handle}`} className="mono">
                    @{r.handle}
                  </Link>
                </td>
                <td className="mono">
                  <a
                    href={`https://etherscan.io/address/${r.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {truncateWallet(r.wallet)}
                  </a>
                </td>
                <td>{r.is_verified ? '✓' : ''}</td>
                <td>{r.creator_tier || '—'}</td>
                <td className="num">{(r.total_posts || 0).toLocaleString()}</td>
                <td className="num">{(r.total_impressions || 0).toLocaleString()}</td>
                <td className="num">{(Number(r.total_eth_earned) || 0).toFixed(4)}</td>
                <td className="num">{r.total_paid_claims || 0}</td>
                <td className="num">
                  {r.avg_quality_score != null ? Math.round(Number(r.avg_quality_score)) : '—'}
                </td>
                <td>{r.x_location || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
