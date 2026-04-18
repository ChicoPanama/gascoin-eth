export type MarketSnapshot = {
  gascoinPriceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  ethPriceUsd: number;
  source: string;
};

async function fromDexScreener(): Promise<MarketSnapshot | null> {
  const mint = process.env.GASCOIN_CONTRACT_ADDRESS;
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
    ethPriceUsd: Number(pair?.priceNative || 0) || 0,
    source: 'dexscreener'
  };
}

// Fetch live ETH price from CoinGecko (no API key required)
async function fetchEthPrice(): Promise<number> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { cache: 'no-store' });
    if (!r.ok) return 0;
    const j = (await r.json()) as any;
    return Number(j?.ethereum?.usd || 0);
  } catch {
    return 0;
  }
}

import { cacheGetOrFetch } from '../cache';

async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const ds = await fromDexScreener();
  if (ds && ds.gascoinPriceUsd > 0) {
    if (!ds.ethPriceUsd) ds.ethPriceUsd = await fetchEthPrice();
    return ds;
  }

  const ethPrice = await fetchEthPrice();

  return {
    gascoinPriceUsd: 0,
    marketCapUsd: 0,
    volume24hUsd: 0,
    ethPriceUsd: ethPrice,
    source: ethPrice > 0 ? 'coingecko' : 'unavailable'
  };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  return cacheGetOrFetch('price:market', fetchMarketSnapshot, 120);
}

export async function getGascoinUsdValue(balanceTokens: number): Promise<number> {
  const m = await getMarketSnapshot();
  return +(balanceTokens * m.gascoinPriceUsd).toFixed(6);
}
