import fs from 'fs';
import path from 'path';

const file = process.argv.find((a) => a.endsWith('.env') || a.includes('.env.')) || '.env.local';
const modeArg = process.argv.find((a) => a.startsWith('--mode='));
const mode = (modeArg?.split('=')[1] || 'pretoken').toLowerCase(); // pretoken | full

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
  kv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const core = [
  'NEXT_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'X_BEARER_TOKEN',
  'X_STRICT_MODE',
  'SOLANA_RPC_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'ENABLE_LIVE_PAYOUT'
];

const tokenLive = ['GASCOIN_MINT', 'GASCOIN_TREASURY_WALLET'];
const fullLive = ['TREASURY_PRIVATE_KEY_B58'];

const required = mode === 'full' ? [...core, ...tokenLive, ...fullLive] : [...core];
const missing = required.filter((k) => !kv[k]);

const warnings = [];
if (mode === 'pretoken') {
  if (!kv.GASCOIN_MINT) warnings.push('GASCOIN_MINT not set (expected pre-token launch)');
  if (!kv.GASCOIN_TREASURY_WALLET) warnings.push('GASCOIN_TREASURY_WALLET not set (expected pre-token launch)');
}
if (String(kv.ENABLE_LIVE_PAYOUT).toLowerCase() === 'true' && !kv.TREASURY_PRIVATE_KEY_B58) {
  warnings.push('ENABLE_LIVE_PAYOUT=true but TREASURY_PRIVATE_KEY_B58 missing');
}

const out = {
  mode,
  file: full,
  ok: missing.length === 0,
  missing,
  warnings
};
console.log(JSON.stringify(out, null, 2));
if (missing.length) process.exit(2);
