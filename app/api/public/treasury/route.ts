import { NextResponse } from 'next/server';
import { getTreasuryBalances } from '../../../../lib/integrations/ethereum';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rl = await checkRateLimit(`pub_treasury:${getClientIp(req)}`, 10, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  try {
    const t = await getTreasuryBalances();
    const avgPayoutEth = 0.015;
    const capacity = avgPayoutEth > 0 ? Math.floor(t.ethBalance / avgPayoutEth) : 0;

    return NextResponse.json({
      live: true,
      ethBalance: +t.ethBalance.toFixed(4),
      ethUsd: +t.ethUsd.toFixed(2),
      gascoinBalance: +t.gascoinBalance.toFixed(2),
      gascoinUsd: +t.gascoinUsd.toFixed(2),
      totalUsd: +(t.ethUsd + t.gascoinUsd).toFixed(2),
      refundCapacity: capacity,
      wallet: process.env.GASCOIN_TREASURY_WALLET || null,
      fetchedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      live: false,
      ethBalance: 0,
      ethUsd: 0,
      gascoinBalance: 0,
      gascoinUsd: 0,
      totalUsd: 0,
      refundCapacity: 0,
      wallet: null,
      fetchedAt: new Date().toISOString()
    }, { status: 500 });
  }
}
