// Thin wrapper around Vercel Runtime Cache that no-ops during `next build`
// and local dev, where `getCache()` isn't available. The break-points note
// in the optimization plan flagged this explicitly — calling getCache off
// Vercel throws, so we feature-detect via process.env.VERCEL.

import type { NextResponse } from 'next/server';

type CacheOpts = { ttl: number; tags: string[]; name?: string };

type RuntimeCache = {
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown, opts: CacheOpts) => Promise<void>;
  expireTag: (tag: string | string[]) => Promise<void>;
};

const NOOP_CACHE: RuntimeCache = {
  async get() { return undefined; },
  async set() { /* noop */ },
  async expireTag() { /* noop */ },
};

let cacheSingleton: RuntimeCache | null = null;

export function getRuntimeCache(): RuntimeCache {
  if (cacheSingleton) return cacheSingleton;
  if (!process.env.VERCEL) {
    cacheSingleton = NOOP_CACHE;
    return cacheSingleton;
  }
  try {
    // Dynamic import so local `next build` doesn't try to resolve the
    // function tree. @vercel/functions is installed but getCache() throws
    // when called outside a Vercel function runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@vercel/functions') as { getCache: () => RuntimeCache };
    cacheSingleton = mod.getCache();
  } catch {
    cacheSingleton = NOOP_CACHE;
  }
  return cacheSingleton;
}

// Wrap an expensive computation: returns cached value if present, otherwise
// runs loader, stores, and returns. Guarantees single-flight per function
// instance + per region.
export async function withRuntimeCache<T>(
  key: string,
  loader: () => Promise<T>,
  opts: CacheOpts,
): Promise<T> {
  const cache = getRuntimeCache();
  const hit = await cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  // Fire-and-forget set; don't block the response on cache write.
  cache.set(key, value, opts).catch(() => { /* cache write best-effort */ });
  return value;
}

export async function expireTags(tags: string | string[]): Promise<void> {
  const cache = getRuntimeCache();
  await cache.expireTag(tags).catch(() => { /* noop */ });
}

// Attach a response helper so we can pair Runtime Cache with Cache-Control
// headers without duplicating logic.
export function markCached(res: NextResponse, keyForDebug: string): NextResponse {
  if (process.env.VERCEL) {
    res.headers.set('X-Runtime-Cache', keyForDebug);
  }
  return res;
}
