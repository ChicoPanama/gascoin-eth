/**
 * Redis caching layer using @upstash/redis SDK.
 *
 * Exposes cacheGet / cacheSet / cacheDel / cacheGetOrFetch / cacheMGet.
 * Single-flight coalescing in cacheGetOrFetch prevents thundering-herd
 * on cold cache keys (N concurrent misses → 1 origin call, not N).
 *
 * Falls back gracefully to no-cache if Redis is unavailable.
 * Uses the same UPSTASH_REDIS_REST_* env vars as rate-limit.ts.
 */

import { Redis } from '@upstash/redis';

// ── Client (lazy-initialized, singleton) ──────────────────────────────────
let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) {
    _redis = null;
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

// ── Core primitives ───────────────────────────────────────────────────────
async function redisGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    // SDK auto-deserializes. Force string for our own JSON parse.
    const raw = await client.get<string>(key);
    return raw == null ? null : typeof raw === 'string' ? raw : JSON.stringify(raw);
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    await client.set(key, value, { ex: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

async function redisDel(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

async function redisMGet(keys: string[]): Promise<(string | null)[]> {
  const client = getRedis();
  if (!client || keys.length === 0) return keys.map(() => null);
  try {
    const raws = await client.mget<string[]>(...keys);
    return raws.map((v) => (v == null ? null : typeof v === 'string' ? v : JSON.stringify(v)));
  } catch {
    return keys.map(() => null);
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/** Get a cached value, parsed as JSON. Returns null on miss or error. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redisGet(`gc:${key}`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Set a cached value as JSON with TTL in seconds. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  return redisSet(`gc:${key}`, JSON.stringify(value), ttlSeconds);
}

/** Delete a cached value. */
export async function cacheDel(key: string): Promise<boolean> {
  return redisDel(`gc:${key}`);
}

/**
 * Atomically increment a counter key and return the new value.
 * Sets TTL on first increment (INCR creates the key if absent).
 * Returns -1 on Redis failure — callers treat -1 as "not tracked".
 */
export async function cacheIncr(key: string, ttlSeconds: number): Promise<number> {
  const client = getRedis();
  if (!client) return -1;
  const prefixed = `gc:${key}`;
  try {
    const next = await client.incr(prefixed);
    if (next === 1) await client.expire(prefixed, ttlSeconds);
    return next;
  } catch {
    return -1;
  }
}

/**
 * Batch-fetch multiple cache keys in one round-trip (MGET).
 * Returns array parallel to input keys, with null for missing/unparseable entries.
 */
export async function cacheMGet<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const prefixed = keys.map((k) => `gc:${k}`);
  const raws = await redisMGet(prefixed);
  return raws.map((raw) => {
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  });
}

// ── Redis SET primitives ──────────────────────────────────────────────────
// Used for membership-test gates (e.g. "does this X user follow @GasCoinApp?").
// SISMEMBER is O(1) so we can make per-submission checks without hitting any
// upstream API on the hot path. The set is rebuilt periodically by a worker.

/** Test set membership. Returns false on Redis failure (fail-open so gates
 * don't flake on infra blips — caller decides policy). */
export async function cacheSetIsMember(key: string, member: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    const res = await client.sismember(`gc:${key}`, member);
    return res === 1;
  } catch {
    return false;
  }
}

/** Replace a set's contents atomically: build into a staging key, then RENAME
 * onto the destination. Prevents the empty-set window that existed between
 * DEL and the first SADD — SISMEMBER callers (e.g. follows_gascoin gate)
 * would otherwise see false negatives during a rebuild.
 * Returns the count added, or -1 on failure. */
export async function cacheSetReplace(
  key: string,
  members: string[],
  ttlSeconds: number,
): Promise<number> {
  const client = getRedis();
  if (!client) return -1;
  const prefixed = `gc:${key}`;

  // Empty-members special case: RENAME requires the source key to exist, so
  // fall back to a plain DEL rather than building an empty staging key.
  if (members.length === 0) {
    try {
      await client.del(prefixed);
      return 0;
    } catch {
      return -1;
    }
  }

  const tempKey = `gc:${key}:_staging_${Date.now()}`;
  try {
    const CHUNK = 500;
    for (let i = 0; i < members.length; i += CHUNK) {
      const slice = members.slice(i, i + CHUNK);
      if (slice.length > 0) {
        await client.sadd(tempKey, slice[0], ...slice.slice(1));
      }
    }
    // Atomic swap — RENAME replaces the destination key instantly.
    await client.rename(tempKey, prefixed);
    if (ttlSeconds > 0) await client.expire(prefixed, ttlSeconds);
    return members.length;
  } catch {
    try { await client.del(tempKey); } catch {}
    return -1;
  }
}

/** Does the set exist and have at least one member? Useful for cold-cache
 * detection — if false, caller should trigger a refresh before testing. */
export async function cacheSetExists(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    const card = await client.scard(`gc:${key}`);
    return typeof card === 'number' && card > 0;
  } catch {
    return false;
  }
}

// ── Single-flight coalescing ──────────────────────────────────────────────
// Map of in-flight fetcher promises keyed by cache key. Per-process.
// On serverless: each warm instance has its own map — still collapses N
// concurrent requests-per-instance to 1 origin call. On a single warm
// instance under traffic spike, the thundering-herd is fully eliminated.
const pendingFetches = new Map<string, Promise<unknown>>();

/**
 * Get from cache or fetch fresh value.
 *
 * Semantics:
 *   - Cache hit → return immediately.
 *   - Cache miss, no in-flight fetch → call fetcher(), cache result, return.
 *   - Cache miss, in-flight fetch for same key → wait on that fetch, return its result.
 *
 * This prevents thundering-herd: 100 concurrent requests on a cold cache
 * key only execute fetcher() once per warm instance.
 *
 * On fetcher error, the in-flight promise is cleared so the next request
 * can retry immediately (no sticky failure).
 */
export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // Coalesce concurrent misses for the same key.
  const existing = pendingFetches.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((result) => {
      // Fire-and-forget cache write — don't block the caller.
      cacheSet(key, result, ttlSeconds).catch(() => {});
      return result;
    })
    .finally(() => {
      pendingFetches.delete(key);
    });

  pendingFetches.set(key, promise);
  return promise;
}
