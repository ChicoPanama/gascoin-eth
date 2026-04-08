import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { verifyTweetProof, getFollowerCount } from '../../../../lib/integrations/x';
import { getUserByUsername } from '../../../../lib/x-api';
import { scoreAccountQuality } from '../../../../lib/account-quality';

import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';

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
      await revertClaim(supabase, claim.id, `tweet_invalid: ${tweetCheck.reason}`);
      failures.push({ claimId: claim.id, reason: `tweet: ${tweetCheck.reason}` });
      reverted++;
      continue;
    }

    // 2. Re-verify follower count
    const followers = await getFollowerCount(handle);
    if (followers >= 0 && followers < MIN_FOLLOWERS) {
      await revertClaim(supabase, claim.id, `followers_dropped: ${followers}`);
      failures.push({ claimId: claim.id, reason: `followers: ${followers}` });
      reverted++;
      continue;
    }

    // 3. Re-verify account quality
    const userLookup = await getUserByUsername(handle);
    if (userLookup.user) {
      const quality = scoreAccountQuality(userLookup.user);
      if (!quality.passed) {
        await revertClaim(supabase, claim.id, `account_quality: score=${quality.score} flags=${quality.flags.join(',')}`);
        failures.push({ claimId: claim.id, reason: `quality: ${quality.score}` });
        reverted++;
        continue;
      }
    }

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

async function revertClaim(supabase: any, claimId: string, reason: string) {
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
}
