import { Nav } from '../../components/Nav';
import { getSupabaseAdmin } from '../../lib/supabase';
import { getMarketSnapshot } from '../../lib/integrations/pricing';

async function getTreasury() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('treasury_snapshots')
      .select('sol_balance,usd_value')
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        treasuryUsd: Number(data.usd_value || 0).toLocaleString(),
        solBalance: Number(data.sol_balance || 0).toLocaleString()
      };
    }
  } catch {}
  return { treasuryUsd: '--', solBalance: '--' };
}

async function getGasPrices() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('gas_city_prices')
      .select('city,country,price_per_liter,price_per_gallon_usd')
      .order('ts', { ascending: false })
      .limit(20);
    return (data || []).map((g: any) => ({
      city: g.city,
      country: g.country,
      pricePerLiter: g.price_per_liter,
      pricePerGallonUsd: g.price_per_gallon_usd
    }));
  } catch {
    return [];
  }
}

export default async function Dashboard(){
  const [treasury, market, gas] = await Promise.all([
    getTreasury(),
    getMarketSnapshot(),
    getGasPrices()
  ]);
  return <>
    <Nav />
    <h2>Treasury + Market Dashboard</h2>
    <div className="grid cards-4">
      <div className="card"><div className="k">Treasury USD</div><div className="v">${treasury.treasuryUsd}</div></div>
      <div className="card"><div className="k">SOL Balance</div><div className="v">{treasury.solBalance}</div></div>
      <div className="card"><div className="k">Market Cap</div><div className="v">${Number(market.marketCapUsd).toLocaleString()}</div></div>
      <div className="card"><div className="k">24h Volume</div><div className="v">${Number(market.volume24hUsd).toLocaleString()}</div></div>
    </div>
    <h3>Global Gas Prices</h3>
    <table className="table"><thead><tr><th>City</th><th>Country</th><th>Per Liter</th><th>Per Gallon (USD)</th></tr></thead>
    <tbody>{gas.map((g:any)=><tr key={g.city}><td>{g.city}</td><td>{g.country}</td><td>{g.pricePerLiter}</td><td>{g.pricePerGallonUsd}</td></tr>)}</tbody></table>
  </>;
}
