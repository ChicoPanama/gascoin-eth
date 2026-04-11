import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { requireReviewer } from '../../../../lib/reviewer-auth';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getCachedFlags } from '../../../../lib/mem0';

// SECURITY: Admin queue requires reviewer/admin authentication.
// Hardened 2026-04-06 — was previously unauthenticated (CRITICAL).
export async function GET(req: Request){
  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // SECURITY: Rate limit per reviewer to prevent abuse
  const rl = await checkRateLimit(`admin_queue:${reviewer.xId}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
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

  // Batch-fetch mem0 cached flags for all unique wallets
  const walletSet = [...new Set((data || []).map((r: any) => r.wallet).filter(Boolean))];
  const flagsMap = new Map<string, any>();
  await Promise.all(walletSet.map(async (w: string) => {
    const flags = await getCachedFlags(w);
    if (flags) flagsMap.set(w, flags);
  }));

  const rows = (data || []).map((r: any) => ({
    id: r.id,
    xHandle: r.users?.x_handle || '@unknown',
    tweetUrl: r.tweet_url,
    wallet: r.wallet,
    riskScore: Number(r.risk_score || 0),
    decision: r.status,
    reason: r.decision_reason,
    createdAt: r.created_at,
    mem0Flags: flagsMap.get(r.wallet)?.riskFlags || [],
    trustTrajectory: flagsMap.get(r.wallet)?.trajectory || 'unknown',
  }));

  return NextResponse.json(rows);
}
