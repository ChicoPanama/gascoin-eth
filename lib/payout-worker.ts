import { hasMinimumGascoin, sendEthPayout } from './integrations/ethereum';
import { getTierForBalance } from './token-tiers';
import { verifyTweetProof, getFollowerCount } from './integrations/x';
import { getUserByUsername } from './x-api';
import { scoreAccountQuality } from './account-quality';
import { getSupabaseAdmin } from './supabase';
import { getCachedFlags, addMemory, writePayoutEvent } from './mem0';
import { recordAttributionEvent } from './attribution';
import { shouldSilenceBetaAlerts } from './season';

const RETRY_BASE_SECONDS = 60;
const MIN_FOLLOWERS = 100;

export async function processQueuedPayout(claimId: string) {
  const supabase = getSupabaseAdmin();

  const { data: job, error: jobErr } = await supabase
    .from('payout_jobs')
    .select('id,claim_id,wallet,amount_eth,status,attempts,max_attempts,next_retry_at')
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
      payload_json: { wallet: job.wallet, tokenBalance: gate.tokenBalance, amountEth: job.amount_eth }
    });

    return { ok: false, error: 'min_gascoin_not_met', tokenBalance: gate.tokenBalance };
  }

  // T2: Cross-validate payout amount against the wallet's current tier cap.
  // Protects against tampered payout_jobs rows and catches edge cases where
  // the job was created with an inflated amount.
  const currentTier = getTierForBalance(gate.tokenBalance);
  const requestedAmount = Number(job.amount_eth);
  if (requestedAmount > currentTier.max_eth_refund + 0.0001) {
    await supabase.from('payout_jobs').update({
      status: 'blocked',
      last_error: `amount_exceeds_tier_cap:${currentTier.slug}:max=${currentTier.max_eth_refund}:requested=${requestedAmount}`,
      updated_at: new Date().toISOString()
    }).eq('id', job.id);

    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'payout_worker',
      action: 'payout_blocked_amount_exceeds_tier',
      target_type: 'claim',
      target_id: claimId,
      payload_json: { wallet: job.wallet, requestedAmount, tierSlug: currentTier.slug, maxAllowed: currentTier.max_eth_refund },
    });

    return { ok: false, error: 'amount_exceeds_tier_cap', requestedAmount, tierSlug: currentTier.slug, maxAllowed: currentTier.max_eth_refund };
  }

  // Per-day spend cap — configurable via DAILY_PAYOUT_CAP_ETH (default 1 ETH).
  // Prevents a single compromised session from draining the treasury in one batch.
  // Default: 1 ETH/day (~200 Standard or ~20 Fleet payouts). Set
  // DAILY_PAYOUT_CAP_ETH to ~15% of your treasury balance for right-sizing.
  const dailyCapEth = Number(process.env.DAILY_PAYOUT_CAP_ETH ?? 1);
  const todayUtc = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const { data: todayPayouts } = await supabase
    .from('payouts')
    .select('amount_eth')
    .eq('status', 'paid')
    .gte('sent_at', `${todayUtc}T00:00:00.000Z`);
  const todayTotal = (todayPayouts || []).reduce((s, p: any) => s + Number(p.amount_eth || 0), 0);
  if (todayTotal + requestedAmount > dailyCapEth) {
    try {
      await supabase.from('intelligence_entries').insert({
        entry_type: 'daily_payout_cap_reached',
        entity_type: 'wallet',
        entity_id: job.wallet,
        summary: `Daily payout cap (${dailyCapEth} ETH) reached — claim ${claimId} queued for next day`,
        detail_json: { claimId, wallet: job.wallet, requestedAmount, todayTotal, dailyCapEth },
        severity: 'high',
        pipeline_source: 'payout_worker',
      });
    } catch {}
    return { ok: false, error: 'daily_payout_cap_reached', todayTotal, dailyCapEth };
  }

  const sent = await sendEthPayout(job.wallet, requestedAmount);
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
      payload_json: { wallet: job.wallet, amountEth: job.amount_eth, error: sent.error, attempts, nextRetryAt }
    });

    // O2: Surface exhausted payout failures in admin intelligence feed
    if (exhausted) {
      try {
        await supabase.from('intelligence_entries').insert({
          entry_type: 'payout_failed_exhausted',
          entity_type: 'wallet',
          entity_id: job.wallet,
          summary: `Payout failed after ${attempts} attempts: ${sent.error || 'unknown error'}`,
          detail_json: { claimId, wallet: job.wallet, amountEth: job.amount_eth, error: sent.error, attempts },
          severity: 'high',
          pipeline_source: 'payout_worker',
        });
      } catch {}
    }

    return { ok: false, error: sent.error || 'payout_failed', attempts, exhausted };
  }

  // O1: Detect DRYRUN hashes — ENABLE_LIVE_PAYOUT is not 'true' in production.
  // Write to both audit_logs and intelligence_entries so admin dashboard alerts.
  if (sent.txHash?.startsWith('DRYRUN_')) {
    // Audit log is always useful — preserve it even during beta.
    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'payout_worker',
      action: 'dryrun_payout_detected',
      target_type: 'claim',
      target_id: claimId,
      payload_json: { wallet: job.wallet, amountEth: requestedAmount, txHash: sent.txHash, reason: 'ENABLE_LIVE_PAYOUT is not true — no ETH was transferred' },
    });
    // The intelligence_entries row is a dashboard alert. During Season 1 beta
    // DRYRUN is expected for every claim — flooding the admin view with
    // CRITICAL entries is noise, not signal. Skip the alert write when the
    // beta flag is on; keep it otherwise so real prod misconfig still pages.
    if (!shouldSilenceBetaAlerts()) {
      try {
        await supabase.from('intelligence_entries').insert({
          entry_type: 'dryrun_payout_detected',
          entity_type: 'wallet',
          entity_id: job.wallet,
          summary: `DRYRUN payout detected — ENABLE_LIVE_PAYOUT is not set. Claim ${claimId} marked paid but no ETH transferred.`,
          detail_json: { claimId, wallet: job.wallet, amountEth: requestedAmount, txHash: sent.txHash },
          severity: 'critical',
          pipeline_source: 'payout_worker',
        });
      } catch {}
    }
  }

  // O3: Treasury ETH threshold alert — warn when balance drops below 1 ETH
  try {
    const { getTreasuryBalances } = await import('./integrations/ethereum');
    const balances = await getTreasuryBalances();
    if (balances.ethBalance < 1) {
      await supabase.from('intelligence_entries').insert({
        entry_type: 'treasury_low_eth',
        entity_type: 'system',
        entity_id: 'treasury',
        summary: `Treasury ETH balance is critically low: ${balances.ethBalance.toFixed(4)} ETH`,
        detail_json: { ethBalance: balances.ethBalance, ethUsd: balances.ethUsd, threshold: 1 },
        severity: balances.ethBalance < 0.1 ? 'critical' : 'high',
        pipeline_source: 'payout_worker',
      });
    }
  } catch {
    // Non-blocking — balance check failure must not interrupt payout flow
  }

  await supabase.from('payouts').insert({
    claim_id: claimId,
    wallet: job.wallet,
    amount_eth: job.amount_eth,
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
    payload_json: { wallet: job.wallet, amountEth: job.amount_eth, txHash: sent.txHash }
  });

  // Record payout in mem0 as an immutable on-chain event — typed helper
  // categorizes under payout_event, assigns agent/app scope, and marks the
  // memory immutable (permanent audit record that cannot be overwritten).
  writePayoutEvent(job.wallet, {
    claimId,
    amountEth: job.amount_eth,
    txHash: sent.txHash || 'unknown',
    status: 'dispatched',
  }).catch(() => {});

  // Gas Network Piece 5 — write attribution event for this payout,
  // keyed back to the source tweet. Fire-and-forget.
  (async () => {
    if (!claim?.tweet_url) return;
    const { data: tweet } = await supabase
      .from('scored_tweets')
      .select('tweet_id')
      .eq('wallet', job.wallet)
      .eq('tweet_url', claim.tweet_url)
      .maybeSingle();
    if (tweet?.tweet_id) {
      recordAttributionEvent(tweet.tweet_id, 'payout', job.wallet, {
        claim_id: claimId,
        amount_eth: job.amount_eth,
        tx_hash: sent.txHash,
      }).catch(() => {});
    }
  })().catch(() => {});

  return { ok: true, txHash: sent.txHash, gate, reused: false };
}
