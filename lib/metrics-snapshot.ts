/**
 * Snapshot user metrics at key moments for historical tracking.
 * Called during submission, payout verification, and daily crons.
 */

import type { XUser } from './x-api';
import { silentLog } from './silent-log';

export interface MetricsSnapshotInput {
  userId: string;
  wallet: string;
  xHandle?: string;
  xUser?: XUser | null;
  accountQualityScore?: number;
  accountQualityPassed?: boolean;
  gascoinBalance?: number;
  tierId?: number;
  ipCountry?: string;
  source: 'submission' | 'payout_verify' | 'daily_cron' | 'engagement_scan';
}

export function buildMetricsRow(input: MetricsSnapshotInput) {
  const metrics = input.xUser?.public_metrics;
  return {
    user_id: input.userId,
    wallet: input.wallet,
    x_handle: input.xHandle || input.xUser?.username || null,
    follower_count: metrics?.followers_count ?? null,
    following_count: metrics?.following_count ?? null,
    tweet_count: metrics?.tweet_count ?? null,
    listed_count: metrics?.listed_count ?? null,
    account_quality_score: input.accountQualityScore ?? null,
    account_quality_passed: input.accountQualityPassed ?? null,
    gascoin_balance: input.gascoinBalance ?? null,
    tier_id: input.tierId ?? null,
    ip_country: input.ipCountry ?? null,
    x_location: (input.xUser as any)?.location ?? null,
    snapshot_source: input.source,
  };
}

export async function persistMetricsSnapshot(
  supabase: any,
  input: MetricsSnapshotInput,
): Promise<void> {
  try {
    await supabase
      .from('user_metrics_history')
      .insert(buildMetricsRow(input));
  } catch (err) {
    silentLog(err, { module: 'metrics-snapshot', operation: 'persistMetricsSnapshot', wallet: input.wallet, extra: { source: input.source } });
  }
}

export async function persistHandleChange(
  supabase: any,
  userId: string,
  xUserId: string,
  oldHandle: string,
  newHandle: string,
): Promise<void> {
  try {
    await supabase
      .from('x_handle_history')
      .insert({ user_id: userId, x_user_id: xUserId, old_handle: oldHandle, new_handle: newHandle });
  } catch (err) {
    silentLog(err, { module: 'metrics-snapshot', operation: 'persistHandleChange', extra: { userId, xUserId, oldHandle, newHandle } });
  }
}
