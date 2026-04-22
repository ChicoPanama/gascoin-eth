import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';
import { withPublicCache } from '../../../../lib/http-cache';

export async function GET(req: Request) {
  const rl = await checkRateLimit(`pub_claims:${getClientIp(req)}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return withPublicCache(NextResponse.json([]), { sMaxAge: 120 });
  }

  const { data, error } = await supabase
    .from('payouts')
    .select('id,claim_id,wallet,amount_eth,tx_hash,status,created_at,claims(tweet_url,users(x_handle))')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  const rows = (data || []).map((p: any) => ({
    id: p.id,
    xHandle: p.claims?.users?.x_handle || '@unknown',
    tweetUrl: p.claims?.tweet_url || '',
    amountUsd: null,
    amountEth: Number(p.amount_eth || 0),
    txHash: p.tx_hash || '',
    txUrl: p.tx_hash ? `https://etherscan.io/tx/${p.tx_hash}` : '',
    status: p.status || 'queued'
  }));

  // Proof-of-payout feed: only shows `paid` rows, so a 2-min cache lag is
  // imperceptible — payouts trickle in minutes apart at most.
  return withPublicCache(NextResponse.json(rows), { sMaxAge: 120 });
}
