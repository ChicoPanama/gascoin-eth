import { NextResponse } from 'next/server';
import { getMarketSnapshot } from '../../../../lib/integrations/pricing';

export async function GET(){
  const m = await getMarketSnapshot();
  return NextResponse.json({
    gascoinPriceUsd: m.gascoinPriceUsd,
    marketCapUsd: m.marketCapUsd,
    volume24hUsd: m.volume24hUsd,
    ethPriceUsd: m.ethPriceUsd ?? 0,
    source: m.source,
    updatedAt: new Date().toISOString()
  });
}
