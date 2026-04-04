import { Nav } from '../../components/Nav';
import { AdminQueueClient } from '../../components/AdminQueueClient';
import { getSupabaseAdmin } from '../../lib/supabase';

async function getAdminQueue() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('claims')
      .select('id,status,risk_score,wallet,tweet_url,decision_reason,created_at,users(x_handle)')
      .in('status', ['submitted', 'auto_review', 'needs_manual_review', 'approved'])
      .order('created_at', { ascending: false })
      .limit(100);

    return (data || []).map((r: any) => ({
      id: r.id,
      xHandle: r.users?.x_handle || '@unknown',
      tweetUrl: r.tweet_url,
      wallet: r.wallet,
      riskScore: Number(r.risk_score || 0),
      decision: r.status
    }));
  } catch {
    return [];
  }
}

export default async function Admin(){
  const rows = await getAdminQueue();
  return <>
    <Nav />
    <h2>Admin Queue</h2>
    <AdminQueueClient initialRows={rows} />
  </>;
}
