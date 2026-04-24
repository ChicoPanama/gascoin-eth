export type TweetProofResult = {
  ok: boolean;
  reason?: string;
  authorHandle?: string;
  containsGascoin?: boolean;
  mentionsGascoinApp?: boolean;
  live?: boolean;
};

/** Case-insensitive check that a tweet mentions @GasCoinApp. Word-boundary
 * guards against matches like @GasCoinAppBot or @gascoinapp_fan. */
const GASCOINAPP_MENTION = /@gascoinapp\b/i;

function parseTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/i);
  return m?.[1] || null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, init);
      // Success: return immediately. Only 5xx and 429 are retryable.
      if (r.status < 500 && r.status !== 429) return r;
      if (i === retries - 1) {
        if (r.status === 429) reportXApiQuotaExhausted(url).catch(() => {});
        return r;
      }
      const wait = Number(r.headers.get('retry-after') || 0) * 1000 || (300 * Math.pow(2, i));
      await sleep(wait);
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) await sleep(300 * Math.pow(2, i));
    }
  }
  throw lastErr ?? new Error('x_fetch_failed');
}

/**
 * Write an intelligence_entries row when X API returns 429 and all retries
 * are exhausted. Fire-and-forget — never blocks a pipeline.
 */
function reportXApiQuotaExhausted(endpoint: string): Promise<void> {
  return writeIntelligence({
    entry_type: 'x_api_quota_exhausted',
    entity_type: 'system',
    entity_id: 'x_integration',
    summary: 'X API rate limit (429) hit and all retries exhausted',
    detail_json: { endpoint: endpoint.split('?')[0], ts: new Date().toISOString() },
    severity: 'high',
    pipeline_source: 'x_integration',
  });
}

async function verifyViaXApi(tweetId: string, expectedHandle: string): Promise<TweetProofResult> {
  const token = process.env.X_API_BEARER_TOKEN || process.env.X_BEARER_TOKEN;
  if (!token) return { ok: false, reason: 'x_token_missing' };

  const endpoint = new URL(`https://api.x.com/2/tweets/${tweetId}`);
  endpoint.searchParams.set('expansions', 'author_id');
  endpoint.searchParams.set('tweet.fields', 'text');
  endpoint.searchParams.set('user.fields', 'username,verified');

  const r = await fetchWithRetry(endpoint.toString(), {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store'
  }, 3);

  if (!r.ok) {
    if (r.status === 404) return { ok: false, reason: 'tweet_not_found', live: false };
    return { ok: false, reason: `x_api_${r.status}` };
  }

  const j = (await r.json()) as any;
  const text = String(j?.data?.text || '');
  const user = j?.includes?.users?.[0] || {};
  const username = String(user?.username || '').toLowerCase();
  const expected = expectedHandle.replace(/^@/, '').toLowerCase();
  // Ticker-aware: accepts #gascoin (hashtag) OR $GAS (cashtag, current).
  // Legacy $GASCOIN is also accepted for a transition window so tweets
  // posted before the ticker change still pass the gate. Remove the
  // (coin)? alternate ~30 days post-migration once all legacy tweets
  // have aged past the 48h verification window.
  const containsGascoin = /#gascoin\b|\$gas(coin)?\b/i.test(text);
  const mentionsGascoinApp = GASCOINAPP_MENTION.test(text);
  const authorMatch = !!expected && username === expected;

  return {
    ok: containsGascoin && mentionsGascoinApp && authorMatch,
    reason:
      !containsGascoin ? 'missing_hashtag' :
      !mentionsGascoinApp ? 'missing_gascoinapp_mention' :
      authorMatch ? undefined : 'author_mismatch',
    authorHandle: username ? `@${username}` : undefined,
    containsGascoin,
    mentionsGascoinApp,
    live: true
  };
}

