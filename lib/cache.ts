/**
 * Redis caching layer using Upstash REST API.
 * Falls back gracefully to no-cache if Redis is unavailable.
 * Uses the same Upstash env vars as rate-limit.ts.
 */

function getRedisConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url, token };
}

async function redisGet(key: string): Promise<string | null> {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    return json?.result ?? null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const cfg = getRedisConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${ttlSeconds}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function redisDel(key: string): Promise<boolean> {
  const cfg = getRedisConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/del/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

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
 * Get from cache or fetch fresh value.
 * If cache misses, calls fetcher() and caches the result.
 * On any error, returns fetcher() result without caching.
 */
export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  // Fire-and-forget cache write — don't block on it
  cacheSet(key, fresh, ttlSeconds).catch(() => {});
  return fresh;
}
