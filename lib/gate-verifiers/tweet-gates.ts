import { getTweet, getUser } from '../x-api';
import { parseTweetUrl } from '../tweet-parser';

export interface GateVerifyResult {
  gate_id: number;
  passed: boolean;
  failure_reason: string | null;
  duration_ms: number;
  metadata?: Record<string, unknown>;
}

const TWEET_AGE_LIMIT_MS = 48 * 60 * 60 * 1000;

export async function verifyGate1(tweetUrl: string): Promise<GateVerifyResult> {
  const start = Date.now();
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed.isValid) return { gate_id: 1, passed: false, failure_reason: 'Tweet URL format not recognized', duration_ms: Date.now() - start };

  const { tweet, notFound, error } = await getTweet(parsed.tweetId);
  if (notFound) return { gate_id: 1, passed: false, failure_reason: 'Tweet not found — it may have been deleted', duration_ms: Date.now() - start };
  if (error) return { gate_id: 1, passed: false, failure_reason: `X API error: ${error}`, duration_ms: Date.now() - start };

  return { gate_id: 1, passed: true, failure_reason: null, duration_ms: Date.now() - start, metadata: { tweet_id: tweet!.id, author_id: tweet!.author_id } };
}

export async function verifyGate2(tweetUrl: string): Promise<GateVerifyResult> {
  const start = Date.now();
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed.isValid) return { gate_id: 2, passed: false, failure_reason: 'Invalid tweet URL', duration_ms: Date.now() - start };

  const { tweet, error } = await getTweet(parsed.tweetId);
  if (!tweet || error) return { gate_id: 2, passed: false, failure_reason: 'Could not retrieve tweet', duration_ms: Date.now() - start };

  const { user, error: ue } = await getUser(tweet.author_id);
  if (!user || ue) return { gate_id: 2, passed: false, failure_reason: 'Could not retrieve account info', duration_ms: Date.now() - start };

  if (user.protected) return { gate_id: 2, passed: false, failure_reason: `Account @${user.username} is private — must be public`, duration_ms: Date.now() - start };

  return { gate_id: 2, passed: true, failure_reason: null, duration_ms: Date.now() - start, metadata: { username: user.username } };
}

export async function verifyGate3(tweetUrl: string): Promise<GateVerifyResult> {
  const start = Date.now();
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed.isValid) return { gate_id: 3, passed: false, failure_reason: 'Invalid tweet URL', duration_ms: Date.now() - start };

  const { tweet, error } = await getTweet(parsed.tweetId);
  if (!tweet || error) return { gate_id: 3, passed: false, failure_reason: 'Could not retrieve tweet', duration_ms: Date.now() - start };

  // Cashtag-aware (X April 2026). Accept either #gascoin hashtag OR
  // $GASCOIN cashtag via three channels:
  //   1. X API v2 `hashtags` entity (structured)
  //   2. X API v2 `cashtags` entity (structured, may or may not be populated
  //      by X yet — speculative fallback)
  //   3. Plain-text includes — guarantees correctness regardless of entity
  //      population
  const hasHashtagEntity = tweet.entities?.hashtags?.some((h) => h.tag.toLowerCase() === 'gascoin');
  const hasCashtagEntity = (tweet.entities as any)?.cashtags?.some(
    (c: any) => String(c?.tag || '').toLowerCase() === 'gascoin',
  );
  const lowerText = tweet.text.toLowerCase();
  const hasText = lowerText.includes('#gascoin') || lowerText.includes('$gascoin');

  if (!hasHashtagEntity && !hasCashtagEntity && !hasText) {
    return { gate_id: 3, passed: false, failure_reason: '#gascoin / $GASCOIN not found in tweet', duration_ms: Date.now() - start };
  }

  return {
    gate_id: 3,
    passed: true,
    failure_reason: null,
    duration_ms: Date.now() - start,
    metadata: {
      hashtag_in_entities: !!hasHashtagEntity,
      cashtag_in_entities: !!hasCashtagEntity,
    },
  };
}

export async function verifyGate4(tweetUrl: string): Promise<GateVerifyResult> {
  const start = Date.now();
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed.isValid) return { gate_id: 4, passed: false, failure_reason: 'Invalid tweet URL', duration_ms: Date.now() - start };

  const { tweet, error } = await getTweet(parsed.tweetId);
  if (!tweet || error) return { gate_id: 4, passed: false, failure_reason: 'Could not retrieve tweet', duration_ms: Date.now() - start };

  const ageMs = Date.now() - new Date(tweet.created_at).getTime();
  if (ageMs > TWEET_AGE_LIMIT_MS) {
    return { gate_id: 4, passed: false, failure_reason: `Tweet is ${Math.floor(ageMs / 3600000)} hours old — must be under 48 hours`, duration_ms: Date.now() - start };
  }

  return { gate_id: 4, passed: true, failure_reason: null, duration_ms: Date.now() - start, metadata: { tweet_age_hours: Math.floor(ageMs / 3600000), created_at: tweet.created_at } };
}

export async function verifyAllTweetGates(tweetUrl: string): Promise<GateVerifyResult[]> {
  const results: GateVerifyResult[] = [];
  for (const fn of [verifyGate1, verifyGate2, verifyGate3, verifyGate4]) {
    const r = await fn(tweetUrl);
    results.push(r);
    if (!r.passed) break;
  }
  return results;
}
