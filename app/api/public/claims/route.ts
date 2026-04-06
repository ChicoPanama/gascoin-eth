import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export async function GET(){
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from('payouts')
    .select('id,claim_id,wallet,amount_sol,tx_hash,status,created_at,claims(tweet_url,users(x_handle))')
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
    amountSol: Number(p.amount_sol || 0),
    txHash: p.tx_hash || '',
    txUrl: p.tx_hash ? `https://solscan.io/tx/${p.tx_hash}` : '',
    status: p.status || 'queued'
  }));

  return NextResponse.json(rows);
}
