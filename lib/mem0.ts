/**
 * mem0 Cloud API Client — GASCOIN production runtime
 *
 * Persistent memory for cross-pipeline intelligence. Stores synthesized
 * signals per wallet/X-handle — not raw data (that stays in Supabase).
 *
 * Entity key convention:
 *   wallet:{address}  — per-wallet intelligence
 *   x:{handle}        — per-X-account intelligence
 *   system:gascoin    — system-wide patterns
 *
 * Pro-tier features engaged:
 *   - Dedicated project (`gascoin-production`) — separate from personal dev memories
 *   - Graph memory (enable_graph: true) — entity relationship traversal
 *   - 13 custom categories — fraud_signals, wallet_trust_trajectory, claim_verdict, etc.
 *   - Custom fact-extraction instructions — tuned to GASCOIN pipeline events
 *   - Custom update instructions — controls how memories merge on conflict
 *   - v2 search API — advanced metadata filtering
 *
 * Every function returns safe defaults on failure. Never throws.
 * Never blocks a pipeline.
 */

import { cacheGet, cacheSet, cacheGetOrFetch } from './cache';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MEM0_API_HOST = 'https://api.mem0.ai';

/**
 * The 13 GASCOIN-specific mem0 categories, configured on the
 * `gascoin-production` mem0 project. Pass one of these as `category` in
 * metadata to ensure the memory lands in the right bucket for retrieval.
 */
export const MEM0_CATEGORIES = {
  WALLET_TRUST_TRAJECTORY: 'wallet_trust_trajectory',
  CLAIM_VERDICT: 'claim_verdict',
  FRAUD_SIGNALS: 'fraud_signals',
  REFERRAL_RING_FLAG: 'referral_ring_flag',
  TIER_CHANGE: 'tier_change',
  ENGAGEMENT_PATTERN: 'engagement_pattern',
  PAYOUT_EVENT: 'payout_event',
  ACCOUNT_QUALITY: 'account_quality',
  GEO_SIGNAL: 'geo_signal',
  COOLDOWN_WINDOW: 'cooldown_window',
  BAN_STATE: 'ban_state',
  PIPELINE_ANOMALY: 'pipeline_anomaly',
  MISC: 'misc',
} as const;

export type Mem0Category = (typeof MEM0_CATEGORIES)[keyof typeof MEM0_CATEGORIES];

type Mem0Config = {
  apiKey: string;
  orgId: string;
  projectId: string;
};

function getConfig(): Mem0Config | null {
  const apiKey = (process.env.MEM0_API_KEY || '').trim();
  if (!apiKey) return null;
  const orgId = (process.env.MEM0_ORG_ID || '').trim();
  const projectId = (process.env.MEM0_PROJECT_ID || '').trim();
  // Both org_id and project_id must be set to proper mem0 platform IDs.
  // A missing or string-named projectId silently disables the integration.
  if (!orgId || !projectId.startsWith('proj_')) return null;
  return { apiKey, orgId, projectId };
}

