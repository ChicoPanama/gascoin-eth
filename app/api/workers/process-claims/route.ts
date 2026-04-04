import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { processQueuedPayout } from '../../../../lib/payout-worker';

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

  // Normalize newly submitted claims to explicit auto_review stage when needed.
  const { data: submitted, error: submittedErr } = await supabase
    .from('claims')
    .select('id,status')
    .eq('status', 'submitted')
    .limit(200);

  if (submittedErr) {
    return NextResponse.json({ ok: false, error: 'submitted_query_failed', details: submittedErr.message }, { status: 500 });
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

  // Process due payout retries.
  // Also enqueue approved claims that do not yet have payout jobs.
  const { data: approvedClaims } = await supabase
    .from('claims')
    .select('id,wallet,parsed_amount')
    .eq('status', 'approved')
    .limit(50);

  const { data: existingJobs } = await supabase
    .from('payout_jobs')
    .select('claim_id')
    .limit(5000);

  const jobClaimIds = new Set((existingJobs || []).map((j: any) => j.claim_id));
  const approvedNoJob = (approvedClaims || []).filter((a: any) => !jobClaimIds.has(a.id));

  for (const a of approvedNoJob || []) {
    const amountUsd = Number(a.parsed_amount || 0);
    const amountSol = Math.max(0.001, +(amountUsd / 200).toFixed(6));
    await supabase.from('payout_jobs').insert({
      claim_id: a.id,
      wallet: a.wallet,
      amount_sol: amountSol,
      status: 'queued'
    });
    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'claims_worker',
      action: 'payout_job_enqueued',
      target_type: 'claim',
      target_id: a.id,
      payload_json: { amountSol, source: 'approved_claim' }
    });
  }

  const { data: jobs, error: jobsErr } = await supabase
    .from('payout_jobs')
    .select('id,claim_id,wallet,amount_sol,attempts,max_attempts,status,next_retry_at')
    .in('status', ['queued', 'retry_scheduled'])
    .order('next_retry_at', { ascending: true })
    .limit(50);

  if (jobsErr) {
    return NextResponse.json({ ok: false, error: 'payout_jobs_query_failed', details: jobsErr.message }, { status: 500 });
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
    duePayoutJobs: dueJobs.map((j: any) => ({
      id: j.id,
      claimId: j.claim_id,
      attempts: j.attempts,
      status: j.status,
      nextRetryAt: j.next_retry_at
    })),
    payoutProcessing: results,
    enqueuedApprovedClaims: (approvedNoJob || []).length
  });
}
