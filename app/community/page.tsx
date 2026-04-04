import { Nav } from '../../components/Nav';
import { getSupabaseAdmin } from '../../lib/supabase';

async function getCommunityFeed() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('payouts')
      .select('id,claim_id,wallet,amount_sol,tx_hash,status,created_at,claims(tweet_url,users(x_handle))')
      .order('created_at', { ascending: false })
      .limit(100);

    return (data || []).map((p: any) => ({
      id: p.id,
      xHandle: p.claims?.users?.x_handle || '@unknown',
      tweetUrl: p.claims?.tweet_url || '',
      amountSol: Number(p.amount_sol || 0),
      txHash: p.tx_hash || '',
      txUrl: p.tx_hash ? `https://solscan.io/tx/${p.tx_hash}` : '',
      status: p.status || 'queued'
    }));
  } catch {
    return [];
  }
}

export default async function Community(){
  const claims = await getCommunityFeed();
  return <>
    <Nav />
    <h2>Community Proof Feed</h2>
    <table className="table"><thead><tr><th>X Account</th><th>Tweet</th><th>Amount (SOL)</th><th>Tx Hash</th><th>Status</th></tr></thead>
      <tbody>{claims.map((c:any)=><tr key={c.id}><td>{c.xHandle}</td><td><a href={c.tweetUrl} target="_blank">Tweet</a></td><td>{c.amountSol}</td><td><a href={c.txUrl} target="_blank">{c.txHash}</a></td><td><span className="badge">{c.status}</span></td></tr>)}</tbody></table>
  </>;
}
