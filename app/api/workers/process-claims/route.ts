import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { processQueuedPayout } from '../../../../lib/payout-worker';
import { getTierForBalance } from '../../../../lib/token-tiers';
import { hasMinimumGascoinUsd } from '../../../../lib/integrations/solana';

function isAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  }

  const nowIso = new Date().toISOString();

  // --- Phase 1: Normalize submitted → auto_review ---
  const { data: submitted, error: submittedErr } = await supabase
    .from('claims')
    .select('id,status')
    .eq('status', 'submitted')
    .limit(200);

  if (submittedErr) {
    return NextResponse.json({ ok: false, error: 'submitted_query_failed' }, { status: 500 });
  }

  let transitioned = 0;
  for (const c of submitted || []) {
    await supabase.from('claims').update({ status: 'auto_review', updated_at: nowIso }).eq('id', c.id);
    await supabase.from('claim_status_events').insert({
      claim_id: c.id,
      from_status: 'submitted',
      to_status: 'auto_review',
      actor_type: 'system',
      actor_id: 'claims_worker',
      reason: 'worker_auto_review'
    });
    transitioned += 1;
  }

  // --- Phase 2: Auto-approve ready_for_dispatch claims ---
  // Claims that passed all 12 gates automatically get approved and queued
  // for the daily midnight batch payout. Payout amount set by token tier.
  const { data: readyClaims } = await supabase
    .from('claims')
    .select('id,wallet,user_id')
    .eq('status', 'ready_for_dispatch')
    .limit(200);

  let autoApproved = 0;
  for (const claim of readyClaims || []) {
    // Determine payout amount from user's token tier
    const balance = await hasMinimumGascoinUsd(claim.wallet, 0);
    const tier = getTierForBalance(balance.tokenBalance ?? 0);
    const solAmount = tier.max_sol_refund;

    // Approve the claim
    await supabase.from('claims').update({
      status: 'approved',
      decision_reason: `auto_approved_tier_${tier.slug}`,
      updated_at: nowIso,
    }).eq('id', claim.id);

    await supabase.from('claim_status_events').insert({
      claim_id: claim.id,
      from_status: 'ready_for_dispatch',
      to_status: 'approved',
      actor_type: 'system',
      actor_id: 'claims_worker',
      reason: `auto_approved: all gates passed, tier=${tier.name}, payout=${solAmount} SOL`,
    });

    // Create payout job for the midnight batch
    await supabase.from('payout_jobs').upsert({
      claim_id: claim.id,
      wallet: claim.wallet,
      amount_sol: solAmount,
      status: 'queued',
    }, { onConflict: 'claim_id' });

    // Award submission points
    await supabase.from('engagement_points').insert({
      wallet: claim.wallet,
      source: 'submission_approved',
      points: 1000,
      metadata_json: { claim_id: claim.id, approved_by: 'auto_system', tier: tier.slug },
    });

    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'claims_worker',
      action: 'claim_auto_approved',
      target_type: 'claim',
      target_id: claim.id,
      payload_json: { wallet: claim.wallet, tier: tier.name, solAmount },
    });

    autoApproved++;
  }

  // --- Phase 3: Process queued payout jobs ---
  const { data: jobs, error: jobsErr } = await supabase
    .from('payout_jobs')
    .select('id,claim_id,wallet,amount_sol,attempts,max_attempts,status,next_retry_at')
    .in('status', ['queued', 'retry_scheduled'])
    .order('next_retry_at', { ascending: true })
    .limit(50);

  if (jobsErr) {
    return NextResponse.json({ ok: false, error: 'payout_jobs_query_failed' }, { status: 500 });
  }

  const dueJobs = (jobs || []).filter((j: any) => j.status === 'queued' || String(j.next_retry_at || '') <= nowIso);
  const results: any[] = [];
  for (const j of dueJobs) {
    const res = await processQueuedPayout(j.claim_id);
    results.push({ claimId: j.claim_id, ...res });
  }

  return NextResponse.json({
    ok: true,
    transitionedClaims: transitioned,
    autoApprovedClaims: autoApproved,
    duePayoutJobs: dueJobs.map((j: any) => ({
      id: j.id,
      claimId: j.claim_id,
      attempts: j.attempts,
      status: j.status,
      nextRetryAt: j.next_retry_at
    })),
    payoutProcessing: results,
  });
}