export function isMem0Available(): boolean {
  return getConfig() !== null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Mem0Memory {
  id: string;
  memory: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EntityProfile {
  trust_trajectory: 'improving' | 'stable' | 'declining' | 'new';
  cross_pipeline_flags: string[];
  last_fraud_signals: Array<{ pipeline: string; signal: string; at: string }>;
  velocity: { submissions_7d: number; points_7d: number; referrals_7d: number };
  claude_narratives: string[];
  notable_patterns: string[];
}

export interface CachedFlags {
  riskFlags: string[];
  trustLevel: string;
  trajectory: string;
}

// ---------------------------------------------------------------------------
// Entity key helpers
// ---------------------------------------------------------------------------

function entityUserId(entityType: 'wallet' | 'x_handle' | 'system', entityId: string): string {
  switch (entityType) {
    case 'wallet': return `wallet:${entityId}`;
    case 'x_handle': return `x:${entityId}`;
    case 'system': return `system:${entityId}`;
  }
}

// ---------------------------------------------------------------------------
// Core API functions
// ---------------------------------------------------------------------------

/**
 * Search memories for a specific entity. Uses the v2 search endpoint with
 * org + project scoping. Supports optional metadata filters to narrow by
 * category, pipeline, or severity.
 */
export async function searchMemories(
  entityType: 'wallet' | 'x_handle' | 'system',
  entityId: string,
  query?: string,
  options?: {
    limit?: number;
    category?: Mem0Category;
    pipeline?: string;
    sinceIso?: string;
  },
): Promise<Mem0Memory[]> {
  const cfg = getConfig();
  if (!cfg) return [];

  const filters: Record<string, unknown> = {
    user_id: entityUserId(entityType, entityId),
  };
  // NOTE: per-call category filtering via the v2 /memories/search/ endpoint
  // is not reliable as of 2026-04-12 — mem0 accepts the {in:[...]} shape but
  // returns 0 results even when the memory is tagged with that category in
  // metadata. Callers should fetch unfiltered and classify in TypeScript
  // (getEntityProfile does this). The category metadata is still stored
  // correctly on writes and is used by mem0's custom_instructions during
  // extraction — it just isn't queryable yet.
  if (options?.category) filters.categories = { in: [options.category] };

  const body: Record<string, unknown> = {
    query: query || `all signals for ${entityType} ${entityId}`,
    filters,
    limit: options?.limit ?? 20,
    org_id: cfg.orgId,
    project_id: cfg.projectId,
  };

  try {
    const res = await fetch(`${MEM0_API_HOST}/v2/memories/search/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const json = (await res.json()) as any;
    return Array.isArray(json?.results) ? json.results : (Array.isArray(json) ? json : []);
  } catch {
    return [];
  }
}

/**
 * Add a memory for an entity. Fire-and-forget safe.
 *
 * Defaults:
 *   - enable_graph: true (Pro graph memory engaged on every write)
 *   - output_format: v1.1 (matches mem0 SDK default)
 *   - version: v2 (newer API shape)
 *
 * Pass a `category` in metadata (one of MEM0_CATEGORIES) so the memory lands
 * in the right bucket for retrieval by Claude oversight.
 */
export async function addMemory(
  entityType: 'wallet' | 'x_handle' | 'system',
  entityId: string,
  content: string,
  metadata?: Record<string, unknown> & { category?: Mem0Category },
): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return;

  try {
    await fetch(`${MEM0_API_HOST}/v1/memories/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        user_id: entityUserId(entityType, entityId),
        org_id: cfg.orgId,
        project_id: cfg.projectId,
        enable_graph: true,
        output_format: 'v1.1',
        version: 'v2',
        metadata: {
          ...metadata,
          entity_type: entityType,
          entity_id: entityId,
          ts: new Date().toISOString(),
        },
      }),
      cache: 'no-store',
    });
  } catch {
    // Silent failure — never block a pipeline
  }
}

// ---------------------------------------------------------------------------
// Entity profile synthesis
// ---------------------------------------------------------------------------

const EMPTY_PROFILE: EntityProfile = {
  trust_trajectory: 'new',
  cross_pipeline_flags: [],
  last_fraud_signals: [],
  velocity: { submissions_7d: 0, points_7d: 0, referrals_7d: 0 },
  claude_narratives: [],
  notable_patterns: [],
};

/**
 * Build a synthesized entity profile from mem0 memories.
 * Classifies memories by pipeline metadata and extracts cross-pipeline signals.
 *
 * Two-layer cache:
 *   1. Upstash Redis (15-min TTL) — hot-path reads, single-flight coalescing
 *   2. In-memory across this call stack (not used — Upstash handles it)
 *
 * Invalidate via bustEntityProfileCache(entityType, entityId) after writes.
 */
export async function getEntityProfile(
  entityType: 'wallet' | 'x_handle',
  entityId: string,
): Promise<EntityProfile> {
  return cacheGetOrFetch(
    `mem0:profile:${entityType}:${entityId}`,
    () => buildEntityProfile(entityType, entityId),
    900, // 15 minutes
  );
}

