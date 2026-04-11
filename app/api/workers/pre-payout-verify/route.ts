import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { verifyTweetProof, getFollowerCount } from '../../../../lib/integrations/x';
import { getUserByUsername } from '../../../../lib/x-api';
import { scoreAccountQuality } from '../../../../lib/account-quality';

import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { addMemory } from '../../../../lib/mem0';
import { persistMetricsSnapshot } from '../../../../lib/metrics-snapshot';
import { hasMinimumGascoin } from '../../../../lib/integrations/solana';
import { getTierForBalance } from '../../../../lib/token-tiers';

const MIN_FOLLOWERS = 100;

/**
 * Pre-payout verification sweep — runs at 23:55 UTC daily.
 * Re-verifies all approved claims before the midnight payout batch:
 * - Tweet still exists, public, has #gascoin, author matches
 * - Follower count still above threshold
 * - Account quality still passes
 *
 * Claims that fail are reverted to needs_review with logged reasons.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch all approved claims with pending payout jobs
  // Include decision_reason to check if admin-approved (skip re-verify for those)
  const { data: approvedClaims, error } = await supabase
    .from('claims')
    .select('id, tweet_url, user_id, wallet, decision_reason, users(x_handle)')
    .eq('status', 'approved')
    .limit(200);

  if (error || !approvedClaims) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  let verified = 0;
  let reverted = 0;
  const failures: Array<{ claimId: string; reason: string }> = [];

  for (const claim of approvedClaims) {
    const xHandle = (claim as any).users?.x_handle || '';
    const handle = xHandle.replace(/^@/, '');

    if (!claim.tweet_url || !handle) {
      verified++;
      continue;
    }

    // Skip re-verification for manually admin-approved claims
    const reason = (claim as any).decision_reason || '';
    if (reason.startsWith('admin_dispatched') || reason.startsWith('admin_')) {
      verified++;
      continue;
    }

    // 1. Re-verify tweet
    const tweetCheck = await verifyTweetProof(claim.tweet_url, xHandle);
    if (!tweetCheck.ok) {
      await revertClaim(supabase, claim.id, `tweet_invalid: ${tweetCheck.reason}`, claim.wallet);
      failures.push({ claimId: claim.id, reason: `tweet: ${tweetCheck.reason}` });
      reverted++;
      continue;
    }

    // 2. Re-verify follower count
    const followers = await getFollowerCount(handle);
    if (followers >= 0 && followers < MIN_FOLLOWERS) {
      await revertClaim(supabase, claim.id, `followers_dropped: ${followers}`, claim.wallet);
      failures.push({ claimId: claim.id, reason: `followers: ${followers}` });
      reverted++;
      continue;
    }

    // 3. Re-verify account quality with historical signals
    const userLookup = await getUserByUsername(handle);
    const { data: linkData } = await supabase.from('wallet_x_links')
      .select('avg_quality_score, x_is_protected, x_location, bio, x_account_created_at')
      .eq('wallet', claim.wallet).maybeSingle();
    const { data: prevMetrics } = await supabase.from('user_metrics_history')
      .select('follower_count').eq('wallet', claim.wallet)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    const historySignals = {
      previousFollowerCount: prevMetrics?.follower_count ?? null,
      avgQualityScore: linkData?.avg_quality_score ?? null,
      isProtected: linkData?.x_is_protected ?? null,
      xLocation: linkData?.x_location ?? null,
      bio: linkData?.bio ?? null,
      accountCreatedAt: linkData?.x_account_created_at ?? null,
    };

    if (userLookup.user) {
      const quality = scoreAccountQuality(userLookup.user, historySignals);
      if (!quality.passed) {
        await revertClaim(supabase, claim.id, `account_quality: score=${quality.score} flags=${quality.flags.join(',')}`, claim.wallet);
        failures.push({ claimId: claim.id, reason: `quality: ${quality.score}` });
        reverted++;
        continue;
      }
    }

    // Snapshot metrics at payout verification time (non-blocking)
    const balCheck = await hasMinimumGascoin(claim.wallet, 0);
    const tier = getTierForBalance(balCheck.tokenBalance ?? 0);
    persistMetricsSnapshot(supabase, {
      userId: claim.user_id,
      wallet: claim.wallet,
      xHandle: handle,
      xUser: userLookup?.user ?? null,
      accountQualityScore: userLookup?.user ? scoreAccountQuality(userLookup.user, historySignals).score : undefined,
      accountQualityPassed: userLookup?.user ? scoreAccountQuality(userLookup.user, historySignals).passed : undefined,
      gascoinBalance: balCheck.tokenBalance ?? 0,
      tierId: tier.id,
      source: 'payout_verify',
    }).catch(() => {});

    verified++;
  }

  return NextResponse.json({
    ok: true,
    total: approvedClaims.length,
    verified,
    reverted,
    failures,
  });
}

async function revertClaim(supabase: any, claimId: string, reason: string, wallet?: string) {
  await supabase.from('claims').update({
    status: 'needs_review',
    updated_at: new Date().toISOString(),
  }).eq('id', claimId);

  await supabase.from('claim_status_events').insert({
    claim_id: claimId,
    from_status: 'approved',
    to_status: 'needs_review',
    actor_type: 'system',
    actor_id: 'pre_payout_verify',
    reason,
  });

  await supabase.from('audit_logs').insert({
    actor_type: 'system',
    actor_id: 'pre_payout_verify',
    action: 'pre_payout_revert',
    target_type: 'claim',
    target_id: claimId,
    payload_json: { reason },
  });

  // Record pre-payout failure in mem0 for cross-pipeline intelligence
  if (wallet) {
    addMemory('wallet', wallet,
      `Pre-payout verification failed: ${reason}. Claim ${claimId} reverted.`,
      { pipeline: 'pre_payout_verify', signal: 'payout_blocked' },
    ).catch(() => {});
  }
}
