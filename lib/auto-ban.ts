import { getSupabaseAdmin } from './supabase';
import { writeBanState } from './mem0';

/**
 * Auto-ban system — catches sybil attackers and serial fraudsters.
 *
 * Designed to be forgiving of honest mistakes but firm on patterns:
 * - A user who submits a bad receipt once is fine — they get rejected and can try again
 * - A user who submits 5+ bad receipts in 30 days is farming
 * - A user who submits 3+ duplicate receipts is running a sybil attack
 * - A user with 10+ lifetime rejections is not making mistakes anymore
 *
 * Admins can always unban manually via the user_bans table.
 */

const REJECT_THRESHOLD_30D = 5;        // 5 rejections in 30 days = pattern, not mistakes
const DUPLICATE_THRESHOLD = 3;         // 3 duplicate receipt attempts = deliberate reuse
const LIFETIME_REJECT_THRESHOLD = 10;  // 10 lifetime rejections = serial bad actor
// Accounts with zero approvals are more likely farming. Apply tighter windows.
const REJECT_THRESHOLD_14D_ZERO_APPROVALS = 3; // 3 rejections in 14 days with no approved history
const NEEDS_REVIEW_THRESHOLD_14D = 5;  // 5 needs_review flags in 14 days = repeated near-misses

export async function checkAndAutoBan(
  userId: string,
  reason: string,
  wallet?: string,
): Promise<{ banned: boolean; reason?: string }> {
  const supabase = getSupabaseAdmin();

  // Check if already banned
  const { data: existing } = await supabase
    .from('user_bans')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (existing) return { banned: true, reason: 'already_banned' };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  // Count rejected claims in last 30 days
  const { count: recentRejects } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .gte('created_at', thirtyDaysAgo);

  // Count duplicate receipt attempts (claim_receipts with matching hashes from different claims)
  const { count: dupeAttempts } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', userId)
    .eq('action', 'claim_submitted')
    .gte('created_at', thirtyDaysAgo)
    .contains('payload_json', { duplicateHash: true });

  // Lifetime rejections
  const { count: lifetimeRejects } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'rejected');

  // Lifetime approvals — used to tighten thresholds for zero-approval accounts
  const { count: lifetimeApprovals } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['approved', 'paid', 'ready_for_dispatch']);

  // Repeated near-misses: needs_review flags in last 14 days
  const { count: recentNeedsReview14d } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'needs_review')
    .gte('created_at', fourteenDaysAgo);

  // Rejections in last 14 days (tighter window for zero-approval accounts)
  const { count: recentRejects14d } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .gte('created_at', fourteenDaysAgo);

  let banReason: string | null = null;

  if ((recentRejects ?? 0) >= REJECT_THRESHOLD_30D) {
    banReason = `auto_ban: ${recentRejects} rejected claims in 30 days (threshold: ${REJECT_THRESHOLD_30D})`;
  } else if ((dupeAttempts ?? 0) >= DUPLICATE_THRESHOLD) {
    banReason = `auto_ban: ${dupeAttempts} duplicate receipt attempts (threshold: ${DUPLICATE_THRESHOLD})`;
  } else if ((lifetimeRejects ?? 0) >= LIFETIME_REJECT_THRESHOLD) {
    banReason = `auto_ban: ${lifetimeRejects} lifetime rejections (threshold: ${LIFETIME_REJECT_THRESHOLD})`;
  } else if ((lifetimeApprovals ?? 0) === 0 && (recentRejects14d ?? 0) >= REJECT_THRESHOLD_14D_ZERO_APPROVALS) {
    banReason = `auto_ban: ${recentRejects14d} rejections in 14 days with zero approvals (threshold: ${REJECT_THRESHOLD_14D_ZERO_APPROVALS})`;
  } else if ((recentNeedsReview14d ?? 0) >= NEEDS_REVIEW_THRESHOLD_14D) {
    banReason = `auto_ban: ${recentNeedsReview14d} needs_review flags in 14 days — repeated near-misses (threshold: ${NEEDS_REVIEW_THRESHOLD_14D})`;
  }

  if (!banReason) return { banned: false };

  // Execute ban
  await supabase.from('user_bans').insert({
    user_id: userId,
    reason: `${banReason}. Trigger: ${reason}`,
    active: true,
    created_by: 'auto_ban_system',
  });

  await supabase.from('audit_logs').insert({
    actor_type: 'system',
    actor_id: 'auto_ban_system',
    action: 'user_auto_banned',
    target_type: 'user',
    target_id: userId,
    payload_json: {
      reason: banReason,
      trigger: reason,
      recentRejects: recentRejects ?? 0,
      recentRejects14d: recentRejects14d ?? 0,
      recentNeedsReview14d: recentNeedsReview14d ?? 0,
      dupeAttempts: dupeAttempts ?? 0,
      lifetimeRejects: lifetimeRejects ?? 0,
      lifetimeApprovals: lifetimeApprovals ?? 0,
    },
  });

  // Record ban in mem0 under INTELLIGENCE_AGGREGATOR agent for clean audit trail
  if (wallet) {
    writeBanState(wallet, {
      state: 'banned',
      reason: banReason,
      triggeredBy: 'auto_ban_system',
    }).catch(() => {});
  }

  return { banned: true, reason: banReason };
}