async function buildEntityProfile(
  entityType: 'wallet' | 'x_handle',
  entityId: string,
): Promise<EntityProfile> {
  const memories = await searchMemories(entityType, entityId);
  if (memories.length === 0) return { ...EMPTY_PROFILE };

  const flags: string[] = [];
  const fraudSignals: EntityProfile['last_fraud_signals'] = [];
  const narratives: string[] = [];
  const patterns: string[] = [];
  let submissions7d = 0;
  let points7d = 0;
  let referrals7d = 0;
  let positiveSignals = 0;
  let negativeSignals = 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const mem of memories) {
    const meta = mem.metadata || {};
    const pipeline = String(meta.pipeline || '');
    const signal = String(meta.signal || '');
    const memText = mem.memory || '';
    const memDate = mem.updated_at || mem.created_at || '';

    // Cross-pipeline flags
    if (signal === 'ring_detected' || signal === 'banned' || signal === 'payout_blocked') {
      flags.push(`${pipeline}:${signal}`);
      negativeSignals++;
    }
    if (signal === 'trust_decline' || signal === 'handle_change') {
      flags.push(`${pipeline}:${signal}`);
      negativeSignals++;
    }

    // Fraud signals
    if (signal && (signal.includes('ring') || signal.includes('banned') || signal.includes('blocked'))) {
      fraudSignals.push({ pipeline, signal, at: memDate });
    }

    // Claude narratives
    if (pipeline === 'process_claims' && meta.verdict) {
      narratives.push(memText.slice(0, 200));
      if (meta.verdict === 'approve') positiveSignals++;
      else negativeSignals++;
    }

    // Velocity (7-day window)
    if (memDate >= sevenDaysAgo) {
      if (pipeline === 'submission') submissions7d++;
      if (pipeline === 'engagement') {
        const pts = Number(meta.points) || 0;
        points7d += pts;
      }
      if (pipeline === 'referral') referrals7d++;
    }

    // Notable patterns
    if (memText.includes('spam=true') || memText.includes('bot=true')) {
      patterns.push('engagement_manipulation');
    }
    if (memText.includes('trust_decline') || memText.includes('Trust score dropped')) {
      patterns.push('declining_trust');
    }
    if (signal === 'ring_detected') {
      patterns.push('referral_ring');
    }

    // Positive signals for trajectory
    if (pipeline === 'payout' && memText.includes('Payout sent')) {
      positiveSignals++;
    }
  }

  // Determine trust trajectory
  let trajectory: EntityProfile['trust_trajectory'] = 'new';
  if (memories.length >= 3) {
    if (negativeSignals === 0 && positiveSignals >= 2) trajectory = 'improving';
    else if (negativeSignals > positiveSignals) trajectory = 'declining';
    else trajectory = 'stable';
  }

  return {
    trust_trajectory: trajectory,
    cross_pipeline_flags: [...new Set(flags)],
    last_fraud_signals: fraudSignals.slice(0, 5),
    velocity: { submissions_7d: submissions7d, points_7d: points7d, referrals_7d: referrals7d },
    claude_narratives: narratives.slice(0, 3),
    notable_patterns: [...new Set(patterns)],
  };
}

// ---------------------------------------------------------------------------
// Redis flag cache (for hot-path reads)
// ---------------------------------------------------------------------------

const FLAG_CACHE_TTL = 900; // 15 minutes

/**
 * Write synthesized mem0 signals to Redis for hot-path reads.
 * Called by the intelligence aggregator worker.
 */
export async function refreshFlagCache(wallet: string): Promise<void> {
  try {
    const profile = await getEntityProfile('wallet', wallet);
    const cached: CachedFlags = {
      riskFlags: profile.cross_pipeline_flags,
      trustLevel: profile.trust_trajectory === 'declining' ? 'suspicious' : 'normal',
      trajectory: profile.trust_trajectory,
    };
    await cacheSet(`mem0:wallet:${wallet}`, cached, FLAG_CACHE_TTL);
  } catch {
    // Silent failure
  }
}

/**
 * Read cached flags from Redis. Never calls mem0 API.
 * Returns null on cache miss (no flags = no concern).
 */
export async function getCachedFlags(wallet: string): Promise<CachedFlags | null> {
  return cacheGet<CachedFlags>(`mem0:wallet:${wallet}`);
}

// ---------------------------------------------------------------------------
// mem0 as context compressor
// ---------------------------------------------------------------------------

/**
 * Write a distilled post-decision summary back to mem0 so the NEXT claim for
 * this wallet gets a pre-compressed profile instead of replaying raw history.
 *
 * This pattern compounds with provider-native prompt caching: the stable
 * system prompt stays cached while only a tiny summary (~50 tokens) varies
 * per claim, maximizing Anthropic/Gemini cache hit rate.
 *
 * Fire-and-forget — never blocks the pipeline.
 */
