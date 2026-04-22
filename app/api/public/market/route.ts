import { NextResponse } from 'next/server';
import { getMarketSnapshot } from '../../../../lib/integrations/pricing';
import { withPublicCache } from '../../../../lib/http-cache';

// Market data moves in seconds but the user-visible tickers tolerate
// 60s staleness. Saves CoinGecko API calls.
export async function GET() {
  const m = await getMarketSnapshot();
  return withPublicCache(
    NextResponse.json({
      gascoinPriceUsd: m.gascoinPriceUsd,
      marketCapUsd: m.marketCapUsd,
      volume24hUsd: m.volume24hUsd,
      ethPriceUsd: m.ethPriceUsd ?? 0,
      source: m.source,
      updatedAt: new Date().toISOString(),
    }),
    { sMaxAge: 60 },
  );
}
