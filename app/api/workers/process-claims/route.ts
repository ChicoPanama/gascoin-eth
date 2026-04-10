import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { processQueuedPayout } from '../../../../lib/payout-worker';
import { getTierForBalance } from '../../../../lib/token-tiers';
import { hasMinimumGascoin, bustTreasuryCache, getTreasuryBalances } from '../../../../lib/integrations/solana';
import { snapshotTreasury } from '../../../../lib/data-intelligence';
import { reviewClaim } from '../../../../lib/integrations/claude';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';

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
    .select('id,wallet,user_id,risk_score,ip_country,users(x_handle)')
    .eq('status', 'ready_for_dispatch')
    .limit(200);

  let autoApproved = 0;
  for (const claim of readyClaims || []) {
    // Determine payout amount from user's token tier
    const balance = await hasMinimumGascoin(claim.wallet, 0);
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

    // ─── CLAUDE OVERSIGHT GATE ───
    // Claude reviews the full claim package before payout job creation.
    // Fetch gate results + fraud signals for Claude's review context.
    const { data: gateRows } = await supabase
      .from('gate_results')
      .select('gate_name, passed, score, reason_code')
      .eq('claim_id', claim.id);

    const { data: receiptMeta } = await supabase
      .from('claim_receipts')
      .select('ai_score, tamper_score, metadata_json')
      .eq('claim_id', claim.id)
      .maybeSingle();

    const { data: prevClaims } = await supabase
      .from('claims')
      .select('status')
      .eq('wallet', claim.wallet);

    const claudeVerdict = await reviewClaim({
      claimId: claim.id,
      wallet: claim.wallet,
      xHandle: (claim as any).users?.x_handle || '',
      tier: tier.slug,
      amountSol: solAmount,
      gateResults: (gateRows || []).map((g: any) => ({ gate: g.gate_name, passed: g.passed, score: g.score, reason: g.reason_code })),
      riskScore: claim.risk_score ?? 0,
      aiScore: receiptMeta?.ai_score ?? 0,
      tamperScore: receiptMeta?.tamper_score ?? 0,
      fraudRisk: receiptMeta?.metadata_json?.fraudRisk ?? 'unknown',
      crossValidation: receiptMeta?.metadata_json?.crossValidation ?? null,
      ipCountry: (claim as any).ip_country,
      ocrCountry: receiptMeta?.metadata_json?.country ?? null,
      previousSubmissions: (prevClaims || []).length,
      previousApprovals: (prevClaims || []).filter((c: any) => ['approved', 'paid'].includes(c.status)).length,
      previousRejections: (prevClaims || []).filter((c: any) => c.status === 'rejected').length,
    });

    // Log Claude's verdict to audit trail
    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'claude_oversight',
      action: `claude_${claudeVerdict.verdict}`,
      target_type: 'claim',
      target_id: claim.id,
      payload_json: { verdict: claudeVerdict.verdict, confidence: claudeVerdict.confidence, narrative: claudeVerdict.narrative, concerns: claudeVerdict.concerns },
    });

    // If Claude flags or rejects, revert to needs_review — skip payout
    if (claudeVerdict.verdict === 'flag' || claudeVerdict.verdict === 'reject') {
      await supabase.from('claims').update({
        status: 'needs_review',
        decision_reason: `claude_${claudeVerdict.verdict}: ${claudeVerdict.narrative}`,
        updated_at: nowIso,
      }).eq('id', claim.id);

      await supabase.from('claim_status_events').insert({
        claim_id: claim.id,
        from_status: 'approved',
        to_status: 'needs_review',
        actor_type: 'system',
        actor_id: 'claude_oversight',
        reason: claudeVerdict.narrative,
      });

      continue; // Skip payout job creation
    }
    // ─── END CLAUDE OVERSIGHT ───

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
      metadata_json: { claim_id: claim.id, approved_by: 'auto_system_claude_approved', tier: tier.slug },
    });

    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'claims_worker',
      action: 'claim_auto_approved',
      target_type: 'claim',
      target_id: claim.id,
      payload_json: { wallet: claim.wallet, tier: tier.name, solAmount, claude_verdict: claudeVerdict.verdict },
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

  // Bust treasury cache + snapshot balance after payouts
  if (results.some((r: any) => r.ok)) {
    bustTreasuryCache().catch(() => {});
    getTreasuryBalances().then((bal) => snapshotTreasury(supabase, bal)).catch(() => {});
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