export async function writeDistilledProfile(
  wallet: string,
  summary: {
    verdict: 'approve' | 'flag' | 'reject';
    riskBucket: 'low' | 'medium' | 'high' | 'critical';
    tier: string;
    claimCount: number;
    lastFlags: string[];
    narrative: string; // Claude's one-line explanation of the decision
  },
): Promise<void> {
  // Build a ~50-token compressed fingerprint that Claude/Grok can re-use.
  const line = `${summary.verdict} | tier=${summary.tier} | claims=${summary.claimCount} | risk=${summary.riskBucket}${summary.lastFlags.length ? ' | flags=' + summary.lastFlags.slice(0, 3).join(',') : ''} | ${summary.narrative.slice(0, 120)}`;

  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.CLAIM_VERDICT,
    pipeline: 'process_claims',
    signal: 'distilled_profile',
    verdict: summary.verdict,
    risk: summary.riskBucket,
    tier: summary.tier,
    severity: summary.riskBucket === 'critical' ? 'high' : 'info',
  });

  // Bust the Upstash profile cache so the next read gets the fresh distillation.
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a detected fraud signal — one of the most common writes from the
 * submission pipeline. Lands in the fraud_signals category with explicit
 * severity so retrieval ranks it appropriately for Claude.
 */
export async function writeFraudSignal(
  wallet: string,
  signal: {
    name: string; // e.g. "aiScore_0.82", "no_exif_data", "screen_dimensions"
    source: 'gemini_vision' | 'grok_reasoning' | 'heuristic' | 'claude_oversight';
    severity: 'low' | 'medium' | 'high' | 'critical';
    detail?: string;
    claimId?: string;
  },
): Promise<void> {
  const line = `fraud:${signal.name} | source=${signal.source} | severity=${signal.severity}${signal.claimId ? ' | claim=' + signal.claimId : ''}${signal.detail ? ' | ' + signal.detail.slice(0, 100) : ''}`;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.FRAUD_SIGNALS,
    pipeline: signal.source,
    signal: signal.name,
    severity: signal.severity,
    claim_id: signal.claimId,
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a detected referral ring — the highest-priority memory for the
 * payout worker's cross-pipeline guard. Lands in referral_ring_flag.
 */
export async function writeReferralRingFlag(
  wallet: string,
  ring: {
    ringType: 'circular' | 'chain' | 'cluster';
    confidence: number;
    cyclePath: string[]; // involved wallets
    reason: string;
  },
): Promise<void> {
  const line = `ring:${ring.ringType} | confidence=${ring.confidence.toFixed(2)} | nodes=${ring.cyclePath.length} | ${ring.reason.slice(0, 120)}`;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.REFERRAL_RING_FLAG,
    pipeline: 'verify_referrals',
    signal: 'ring_detected',
    severity: 'critical',
    ring_type: ring.ringType,
    confidence: ring.confidence,
    cycle_path: ring.cyclePath,
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a payout event (on-chain SOL dispatch). Lands in payout_event and
 * is appended, never replaced.
 */
export async function writePayoutEvent(
  wallet: string,
  payout: {
    claimId: string;
    amountSol: number;
    txHash: string;
    status: 'dispatched' | 'failed' | 'retried';
  },
): Promise<void> {
  const line = `payout:${payout.status} | ${payout.amountSol.toFixed(4)} SOL | claim=${payout.claimId} | tx=${payout.txHash.slice(0, 16)}...`;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.PAYOUT_EVENT,
    pipeline: 'payout_worker',
    signal: payout.status,
    severity: payout.status === 'failed' ? 'high' : 'info',
    claim_id: payout.claimId,
    amount_sol: payout.amountSol,
    tx_hash: payout.txHash,
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Invalidate the cached entity profile for a given wallet or x_handle.
 * Call after writing new memories so the next read reflects the update.
 */
export async function bustEntityProfileCache(
  entityType: 'wallet' | 'x_handle',
  entityId: string,
): Promise<void> {
  try {
    // Set a 1-second sentinel so the next cacheGetOrFetch hit misses and
    // re-fetches from mem0. Cleaner than exposing a DEL primitive.
    await cacheSet(`mem0:profile:${entityType}:${entityId}`, null as any, 1);
  } catch {
    // Silent — cache freshness is best-effort.
  }
}
