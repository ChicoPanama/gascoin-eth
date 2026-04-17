import { NextResponse } from 'next/server';
import { getTreasuryBalances } from '../../../../lib/integrations/solana';
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
    const avgPayoutSol = 0.05;
    const capacity = avgPayoutSol > 0 ? Math.floor(t.solBalance / avgPayoutSol) : 0;

    return NextResponse.json({
      live: true,
      solBalance: +t.solBalance.toFixed(4),
      solUsd: +t.solUsd.toFixed(2),
      gascoinBalance: +t.gascoinBalance.toFixed(2),
      gascoinUsd: +t.gascoinUsd.toFixed(2),
      totalUsd: +(t.solUsd + t.gascoinUsd).toFixed(2),
      refundCapacity: capacity,
      wallet: process.env.GASCOIN_TREASURY_WALLET || null,
      fetchedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      live: false,
      solBalance: 0,
      solUsd: 0,
      gascoinBalance: 0,
      gascoinUsd: 0,
      totalUsd: 0,
      refundCapacity: 0,
      wallet: null,
      fetchedAt: new Date().toISOString()
    }, { status: 500 });
  }
}
