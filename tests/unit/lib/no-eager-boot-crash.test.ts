/**
 * Regression guard: no lib/* file may throw at module-import time when env
 * vars are missing.
 *
 * This test exists because of the PR #39 post-mortem: `lib/supabase-client.ts`
 * eagerly constructed a Supabase client at module-load time, and that crashed
 * the CI build (and would have crashed any cold-start lambda with missing env
 * vars). We missed it for weeks because CI was silently red behind a billing
 * hold.
 *
 * Rule: every `lib/*.ts` file must be safely importable with empty env. If a
 * module needs a client, it must construct it lazily (see the getter pattern
 * in lib/rate-limit.ts, lib/cache.ts, lib/supabase.ts, lib/integrations/privy.ts,
 * and — after PR #39 — lib/supabase-client.ts).
 *
 * If this test starts failing, it means someone added a new eager boot-time
 * crash surface. The fix is to convert it to a lazy getter, not to whitelist
 * the file here.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const LIB_DIR = join(__dirname, '..', '..', '..', 'lib');

// Files we deliberately skip: scripts that run standalone (not imported by
// the app) or that legitimately require env vars at import time for their
// single-purpose CLI nature.
const SKIP_PATTERNS: RegExp[] = [
  /\.d\.ts$/,
  /\.test\.ts$/,
  /\/__tests__\//,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (full.endsWith('.ts') && !SKIP_PATTERNS.some((p) => p.test(full))) {
      out.push(full);
    }
  }
  return out;
}

// Snapshot env we care about so the test doesn't leak into the rest of the
// suite. We null these out, import every lib file, then restore.
const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'NEXT_PUBLIC_GASCOIN_MINT_ADDRESS',
  'GASCOIN_TREASURY_WALLET',
];

describe('lib/* no-eager-boot-crash guard', () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const k of ENV_KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterAll(() => {
    for (const k of ENV_KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  const files = walk(LIB_DIR);

  // Sanity check: make sure we actually found files. If the walk is broken
  // this test would trivially pass and hide regressions.
  it('discovers lib files to import', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const rel = relative(join(__dirname, '..', '..', '..'), file);
    it(`${rel} imports without throwing when env is empty`, async () => {
      // Dynamic import so each file is a separate module evaluation.
      await expect(import(file)).resolves.toBeDefined();
    });
  }
});
