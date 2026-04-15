import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client.
 *
 * This file intentionally does NOT construct the client at module-load time.
 * Eager construction used to crash the Next.js build whenever
 * `NEXT_PUBLIC_SUPABASE_URL` was a non-URL string (literal `"placeholder"` in
 * CI, empty string in fresh checkouts, typos during env rotation, etc.) —
 * see PR #39 post-mortem.
 *
 * Instead we lazy-construct a real client on the first property access, using
 * safe placeholder fallbacks if env vars are missing. This means:
 *
 *   - Static prerender never touches Supabase (no crash surface).
 *   - Callers keep the same ergonomic API: `supabaseBrowser.from('...')`.
 *   - Missing env vars degrade to a dummy client that 401s at runtime
 *     instead of exploding at build time — much easier to debug.
 *
 * Mirrors the lazy-getter pattern already used by:
 *   - `lib/rate-limit.ts`     (Upstash Redis)
 *   - `lib/cache.ts`          (Upstash Redis)
 *   - `lib/integrations/privy.ts` (Privy)
 *   - `lib/supabase.ts`       (service-role Supabase)
 */

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url =
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() ||
    'https://placeholder.supabase.co';
  const key =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() ||
    'placeholder-anon-key';
  _client = createClient(url, key);
  return _client;
}

/**
 * Lazy proxy: looks and feels like a SupabaseClient, but the real client is
 * only constructed on first property access. Module import is side-effect free.
 */
export const supabaseBrowser: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, prop) {
      const client = getClient();
      const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
    },
  }
);