async function verifyViaOEmbed(tweetUrl: string, expectedHandle: string): Promise<TweetProofResult> {
  const endpoint = new URL('https://publish.twitter.com/oembed');
  endpoint.searchParams.set('url', tweetUrl);

  const r = await fetchWithRetry(endpoint.toString(), { cache: 'no-store' }, 2);
  if (!r.ok) return { ok: false, reason: `oembed_${r.status}` };

  const j = (await r.json()) as any;
  const html = String(j?.html || '');
  // Ticker-aware — mirrors the X API path above (#gascoin OR $GAS OR legacy $GASCOIN)
  const containsGascoin = /#gascoin\b|\$gas(coin)?\b/i.test(html);
  const mentionsGascoinApp = GASCOINAPP_MENTION.test(html);
  const handleMatch = html.match(/twitter\.com\/([A-Za-z0-9_]+)/i);
  const found = handleMatch?.[1] ? `@${handleMatch[1]}` : undefined;
  const authorMatch = !!found && found.toLowerCase() === expectedHandle.toLowerCase();

  return {
    ok: containsGascoin && mentionsGascoinApp && authorMatch,
    reason:
      !containsGascoin ? 'missing_hashtag' :
      !mentionsGascoinApp ? 'missing_gascoinapp_mention' :
      authorMatch ? undefined : 'author_mismatch',
    authorHandle: found,
    containsGascoin,
    mentionsGascoinApp,
    live: true
  };
}

import { cacheGetOrFetch, cacheGet, cacheSet, cacheIncr, cacheSetIsMember, cacheSetExists, cacheSetReplace } from '../cache';
import { writeIntelligence } from '../knowledge-base';

const X_API_FAIL_KEY = 'x_api:fail_count';
const X_API_FAIL_WINDOW_SECONDS = 300; // 5 minutes
const X_API_FAIL_THRESHOLD = 3;

/**
 * Atomically increment the X API failure counter. Returns the new count.
 * Used by the submit route to detect sustained outages and write PIPELINE_ANOMALY.
 */
export async function recordXApiFailure(): Promise<number> {
  return cacheIncr(X_API_FAIL_KEY, X_API_FAIL_WINDOW_SECONDS);
}

export function isXApiSustainedFailure(count: number): boolean {
  return count >= X_API_FAIL_THRESHOLD;
}

async function fetchFollowerCount(handle: string): Promise<number> {
  const lookup = await getUserByUsername(handle.replace(/^@/, ''));
  return Number(lookup.user?.public_metrics?.followers_count ?? -1);
}

export async function getFollowerCount(handle: string): Promise<number> {
  const username = handle.replace(/^@/, '').toLowerCase();
  return cacheGetOrFetch(`xfollowers:${username}`, () => fetchFollowerCount(handle), 900);
}

// ─── follows_gascoin gate ─────────────────────────────────────────────────
//
// The sybil model for GASCOIN requires submitters to follow @GasCoinApp on X
// before a claim is accepted. Rather than hit the X API per submission (slow,
// rate-limited, and requires OAuth user context for arbitrary users), we:
//
//   1. Run a cron worker (sync-gascoin-followers) that paginates the full
//      follower list of @GasCoinApp via the X API every 30 minutes
//   2. Store the set of follower X user IDs in Redis as `gascoin:x_followers`
//   3. Check membership via SISMEMBER on the submission hot path — O(1)
//
// Cold-cache fallback: if the Redis SET doesn't exist yet (e.g. first boot
// after deploy, or Redis flush), callers of `isFollowingGascoin` should check
// `isGascoinFollowersCacheWarm` first and trigger `refreshGascoinFollowersCache`
// synchronously before failing the gate. This avoids false rejections during
// the very first submission after an env change.
//
// The target handle is read from `NEXT_PUBLIC_GASCOIN_X_HANDLE` (defaults to
// `GasCoinApp`) so it's changeable without code deploys if we ever rebrand.

import { getUserByUsername, getUserFollowers } from '../x-api';

const FOLLOWERS_SET_KEY = 'gascoin:x_followers';
const FOLLOWERS_SET_TTL_SECONDS = 60 * 60 * 6; // 6h — worker refreshes every 30m
const GASCOIN_X_ID_KEY = 'gascoin:x_user_id';
const GASCOIN_X_ID_TTL_SECONDS = 60 * 60 * 24; // 24h — handle rarely changes

