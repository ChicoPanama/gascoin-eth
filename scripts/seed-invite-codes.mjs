#!/usr/bin/env node
/**
 * scripts/seed-invite-codes.mjs — Season 1 beta invite generator
 *
 * Generates N single-use invite codes and inserts them into the
 * `invite_codes` Supabase table. Prints them to stdout in a format
 * suitable for copy/pasting into a DM or spreadsheet.
 *
 * Usage:
 *   node scripts/seed-invite-codes.mjs --count 20
 *   node scripts/seed-invite-codes.mjs --count 5 --notes "TG batch 1"
 *   node scripts/seed-invite-codes.mjs --count 10 --created-by "admin:chico"
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 * Pull them with:
 *   vercel env pull .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Load .env.local if present ──────────────────────────────────
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* env file optional */
}

// ─── CLI args ────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1];
}

const count = Number(flag('count', '10'));
const notes = flag('notes', null);
const createdBy = flag('created-by', 'script:seed-invite-codes');

if (!Number.isInteger(count) || count <= 0 || count > 500) {
  console.error('--count must be an integer between 1 and 500');
  process.exit(1);
}

// ─── Code format: GC-XXXX-XXXX (alphanumeric, human-copyable) ────
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for legibility
function generateCode() {
  const pick = (n) => {
    const buf = randomBytes(n);
    let out = '';
    for (let i = 0; i < n; i++) out += CHARSET[buf[i] % CHARSET.length];
    return out;
  };
  return `GC-${pick(4)}-${pick(4)}`;
}

// ─── Supabase client ─────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run: vercel env pull .env.local');
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

// ─── Generate + insert ───────────────────────────────────────────
const codes = Array.from({ length: count }, () => ({
  code: generateCode(),
  created_by: createdBy,
  notes,
}));

const { data, error } = await supabase
  .from('invite_codes')
  .insert(codes)
  .select('code');

if (error) {
  console.error('Insert failed:', error.message);
  process.exit(1);
}

// ─── Print results ───────────────────────────────────────────────
console.log(`\n✓ Generated ${data.length} invite code${data.length === 1 ? '' : 's'}`);
if (notes) console.log(`  Notes: ${notes}`);
console.log(`  Created by: ${createdBy}`);
console.log('\n── Codes ──────────────────────────────\n');
for (const row of data) console.log(`  ${row.code}`);
console.log('\n── End ────────────────────────────────\n');
console.log('Distribute these via DM, tweet, or a private channel.');
console.log('Each code is single-use: once a tester redeems it, no one else can.\n');
