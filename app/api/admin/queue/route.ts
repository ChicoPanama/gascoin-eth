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
    .from('claims')
    .select('id,status,risk_score,wallet,tweet_url,decision_reason,created_at,users(x_handle)')
    .in('status', ['submitted', 'auto_review', 'ready_for_dispatch', 'needs_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data || []).map((r: any) => ({
    id: r.id,
    xHandle: r.users?.x_handle || '@unknown',
    tweetUrl: r.tweet_url,
    wallet: r.wallet,
    riskScore: Number(r.risk_score || 0),
    decision: r.status,
    reason: r.decision_reason,
    createdAt: r.created_at
  }));

  return NextResponse.json(rows);
}
