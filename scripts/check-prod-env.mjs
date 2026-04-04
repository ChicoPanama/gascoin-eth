import fs from 'fs';
import path from 'path';

const file = process.argv[2] || '.env.local';
const full = path.resolve(process.cwd(), file);
if (!fs.existsSync(full)) {
  console.error(`Missing env file: ${full}`);
  process.exit(1);
}

const text = fs.readFileSync(full, 'utf8');
const kv = {};
for (const line of text.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  kv[line.slice(0, i)] = line.slice(i + 1);
}

const required = [
  'NEXT_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'X_BEARER_TOKEN',
  'X_STRICT_MODE',
  'SOLANA_RPC_URL',
  'GASCOIN_MINT',
  'GASCOIN_TREASURY_WALLET',
  'ENABLE_LIVE_PAYOUT',
  'REVIEWER_API_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN'
];

const missing = required.filter((k) => !kv[k] || !String(kv[k]).trim());

console.log(JSON.stringify({ file: full, missing, ok: missing.length === 0 }, null, 2));
if (missing.length) process.exit(2);
