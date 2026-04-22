import { NextResponse } from 'next/server';

/**
 * Attach standard public-read cache headers to a NextResponse.
 *
 * Sets both:
 *   - `Cache-Control` — browser + any intermediary cache
 *   - `Vercel-CDN-Cache-Control` — Vercel edge cache (overrides browser-only directive)
 *
 * Usage:
 *   return withPublicCache(NextResponse.json(data), { sMaxAge: 300 });
 *
 * Pairs with PR #33 / #34 cache work — this is the browser + edge layer
 * upstream of Upstash/mem0/Supabase caches that sit behind.
 */
export function withPublicCache<T extends NextResponse>(
  res: T,
  opts: {
    /** Shared-cache max-age in seconds (CDN + public caches). */
    sMaxAge: number;
    /** stale-while-revalidate window. Defaults to 2x sMaxAge. */
    staleWhileRevalidate?: number;
    /** Allow browser to cache privately too. Defaults to false — prefer CDN freshness. */
    browserMaxAge?: number;
  },
): T {
  const swr = opts.staleWhileRevalidate ?? opts.sMaxAge * 2;
  const browser = opts.browserMaxAge ?? 0;

  const browserDirective =
    browser > 0
      ? `public, max-age=${browser}, stale-while-revalidate=${swr}`
      : `public, s-maxage=${opts.sMaxAge}, stale-while-revalidate=${swr}`;

  res.headers.set('Cache-Control', browserDirective);
  res.headers.set(
    'Vercel-CDN-Cache-Control',
    `public, s-maxage=${opts.sMaxAge}, stale-while-revalidate=${swr}`,
  );
  return res;
}
