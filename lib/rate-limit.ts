type RateLimitResult = { ok: boolean; count: number; limit: number; remaining: number; resetSec: number; mode: 'upstash' | 'memory' };

const memStore: Map<string, { count: number; resetAt: number }> = (globalThis as any).__gascoin_rate_mem || new Map();
(globalThis as any).__gascoin_rate_mem = memStore;

async function upstashLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult | null> {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;

  const k = `ratelimit:${key}`;
  const incrRes = await fetch(`${url}/incr/${encodeURIComponent(k)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!incrRes.ok) return null;
  const incrJson = await incrRes.json() as any;
  const count = Number(incrJson?.result || 0);

  if (count === 1) {
    await fetch(`${url}/expire/${encodeURIComponent(k)}/${windowSec}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
  }

  return {
    ok: count <= limit,
    count,
    limit,
    remaining: Math.max(0, limit - count),
    resetSec: windowSec,
    mode: 'upstash'
  };
}

function memoryLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const b = memStore.get(key);
  if (!b || now >= b.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, count: 1, limit, remaining: Math.max(0, limit - 1), resetSec: windowSec, mode: 'memory' };
  }
  b.count += 1;
  memStore.set(key, b);
  return {
    ok: b.count <= limit,
    count: b.count,
    limit,
    remaining: Math.max(0, limit - b.count),
    resetSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    mode: 'memory'
  };
}

export async function checkRateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const redis = await upstashLimit(key, limit, windowSec);
  if (redis) return redis;
  return memoryLimit(key, limit, windowSec);
}
