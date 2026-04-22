import { NextResponse } from 'next/server';
import { getTreasuryBalances } from '../../../../lib/integrations/ethereum';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';
import { withPublicCache } from '../../../../lib/http-cache';
import { withRuntimeCache } from '../../../../lib/runtime-cache';

export const dynamic = 'force-dynamic';

type TreasuryPayload = {
  live: true;
  ethBalance: number;
  ethUsd: number;
  gascoinBalance: number;
  gascoinUsd: number;
  totalUsd: number;
  refundCapacity: number;
  wallet: string | null;
  fetchedAt: string;
};

async function loadTreasuryPayload(): Promise<TreasuryPayload> {
  const t = await getTreasuryBalances();
  const avgPayoutEth = 0.015;
  const capacity = avgPayoutEth > 0 ? Math.floor(t.ethBalance / avgPayoutEth) : 0;
  return {
    live: true,
    ethBalance: +t.ethBalance.toFixed(4),
    ethUsd: +t.ethUsd.toFixed(2),
    gascoinBalance: +t.gascoinBalance.toFixed(2),
    gascoinUsd: +t.gascoinUsd.toFixed(2),
    totalUsd: +(t.ethUsd + t.gascoinUsd).toFixed(2),
    refundCapacity: capacity,
    wallet: process.env.GASCOIN_TREASURY_WALLET || null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const rl = await checkRateLimit(`pub_treasury:${getClientIp(req)}`, 10, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  try {
    // Two-tier: Runtime Cache collapses Alchemy RPC hits across concurrent
    // requests in the same region (60s), CDN cache fans it out globally.
    // Tag `treasury` so payout-worker can expireTag after a successful
    // payout lands on-chain.
    const payload = await withRuntimeCache(
      'public:treasury:v1',
      loadTreasuryPayload,
      { ttl: 60, tags: ['treasury'], name: 'public-treasury' },
    );

    return withPublicCache(NextResponse.json(payload), { sMaxAge: 60 });
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
