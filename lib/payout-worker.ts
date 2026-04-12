import { hasMinimumGascoin, sendSolPayout } from './integrations/solana';
import { verifyTweetProof, getFollowerCount } from './integrations/x';
import { getUserByUsername } from './x-api';
import { scoreAccountQuality } from './account-quality';
import { getSupabaseAdmin } from './supabase';
import { getCachedFlags, addMemory, writePayoutEvent } from './mem0';

const RETRY_BASE_SECONDS = 60;
const MIN_FOLLOWERS = 100;

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
    .select('status,tweet_url,user_id')
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

  // --- Cross-pipeline guard via mem0 ---
  // Check if wallet was flagged by another pipeline after claim approval
  const mem0Flags = await getCachedFlags(job.wallet);
  if (mem0Flags?.riskFlags.some((f: string) => f.includes('ring_detected') || f.includes('banned'))) {
    await supabase.from('claims').update({ status: 'needs_review', updated_at: new Date().toISOString() }).eq('id', claimId);
    await supabase.from('claim_status_events').insert({
      claim_id: claimId, from_status: 'approved', to_status: 'needs_review',
      actor_type: 'system', actor_id: 'payout_worker',
      reason: `mem0_cross_pipeline_flag: ${mem0Flags.riskFlags.join(', ')}`,
    });
    await supabase.from('audit_logs').insert({
      actor_type: 'system', actor_id: 'payout_worker',
      action: 'payout_blocked_cross_pipeline',
      target_type: 'claim', target_id: claimId,
      payload_json: { wallet: job.wallet, flags: mem0Flags.riskFlags, trajectory: mem0Flags.trajectory },
    });
    return { ok: false, error: 'cross_pipeline_flag', flags: mem0Flags.riskFlags };
  }

  // --- Pre-payout re-verification ---
  // Re-verify tweet is still live, public, has #gascoin, and author matches
  if (claim?.tweet_url && claim?.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('x_handle')
      .eq('id', claim.user_id)
      .single();

    const xHandle = user?.x_handle || '';
    const tweetCheck = await verifyTweetProof(claim.tweet_url, xHandle);

    if (!tweetCheck.ok) {
      await supabase.from('claims').update({ status: 'needs_review', updated_at: new Date().toISOString() }).eq('id', claimId);
      await supabase.from('claim_status_events').insert({
        claim_id: claimId, from_status: 'approved', to_status: 'needs_review',
        actor_type: 'system', actor_id: 'payout_worker',
        reason: `pre_payout_tweet_failed: ${tweetCheck.reason}`
      });
      await supabase.from('audit_logs').insert({
        actor_type: 'system', actor_id: 'payout_worker',
        action: 'payout_blocked_tweet_invalid',
        target_type: 'claim', target_id: claimId,
        payload_json: { reason: tweetCheck.reason, tweetUrl: claim.tweet_url }
      });
      return { ok: false, error: 'tweet_no_longer_valid', reason: tweetCheck.reason };
    }

    // Re-verify follower count
    const handle = xHandle.replace(/^@/, '');
    const followers = await getFollowerCount(handle);
    if (followers >= 0 && followers < MIN_FOLLOWERS) {
      await supabase.from('claims').update({ status: 'needs_review', updated_at: new Date().toISOString() }).eq('id', claimId);
      await supabase.from('claim_status_events').insert({
        claim_id: claimId, from_status: 'approved', to_status: 'needs_review',
        actor_type: 'system', actor_id: 'payout_worker',
        reason: `pre_payout_followers_dropped: ${followers}`
      });
      return { ok: false, error: 'followers_below_threshold', followers };
    }

    // Re-verify account quality with historical signals
    const userLookup = await getUserByUsername(handle);
    const { data: linkData } = await supabase.from('wallet_x_links')
      .select('avg_quality_score, x_is_protected, x_location, bio, x_account_created_at')
      .eq('wallet', job.wallet).maybeSingle();
    const { data: prevMetrics } = await supabase.from('user_metrics_history')
      .select('follower_count').eq('wallet', job.wallet)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (userLookup.user) {
      const quality = scoreAccountQuality(userLookup.user, {
        previousFollowerCount: prevMetrics?.follower_count ?? null,
        avgQualityScore: linkData?.avg_quality_score ?? null,
        isProtected: linkData?.x_is_protected ?? null,
        xLocation: linkData?.x_location ?? null,
        bio: linkData?.bio ?? null,
        accountCreatedAt: linkData?.x_account_created_at ?? null,
      });
      if (!quality.passed) {
        await supabase.from('claims').update({ status: 'needs_review', updated_at: new Date().toISOString() }).eq('id', claimId);
        await supabase.from('claim_status_events').insert({
          claim_id: claimId, from_status: 'approved', to_status: 'needs_review',
          actor_type: 'system', actor_id: 'payout_worker',
          reason: `pre_payout_account_quality_failed: score=${quality.score} flags=${quality.flags.join(',')}`
        });
        return { ok: false, error: 'account_quality_failed', score: quality.score, flags: quality.flags };
      }
    }
  }

  const gate = await hasMinimumGascoin(job.wallet, 1);
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
      payload_json: { wallet: job.wallet, tokenBalance: gate.tokenBalance, amountSol: job.amount_sol }
    });

    return { ok: false, error: 'min_gascoin_not_met', tokenBalance: gate.tokenBalance };
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

  // Record payout in mem0 as an immutable on-chain event — typed helper
  // categorizes under payout_event, assigns agent/app scope, and marks the
  // memory immutable (permanent audit record that cannot be overwritten).
  writePayoutEvent(job.wallet, {
    claimId,
    amountSol: job.amount_sol,
    txHash: sent.txHash || 'unknown',
    status: 'dispatched',
  }).catch(() => {});

  return { ok: true, txHash: sent.txHash, gate, reused: false };
}
