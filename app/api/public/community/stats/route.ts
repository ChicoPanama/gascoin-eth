import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { getMarketSnapshot } from '../../../../../lib/integrations/pricing';
import { withPublicCache } from '../../../../../lib/http-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return withPublicCache(NextResponse.json({
      total_approved: 0,
      total_eth_paid: 0,
      total_usd_paid: 0,
      unique_countries: 0,
      avg_refund_eth: 0,
      avg_refund_usd: 0,
      eth_price_usd: 3000,
    }), { sMaxAge: 120 });
  }

  const [{ data, error }, market] = await Promise.all([
    supabase
      .from('payouts')
      .select('amount_eth, claims(country)')
      .eq('status', 'paid'),
    getMarketSnapshot().catch(() => ({ ethPriceUsd: 3000 } as any)),
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  const rows = data || [];
  const totalEth = rows.reduce((s: number, r: any) => s + Number(r.amount_eth || 0), 0);
  const count = rows.length;
  const ethPriceUsd = Number(market?.ethPriceUsd || 3000);
  const totalUsdc = totalEth * ethPriceUsd;

  const countries = new Set(
    rows.map((r: any) => r.claims?.country).filter(Boolean)
  );

  return withPublicCache(
    NextResponse.json({
      total_approved: count,
      total_eth_paid: totalEth,
      total_usd_paid: totalUsdc,
      unique_countries: countries.size,
      avg_refund_eth: count > 0 ? totalEth / count : 0,
      avg_refund_usd: count > 0 ? totalUsdc / count : 0,
      eth_price_usd: ethPriceUsd,
    }),
    { sMaxAge: 120 },
  );
}
