/**
 * Rate limiting layer using @upstash/ratelimit (Lua-backed, atomic).
 *
 * Fixes the old two-call race (INCR + EXPIRE were separate round-trips).
 * The SDK executes a single Lua script for atomic increment + expiry.
 *
 * Preserves the same checkRateLimit(key, limit, windowSec) API so every
 * existing call site (proxy.ts + 10 route handlers) keeps working without
 * changes.
 *
 * Falls back to in-process memory store if Upstash is unavailable.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

type RateLimitResult = {
  ok: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetSec: number;
  mode: 'upstash' | 'memory';
};

// ── Memory fallback (shared across modules via globalThis) ────────────────
const memStore: Map<string, { count: number; resetAt: number }> =
  (globalThis as any).__gascoin_rate_mem || new Map();
(globalThis as any).__gascoin_rate_mem = memStore;

// ── Upstash client (lazy, singleton) ──────────────────────────────────────
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

// ── Rate-limiter cache (one Ratelimit instance per (limit, window) combo) ─
// @upstash/ratelimit ties the window/limit into the constructor, so we
// memoize instances to avoid recreating them on every call.
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSec: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${limit}:${windowSec}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      // fixedWindow matches the previous INCR-based semantics exactly.
      limiter: Ratelimit.fixedWindow(limit, `${windowSec} s`),
      analytics: false,
      prefix: 'gc:ratelimit',
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

// ── Upstash path ──────────────────────────────────────────────────────────
async function upstashLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult | null> {
  const limiter = getLimiter(limit, windowSec);
  if (!limiter) return null;

  try {
    const res = await limiter.limit(key);
    // res: { success, limit, remaining, reset (ms epoch) }
    const resetSec = Math.max(0, Math.ceil((res.reset - Date.now()) / 1000));
    return {
      ok: res.success,
      count: limit - res.remaining,
      limit: res.limit,
      remaining: res.remaining,
      resetSec: resetSec || windowSec,
      mode: 'upstash',
    };
  } catch {
    return null;
  }
}

// ── Memory path ───────────────────────────────────────────────────────────
function memoryLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const b = memStore.get(key);
  if (!b || now >= b.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return {
      ok: true,
      count: 1,
      limit,
      remaining: Math.max(0, limit - 1),
      resetSec: windowSec,
      mode: 'memory',
    };
  }
  b.count += 1;
  memStore.set(key, b);
  return {
    ok: b.count <= limit,
    count: b.count,
    limit,
    remaining: Math.max(0, limit - b.count),
    resetSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    mode: 'memory',
  };
}

// ── Public API (stable — don't change the shape) ─────────────────────────
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const redis = await upstashLimit(key, limit, windowSec);
  if (redis) return redis;
  return memoryLimit(key, limit, windowSec);
}
