export type MarketSnapshot = {
  gascoinPriceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  solPriceUsd: number;
  source: string;
};

async function fromDexScreener(): Promise<MarketSnapshot | null> {
  const mint = process.env.GASCOIN_MINT;
  if (!mint) return null;
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return null;
  const j = (await r.json()) as any;
  const pair = j?.pairs?.[0];
  if (!pair) return null;

  return {
    gascoinPriceUsd: Number(pair.priceUsd || 0),
    marketCapUsd: Number(pair.marketCap || pair.fdv || 0),
    volume24hUsd: Number(pair?.volume?.h24 || 0),
    solPriceUsd: Number(pair?.priceNative || 0) || 180,
    source: 'dexscreener'
  };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const ds = await fromDexScreener();
  if (ds && ds.gascoinPriceUsd > 0) return ds;
  return {
    gascoinPriceUsd: 0.0042,
    marketCapUsd: 4_200_000,
    volume24hUsd: 518_000,
    solPriceUsd: 188,
    source: 'fallback_mock'
  };
}

export async function getGascoinUsdValue(balanceTokens: number): Promise<number> {
  const m = await getMarketSnapshot();
  return +(balanceTokens * m.gascoinPriceUsd).toFixed(6);
}
