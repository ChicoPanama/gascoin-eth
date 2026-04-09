import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { getMarketSnapshot } from '../../../../../lib/integrations/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({
      total_approved: 0,
      total_sol_paid: 0,
      total_usdc_paid: 0,
      unique_countries: 0,
      avg_refund_sol: 0,
      avg_refund_usdc: 0,
      sol_price_usd: 170,
    });
  }

  const [{ data, error }, market] = await Promise.all([
    supabase
      .from('payouts')
      .select('amount_sol, claims(country)')
      .eq('status', 'paid'),
    getMarketSnapshot().catch(() => ({ solPriceUsd: 170 } as any)),
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  const rows = data || [];
  const totalSol = rows.reduce((s: number, r: any) => s + Number(r.amount_sol || 0), 0);
  const count = rows.length;
  const solPriceUsd = Number(market?.solPriceUsd || 170);
  const totalUsdc = totalSol * solPriceUsd;

  const countries = new Set(
    rows.map((r: any) => r.claims?.country).filter(Boolean)
  );

  return NextResponse.json({
    total_approved: count,
    total_sol_paid: totalSol,
    total_usdc_paid: totalUsdc,
    unique_countries: countries.size,
    avg_refund_sol: count > 0 ? totalSol / count : 0,
    avg_refund_usdc: count > 0 ? totalUsdc / count : 0,
    sol_price_usd: solPriceUsd,
  });
}
