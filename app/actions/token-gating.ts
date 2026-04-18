'use server';

import { headers, cookies } from 'next/headers';
import { getSupabaseAdmin } from '../../lib/supabase';
import { getTokenBalanceServer } from '../../lib/token-balance';
import { getTierForBalance } from '../../lib/token-tiers';
import { verifyPrivySession } from '../../lib/integrations/privy';

export async function refreshTokenBalance(walletAddress: string) {
  const hdrs = await headers();
  const jar = await cookies();
  const session = await verifyPrivySession(
    hdrs.get('authorization'),
    undefined,
    jar.toString() || hdrs.get('cookie'),
  );
  if (!session?.wallet || session.wallet.toLowerCase() !== walletAddress.toLowerCase()) {
    return { balance: 0, tier: getTierForBalance(0) };
  }

  const result = await getTokenBalanceServer(walletAddress);
  const tier = getTierForBalance(result.uiAmount);

  const supabase = getSupabaseAdmin();
  await supabase.from('wallet_token_cache').upsert({
    wallet_address: walletAddress,
    gascoin_balance: result.uiAmount,
    tier_id: tier.id,
    tier_slug: tier.slug,
    last_checked_at: new Date().toISOString(),
    check_error: result.error ?? null,
  }, { onConflict: 'wallet_address' });

  return { balance: result.uiAmount, tier };
}

export async function getCachedTokenData(walletAddress: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('wallet_token_cache').select('*').eq('wallet_address', walletAddress).maybeSingle();
    return data;
  } catch {
    return null;
  }
}
