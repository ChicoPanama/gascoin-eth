import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { requireReviewer } from '../../../../lib/reviewer-auth';

// SECURITY: Admin queue requires reviewer/admin authentication.
// Hardened 2026-04-06 — was previously unauthenticated (CRITICAL).
export async function GET(req: Request){
  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

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
    // SECURITY: Do not leak DB error details to client
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
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
