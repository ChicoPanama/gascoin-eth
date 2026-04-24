/**
 * Gas Network Piece 3 — Intelligence API gating.
 *
 * $GAS-balance-tiered access to the /api/v1/* surface. Each API key
 * is tied to a wallet at creation; the key's effective tier is the
 * wallet's live GASCOIN balance at request time (Redis-cached 75s via
 * getWalletGascoinBalance). Keys themselves are stored hashed in
 * Supabase (`api_keys` table); callers send the plaintext key as
 * `x-gascoin-api-key` header and it's SHA-256'd for lookup.
 *
 * Per-tier limits are enforced via the existing Upstash rate-limit
 * module (`checkRateLimit`) using a 24h sliding window.
 */

import { createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { getWalletGascoinBalance } from './integrations/ethereum';
import { checkRateLimit } from './rate-limit';

// ── Tier definitions ─────────────────────────────────────────────────

export type ApiTier = 'free' | 'builder' | 'agency' | 'enterprise';

export interface ApiTierConfig {
  minGascoin: number;
  /** Requests per 24h rolling window */
  dailyRequests: number;
  /** Rank — higher grants access to lower-rank-gated endpoints */
  rank: number;
  /** Human-readable label for docs / billing */
  label: string;
  /** Field groups that this tier may see on responses */
  fields: Array<'basic' | 'impact' | 'audience' | 'history' | 'signed'>;
}

export const API_TIERS: Record<ApiTier, ApiTierConfig> = {
  free: {
    minGascoin: 0,
    dailyRequests: 10,
    rank: 0,
    label: 'Free',
    fields: ['basic'],
  },
  builder: {
    minGascoin: 1_000,
    dailyRequests: 1_000,
    rank: 1,
    label: 'Builder',
    fields: ['basic', 'impact'],
  },
  agency: {
    minGascoin: 100_000,
    dailyRequests: 10_000,
    rank: 2,
    label: 'Agency',
    fields: ['basic', 'impact', 'audience', 'history'],
  },
  enterprise: {
    minGascoin: 1_000_000,
    dailyRequests: 100_000,
    rank: 3,
    label: 'Enterprise',
    fields: ['basic', 'impact', 'audience', 'history', 'signed'],
  },
};

// ── Pure helpers (easy to unit-test) ─────────────────────────────────

export function tierForBalance(balance: number): ApiTier {
  const b = Math.max(0, Number(balance) || 0);
  if (b >= API_TIERS.enterprise.minGascoin) return 'enterprise';
  if (b >= API_TIERS.agency.minGascoin) return 'agency';
  if (b >= API_TIERS.builder.minGascoin) return 'builder';
  return 'free';
}

export function hasTierAccess(actual: ApiTier, required: ApiTier): boolean {
  return API_TIERS[actual].rank >= API_TIERS[required].rank;
}

// Field allowlists per tier. Record keys are matched against payload
// property names (top-level and nested via dot paths).
const FREE_FIELDS = new Set([
  'handle', 'wallet', 'wallet_short',
  'is_verified', 'creator_tier', 'linked_at', 'first_seen_at',
  'followers_count', 'total_posts', 'total_impressions',
]);
const BUILDER_FIELDS = new Set([
  ...FREE_FIELDS,
  'impact_score', 'total_eth_earned', 'total_paid_claims',
  'direct_payout_eth', 'referral_payout_eth', 'referred_wallets',
  'avg_quality_score', 'bio', 'x_location',
]);
const AGENCY_FIELDS = new Set([
  ...BUILDER_FIELDS,
  'audience_signals', 'history', 'engagement_consistency',
  'audience_growth_rate', 'content_authenticity',
  'recent_posts', 'referral_conversions',
]);
const ENTERPRISE_FIELDS = new Set([
  ...AGENCY_FIELDS,
  'signed_envelope',
]);

// Fields never emitted regardless of tier.
const NEVER_FIELDS = new Set([
  'sensitive_internal', 'api_key_hash', 'internal_trust_raw',
  'gate_scoring_weights', 'private_address_list',
]);

function fieldsForTier(tier: ApiTier): Set<string> {
  if (tier === 'enterprise') return ENTERPRISE_FIELDS;
  if (tier === 'agency') return AGENCY_FIELDS;
  if (tier === 'builder') return BUILDER_FIELDS;
  return FREE_FIELDS;
}

export function filterForTier<T extends Record<string, unknown>>(
  record: T,
  tier: ApiTier,
): Record<string, unknown> {
  const allowed = fieldsForTier(tier);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (NEVER_FIELDS.has(k)) continue;
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

// ── API key storage + lookup ─────────────────────────────────────────

export interface ApiKeyRecord {
  id: string;
  wallet: string;
  tier: ApiTier;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

/** Generate a new API key. Returns the plaintext ONCE; only hash is stored. */
export function generateApiKey(): { plaintext: string; hash: string } {
  // Format: gcn_<base64url 32 bytes> — ~43 chars total. Easily recognizable
  // in logs + scanners.
  const secret = randomBytes(32).toString('base64url');
  const plaintext = `gcn_${secret}`;
  const hash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, hash };
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Resolve a plaintext API key → record + live-computed tier from wallet
 * balance. Returns null if the key is unknown, expired, or revoked.
 */
export async function resolveApiKey(plaintext: string): Promise<
  | (ApiKeyRecord & { liveTier: ApiTier; gascoinBalance: number })
  | null
> {
  if (!plaintext || !plaintext.startsWith('gcn_')) return null;
  const hash = hashApiKey(plaintext);

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return null;
  }

  const { data } = await supabase
    .from('api_keys')
    .select('id,wallet,tier,created_at,last_used_at,expires_at,revoked_at')
    .eq('key_hash', hash)
    .maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;

  // Live tier check — actual access is the MIN of stored tier and current
  // balance-derived tier. Prevents stale keys from retaining rights after
  // the wallet sells down.
  const balance = await getWalletGascoinBalance(data.wallet).catch(() => 0);
  const liveTier = tierForBalance(balance);
  const actualRank = Math.min(API_TIERS[data.tier as ApiTier].rank, API_TIERS[liveTier].rank);
  const actualTier = (Object.entries(API_TIERS).find(([, v]) => v.rank === actualRank)?.[0] || 'free') as ApiTier;

  // Fire-and-forget update of last_used_at
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {}, () => {});

  return {
    id: data.id,
    wallet: data.wallet,
    tier: actualTier,
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at,
    expiresAt: data.expires_at,
    revokedAt: data.revoked_at,
    liveTier,
    gascoinBalance: balance,
  };
}

// ── Per-key rate limiting ────────────────────────────────────────────

/**
 * Check that the key hasn't exceeded its 24h quota. Returns the
 * remaining requests as well so callers can surface via headers.
 */
export async function checkApiQuota(
  keyId: string,
  tier: ApiTier,
): Promise<{ ok: boolean; remaining: number; resetSec: number }> {
  const limit = API_TIERS[tier].dailyRequests;
  const rl = await checkRateLimit(`apiquota:${keyId}`, limit, 24 * 60 * 60);
  return {
    ok: rl.ok,
    remaining: Math.max(0, rl.remaining),
    resetSec: rl.resetSec,
  };
}

// ── Request helper (used by every v1 route) ──────────────────────────

export interface GatingResult {
  ok: boolean;
  error?: string;
  status?: number;
  tier?: ApiTier;
  keyId?: string;
  wallet?: string;
  remaining?: number;
  resetSec?: number;
}

export async function gateRequest(
  req: Request,
  requiredTier: ApiTier = 'free',
): Promise<GatingResult> {
  const plaintext = req.headers.get('x-gascoin-api-key')
    || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || '';
  if (!plaintext) {
    return { ok: false, error: 'missing_api_key', status: 401 };
  }

  const resolved = await resolveApiKey(plaintext);
  if (!resolved) {
    return { ok: false, error: 'invalid_api_key', status: 401 };
  }

  if (!hasTierAccess(resolved.tier, requiredTier)) {
    return {
      ok: false,
      error: 'insufficient_tier',
      status: 403,
      tier: resolved.tier,
    };
  }

  const quota = await checkApiQuota(resolved.id, resolved.tier);
  if (!quota.ok) {
    return {
      ok: false,
      error: 'quota_exceeded',
      status: 429,
      tier: resolved.tier,
      remaining: 0,
      resetSec: quota.resetSec,
    };
  }

  return {
    ok: true,
    tier: resolved.tier,
    keyId: resolved.id,
    wallet: resolved.wallet,
    remaining: quota.remaining,
    resetSec: quota.resetSec,
  };
}
