import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export async function GET(){
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('treasury_snapshots')
      .select('sol_balance,usd_value,gascoin_balance,gascoin_usd_value,ts')
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const solBalance = Number(data.sol_balance || 0);
      const usdValue = Number(data.usd_value || 0);
      const avgPayoutSol = 0.05;
      const capacity = avgPayoutSol > 0 ? Math.floor(solBalance / avgPayoutSol) : 0;
      return NextResponse.json({
        treasuryUsd: usdValue.toLocaleString(),
        solBalance: solBalance.toLocaleString(),
        refundCapacity: `${capacity.toLocaleString()} claims`,
        updatedAt: data.ts
      });
    }
  } catch {}

  return NextResponse.json({
    treasuryUsd: '--',
    solBalance: '--',
    refundCapacity: '--',
    updatedAt: new Date().toISOString()
  });
}
