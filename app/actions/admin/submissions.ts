'use server';

import { verifyAdminSession } from '../admin-auth';
import { logAdminAction } from '../../../lib/audit-logger';
import { getSupabaseAdmin } from '../../../lib/supabase';

async function requireAdmin() {
  const session = await verifyAdminSession();
  if (!session.valid || !session.walletAddress) throw new Error('Unauthorized');
  return session.walletAddress;
}

export async function approveSubmission(claimId: string, solAmount: number, note?: string) {
  const adminWallet = await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data: before } = await supabase.from('claims').select('*').eq('id', claimId).single();

  // Guard: only allow dispatch from these statuses
  const allowedStatuses = ['ready_for_dispatch', 'needs_review', 'rejected'];
  if (!before || !allowedStatuses.includes(before.status)) {
    throw new Error(`Cannot approve claim in status: ${before?.status}`);
  }

  await supabase.from('claims').update({
    status: 'approved',
    decision_reason: note || 'admin_dispatched',
    updated_at: new Date().toISOString(),
  }).eq('id', claimId);

  // Record status transition
  await supabase.from('claim_status_events').insert({
    claim_id: claimId,
    from_status: before.status,
    to_status: 'approved',
    actor_type: 'admin',
    actor_id: adminWallet,
    reason: note || 'admin_dispatched',
  });

  // Create payout job — this is the ONLY path payout jobs get created
  await supabase.from('payout_jobs').upsert({
    claim_id: claimId,
    wallet: before.wallet,
    amount_sol: solAmount,
    status: 'queued',
  }, { onConflict: 'claim_id' });

  await logAdminAction({
    adminWallet,
    action: 'approve_submission',
    targetType: 'claim',
    targetId: claimId,
    beforeState: before,
    afterState: { status: 'approved', sol_amount: solAmount },
    metadata: { note },
  });
}

export async function rejectSubmission(claimId: string, reason: string) {
  const adminWallet = await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data: before } = await supabase.from('claims').select('*').eq('id', claimId).single();

  await supabase.from('claims').update({
    status: 'rejected',
    decision_reason: reason,
    updated_at: new Date().toISOString(),
  }).eq('id', claimId);

  await supabase.from('claim_status_events').insert({
    claim_id: claimId,
    from_status: before?.status || 'unknown',
    to_status: 'rejected',
    actor_type: 'admin',
    actor_id: adminWallet,
    reason,
  });

  await logAdminAction({ adminWallet, action: 'reject_submission', targetType: 'claim', targetId: claimId, beforeState: before, afterState: { status: 'rejected', reason } });
}

export async function overrideGate(claimId: string, gateName: string, passed: boolean, reason: string) {
  const adminWallet = await requireAdmin();
  const supabase = getSupabaseAdmin();

  await supabase.from('gate_results').upsert({ claim_id: claimId, gate_name: gateName, passed, reason_code: reason, score: null }, { onConflict: 'claim_id,gate_name' });

  await logAdminAction({ adminWallet, action: 'override_gate', targetType: 'gate_result', targetId: `${claimId}:${gateName}`, afterState: { passed, reason } });
}

export async function flagReceiptRedaction(claimId: string, reason: string) {
  const adminWallet = await requireAdmin();
  const supabase = getSupabaseAdmin();

  await supabase.from('claim_receipts').update({ is_image_redacted: true }).eq('claim_id', claimId);

  await logAdminAction({ adminWallet, action: 'flag_image_redacted', targetType: 'claim', targetId: claimId, metadata: { reason } });
}

export async function setFeatured(claimId: string, featured: boolean) {
  const adminWallet = await requireAdmin();
  const supabase = getSupabaseAdmin();

  await supabase.from('claims').update({ is_featured: featured }).eq('id', claimId);

  await logAdminAction({ adminWallet, action: featured ? 'set_featured' : 'unset_featured', targetType: 'claim', targetId: claimId });
}
