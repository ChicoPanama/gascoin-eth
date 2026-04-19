import { getMarketSnapshot } from '../lib/integrations/pricing';
import { getSupabaseAdmin } from '../lib/supabase';

export async function LiveTreasuryBar(){
  let treasuryUsd = '--';
  let solBalance = '--';
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('treasury_snapshots')
      .select('eth_balance,usd_value')
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      treasuryUsd = `$${Number(data.usd_value || 0).toLocaleString()}`;
      solBalance = `${Number(data.eth_balance || 0).toLocaleString()} ETH`;
    }
  } catch {}

  const market = await getMarketSnapshot();

  return <div className="grid cards-4" style={{marginBottom:8}}>
    <div className="card">
      <div className="k">Treasury</div>
      <div className="v">{treasuryUsd}</div>
    </div>
    <div className="card">
      <div className="k">ETH Balance</div>
      <div className="v">{solBalance}</div>
    </div>
    <div className="card">
      <div className="k">Market Cap</div>
      <div className="v">${Number(market.marketCapUsd).toLocaleString()}</div>
    </div>
    <div className="card">
      <div className="k">24h Volume</div>
      <div className="v">${Number(market.volume24hUsd).toLocaleString()}</div>
    </div>
  </div>
}