function gascoinXHandle(): string {
  return (process.env.NEXT_PUBLIC_GASCOIN_X_HANDLE || 'GasCoinApp').replace(/^@/, '');
}

/** Resolve @GasCoinApp → X user ID, cached for 24h. Returns null if lookup fails. */
export async function getGascoinXUserId(): Promise<string | null> {
  const cached = await cacheGet<string>(GASCOIN_X_ID_KEY);
  if (cached) return cached;

  const lookup = await getUserByUsername(gascoinXHandle());
  const id = lookup.user?.id || null;
  if (id) {
    await cacheSet(GASCOIN_X_ID_KEY, id, GASCOIN_X_ID_TTL_SECONDS);
  }
  return id;
}

/** Is the cached follower set warm enough to test membership against? */
export async function isGascoinFollowersCacheWarm(): Promise<boolean> {
  return cacheSetExists(FOLLOWERS_SET_KEY);
}

/**
 * Rebuild the Redis SET from the X API. Called by the sync-gascoin-followers
 * cron worker, and as a synchronous fallback from the submit pipeline when the
 * cache is cold. Returns the count cached, or -1 on error.
 */
export async function refreshGascoinFollowersCache(): Promise<{ count: number; error?: string }> {
  const gcId = await getGascoinXUserId();
  if (!gcId) return { count: -1, error: 'gascoin_user_lookup_failed' };

  const res = await getUserFollowers(gcId);
  if (res.error) return { count: -1, error: res.error };

  const n = await cacheSetReplace(FOLLOWERS_SET_KEY, res.ids, FOLLOWERS_SET_TTL_SECONDS);
  if (n < 0) return { count: -1, error: 'redis_write_failed' };

  return { count: n };
}

/**
 * Does this submitter follow @GasCoinApp?
 *
 * Hot-path check: one SISMEMBER against the Redis SET. On cold cache (set
 * missing), synchronously rebuilds the cache before testing — pays the
 * one-shot X API latency exactly once per TTL window, then O(1) forever.
 *
 * Failure modes:
 *   - `submitterXUserId` is empty/invalid → `{ ok: false, apiFailure: false }`
 *   - Redis unreachable → `{ ok: false, apiFailure: true }` (gate should not
 *     penalize the user; submit pipeline returns `retry_later` instead)
 *   - X API fails during cold-cache refresh → `{ ok: false, apiFailure: true }`
 */
export async function isFollowingGascoin(
  submitterXUserId: string,
): Promise<{ ok: boolean; apiFailure: boolean }> {
  const xId = String(submitterXUserId || '').trim();
  if (!xId) return { ok: false, apiFailure: false };

  // Hot path
  const warm = await isGascoinFollowersCacheWarm();
  if (warm) {
    const isMember = await cacheSetIsMember(FOLLOWERS_SET_KEY, xId);
    return { ok: isMember, apiFailure: false };
  }

  // Cold cache — rebuild synchronously. This is the first-submission-after-deploy
  // case and takes ~300–800ms. After this, every subsequent check is O(1).
  const refresh = await refreshGascoinFollowersCache();
  if (refresh.count < 0) {
    return { ok: false, apiFailure: true };
  }
  const isMember = await cacheSetIsMember(FOLLOWERS_SET_KEY, xId);
  return { ok: isMember, apiFailure: false };
}

export async function verifyTweetProof(tweetUrl: string, expectedHandle: string): Promise<TweetProofResult> {
  if (!tweetUrl.includes('x.com') && !tweetUrl.includes('twitter.com')) {
    return { ok: false, reason: 'invalid_tweet_url' };
  }

  const strict = (process.env.X_STRICT_MODE || 'true').toLowerCase() === 'true';
  const id = parseTweetId(tweetUrl);

  if (id && process.env.X_BEARER_TOKEN) {
    const viaApi = await verifyViaXApi(id, expectedHandle);
    return viaApi;
  }

  if (strict) {
    return { ok: false, reason: 'x_api_required_in_strict_mode' };
  }

  return verifyViaOEmbed(tweetUrl, expectedHandle);
}
