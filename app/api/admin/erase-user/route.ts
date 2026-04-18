import { NextResponse } from 'next/server';
import { requireReviewer } from '../../../../lib/reviewer-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { deleteEntityMemories } from '../../../../lib/mem0';

/**
 * POST /api/admin/erase-user
 *
 * GDPR Right-to-Erasure endpoint. Deletes or anonymizes ALL PII for a user.
 * Requires admin role.
 *
 * Body: { user_id: string, wallet?: string, reason: string }
 *
 * Deletion order:
 *   1. claim_receipts (via claim_ids)        — DELETE
 *   2. gate_results  (via claim_ids)         — DELETE
 *   3. claims                                 — ANONYMIZE
 *   4. engagement_points (by wallet)          — DELETE
 *   5. scored_tweets (by wallet)              — DELETE
 *   6. wallet_x_links (by wallet)             — DELETE
 *   7. user_bans (by user_id)                 — DELETE
 *   8. users row                              — ANONYMIZE
 *   9. referrals (referrer + referred)        — DELETE
 *  10. referral_conversions (by user_id)      — DELETE
 *
 * Writes an audit log entry on completion.
 */
export async function POST(req: Request) {
  // ── Auth: admin only ────────────────────────────────────────────────────────
  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (reviewer.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { user_id?: string; wallet?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const { user_id, wallet, reason } = body;

  if (!user_id || typeof user_id !== 'string' || !user_id.trim()) {
    return NextResponse.json({ ok: false, error: 'user_id_required' }, { status: 400 });
  }
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return NextResponse.json({ ok: false, error: 'reason_required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // ── Step 0: Resolve wallet if not provided ──────────────────────────────────
  let resolvedWallet = wallet?.trim() || null;
  if (!resolvedWallet) {
    // Try claims first (most likely source)
    const { data: claimRow } = await supabase
      .from('claims')
      .select('wallet')
      .eq('user_id', user_id)
      .limit(1)
      .maybeSingle();
    resolvedWallet = claimRow?.wallet || null;
  }
  if (!resolvedWallet) {
    // Fallback: wallet_links table
    const { data: linkRow } = await supabase
      .from('wallet_links')
      .select('wallet')
      .eq('user_id', user_id)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();
    resolvedWallet = linkRow?.wallet || null;
  }
  if (!resolvedWallet) {
    // Last resort: wallet_x_links keyed by x_user_id via users table
    const { data: userRow } = await supabase
      .from('users')
      .select('x_user_id')
      .eq('id', user_id)
      .maybeSingle();
    if (userRow?.x_user_id) {
      const { data: wxLink } = await supabase
        .from('wallet_x_links')
        .select('wallet')
        .eq('x_user_id', userRow.x_user_id)
        .limit(1)
        .maybeSingle();
      resolvedWallet = wxLink?.wallet || null;
    }
  }

  const erased: Record<string, number> = {
    receipts: 0,
    gate_results: 0,
    claims: 0,
    engagement_points: 0,
    scored_tweets: 0,
    wallet_x_links: 0,
    wallet_token_cache: 0,
    user_metrics_history: 0,
    user_bans: 0,
    users: 0,
    referrals: 0,
    referral_conversions: 0,
    mem0_memories: 0,
  };

  // ── Step 1 & 2: Find claim_ids → delete claim_receipts + gate_results ───────
  const { data: claimRows } = await supabase
    .from('claims')
    .select('id')
    .eq('user_id', user_id);

  const claimIds: string[] = (claimRows || []).map((r: any) => r.id);

  if (claimIds.length > 0) {
    // 1. Delete claim_receipts
    await supabase.from('claim_receipts').delete().in('claim_id', claimIds);
    erased.receipts = claimIds.length;

    // 2. Delete gate_results
    await supabase.from('gate_results').delete().in('claim_id', claimIds);
    erased.gate_results = claimIds.length;
  }

  // ── Step 3: Anonymize claims ────────────────────────────────────────────────
  if (claimIds.length > 0) {
    await supabase
      .from('claims')
      .update({
        wallet: 'ERASED',
        user_id: null,
        tweet_url: 'ERASED',
        decision_reason: 'gdpr_erasure',
        nonce: 'ERASED',
        ip_country: null,
      })
      .in('id', claimIds);
    erased.claims = claimIds.length;
  }

  // ── Steps 4–7: wallet-based deletions ──────────────────────────────────────
  if (resolvedWallet) {
    // 4. engagement_points
    await supabase.from('engagement_points').delete().eq('wallet', resolvedWallet);
    erased.engagement_points = 1;

    // 5. scored_tweets
    await supabase.from('scored_tweets').delete().eq('wallet', resolvedWallet);
    erased.scored_tweets = 1;

    // 6. wallet_x_links
    await supabase.from('wallet_x_links').delete().eq('wallet', resolvedWallet);
    erased.wallet_x_links = 1;

    // 6a. wallet_token_cache
    await supabase.from('wallet_token_cache').delete().eq('wallet', resolvedWallet);
    erased.wallet_token_cache = 1;

    // 6b. user_metrics_history
    await supabase.from('user_metrics_history').delete().eq('wallet', resolvedWallet);
    erased.user_metrics_history = 1;

    // 6c. mem0 entity memories (GDPR: delete all AI memory for this wallet)
    const mem0Result = await deleteEntityMemories('wallet', resolvedWallet).catch(() => ({ deleted: 0 }));
    erased.mem0_memories = mem0Result.deleted;
  }

  // 7. user_bans
  await supabase.from('user_bans').delete().eq('user_id', user_id);
  erased.user_bans = 1;

  // ── Step 8: Anonymize users row ─────────────────────────────────────────────
  await supabase
    .from('users')
    .update({
      x_handle: '[deleted]',
      x_user_id: 'ERASED',
      trust_score: 0,
    })
    .eq('id', user_id);
  erased.users = 1;

  // ── Step 9: referrals (referrer + referred) ─────────────────────────────────
  await supabase.from('referrals').delete().eq('referrer_user_id', user_id);
  await supabase.from('referrals').delete().eq('referred_user_id', user_id);
  erased.referrals = 1;

  // ── Step 10: referral_conversions ───────────────────────────────────────────
  await supabase.from('referral_conversions').delete().eq('user_id', user_id);
  erased.referral_conversions = 1;

  // ── Audit log ───────────────────────────────────────────────────────────────
  await supabase.from('audit_logs').insert({
    actor_type: 'admin',
    actor_id: reviewer.xHandle,
    action: 'gdpr_erasure',
    target_type: 'user',
    target_id: user_id,
    payload_json: {
      user_id,
      wallet: resolvedWallet,
      reason,
      erased,
      via: reviewer.via,
    },
  });

  return NextResponse.json({ ok: true, erased });
}
