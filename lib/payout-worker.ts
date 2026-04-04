import { hasMinimumGascoinUsd, sendSolPayout } from './integrations/solana';
import { getSupabaseAdmin } from './supabase';

const RETRY_BASE_SECONDS = 60;

export async function processQueuedPayout(claimId: string) {
  const supabase = getSupabaseAdmin();

  const { data: job, error: jobErr } = await supabase
    .from('payout_jobs')
    .select('id,claim_id,wallet,amount_sol,status,attempts,max_attempts,next_retry_at')
    .eq('claim_id', claimId)
    .single();

  if (jobErr || !job) {
    return { ok: false, error: 'payout_job_not_found' };
  }

  // Safety guard: only process payouts for admin-approved claims
  const { data: claim } = await supabase
    .from('claims')
    .select('status')
    .eq('id', claimId)
    .single();

  if (claim?.status !== 'approved' && job.status !== 'paid') {
    return { ok: false, error: 'claim_not_admin_approved', claimStatus: claim?.status };
  }

  if (job.status === 'paid') {
    const { data: existingPaid } = await supabase
      .from('payouts')
      .select('tx_hash')
      .eq('claim_id', claimId)
      .eq('status', 'paid')
      .maybeSingle();
    return { ok: true, txHash: existingPaid?.tx_hash || null, reused: true };
  }

  const gate = await hasMinimumGascoinUsd(job.wallet, 1);
  if (!gate.ok) {
    await supabase.from('payout_jobs').update({
      status: 'blocked',
      last_error: 'min_gascoin_not_met',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);

    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'payout_worker',
      action: 'payout_blocked_min_gascoin',
      target_type: 'claim',
      target_id: claimId,
      payload_json: { wallet: job.wallet, usdValue: gate.usdValue, amountSol: job.amount_sol }
    });

    return { ok: false, error: 'min_gascoin_not_met', usdValue: gate.usdValue };
  }

  const sent = await sendSolPayout(job.wallet, Number(job.amount_sol));
  if (!sent.ok) {
    const attempts = Number(job.attempts || 0) + 1;
    const exhausted = attempts >= Number(job.max_attempts || 5);
    const nextRetryAt = new Date(Date.now() + Math.pow(2, Math.min(attempts, 6)) * RETRY_BASE_SECONDS * 1000).toISOString();

    await supabase.from('payout_jobs').update({
      status: exhausted ? 'failed' : 'retry_scheduled',
      attempts,
      next_retry_at: nextRetryAt,
      last_error: sent.error || 'payout_failed',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);

    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'payout_worker',
      action: exhausted ? 'payout_failed_exhausted' : 'payout_retry_scheduled',
      target_type: 'claim',
      target_id: claimId,
      payload_json: { wallet: job.wallet, amountSol: job.amount_sol, error: sent.error, attempts, nextRetryAt }
    });

    return { ok: false, error: sent.error || 'payout_failed', attempts, exhausted };
  }

  await supabase.from('payouts').insert({
    claim_id: claimId,
    wallet: job.wallet,
    amount_sol: job.amount_sol,
    tx_hash: sent.txHash,
    status: 'paid',
    sent_at: new Date().toISOString()
  });

  await supabase.from('payout_jobs').update({
    status: 'paid',
    attempts: Number(job.attempts || 0) + 1,
    updated_at: new Date().toISOString(),
    last_error: null
  }).eq('id', job.id);

  await supabase.from('claims').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', claimId);
  await supabase.from('claim_status_events').insert({
    claim_id: claimId,
    from_status: 'approved',
    to_status: 'paid',
    actor_type: 'system',
    actor_id: 'payout_worker',
    reason: 'payout_sent'
  });

  await supabase.from('audit_logs').insert({
    actor_type: 'system',
    actor_id: 'payout_worker',
    action: 'payout_sent',
    target_type: 'claim',
    target_id: claimId,
    payload_json: { wallet: job.wallet, amountSol: job.amount_sol, txHash: sent.txHash }
  });

  return { ok: true, txHash: sent.txHash, gate, reused: false };
}
