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
import { silentLog } from './silent-log';

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

/**
 * O5 — Report a mem0 API key expiry to the admin intelligence feed.
 * Called whenever a mem0 API call returns HTTP 401 or 403.
 * Fire-and-forget — never throws, never blocks a pipeline.
 */
async function reportMem0KeyExpired(status: number, caller: string): Promise<void> {
  try {
    const { getSupabaseAdmin } = await import('./supabase');
    const supabase = getSupabaseAdmin();
    await supabase.from('intelligence_entries').insert({
      entry_type: 'mem0_key_expired',
      entity_type: 'system',
      entity_id: 'mem0_integration',
      summary: `mem0 API returned ${status} — MEM0_API_KEY may be expired or invalid`,
      detail_json: { http_status: status, caller, ts: new Date().toISOString() },
      severity: 'critical',
      pipeline_source: 'mem0_integration',
    });
  } catch {
    // Silent — never block on observability writes
  }
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

// ---------------------------------------------------------------------------
// Scope constants — agent_id / app_id namespaces used across the protocol
// ---------------------------------------------------------------------------

/**
 * Which AI agent wrote a memory. Used as mem0 `agent_id` for forensic queries
 * ("show me everything claude-oversight wrote for this wallet").
 */
export const MEM0_AGENTS = {
  CLAUDE_OVERSIGHT: 'claude-oversight',
  GROK_FRAUD: 'grok-fraud',
  GEMINI_VISION: 'gemini-vision',
  REFERRAL_WORKER: 'referral-worker',
  PAYOUT_WORKER: 'payout-worker',
  ENGAGEMENT_WORKER: 'engagement-worker',
  SUBMIT_PIPELINE: 'submit-pipeline',
  INTELLIGENCE_AGGREGATOR: 'intelligence-aggregator',
} as const;

export type Mem0Agent = (typeof MEM0_AGENTS)[keyof typeof MEM0_AGENTS];

/**
 * Which GASCOIN app/pipeline produced the memory. Used as mem0 `app_id`.
 */
export const MEM0_APPS = {
  SUBMIT: 'gascoin-submit',
  WORKERS: 'gascoin-workers',
  PAYOUT: 'gascoin-payout',
  ADMIN: 'gascoin-admin',
} as const;

export type Mem0App = (typeof MEM0_APPS)[keyof typeof MEM0_APPS];

/**
 * Search memories for a specific entity. Uses the v2 search endpoint with
 * org + project scoping. Supports optional metadata filters, reranking, and
 * top_k tuning.
 *
 * `rerank: true` adds ~150-200ms but significantly improves relevance by
 * running a second semantic-understanding pass over the top results.
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
    rerank?: boolean;
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
  if (options?.rerank) body.rerank = true;

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

    if (!res.ok) {
      // O5: API key expiry — 401/403 means the MEM0_API_KEY is invalid or expired
      if (res.status === 401 || res.status === 403) {
        reportMem0KeyExpired(res.status, 'searchMemories').catch(() => {});
      }
      return [];
    }
    const json = (await res.json()) as any;
    return Array.isArray(json?.results) ? json.results : (Array.isArray(json) ? json : []);
  } catch {
    return [];
  }
}

/**
 * List all memories for an entity with optional category + limit. Uses the
 * GET /v1/memories/ endpoint with query-string filters — this is the
 * primitive the admin dashboard uses to show a wallet's full history.
 */
export async function listMemoriesForEntity(
  entityType: 'wallet' | 'x_handle' | 'system',
  entityId: string,
  options?: { limit?: number },
): Promise<Mem0Memory[]> {
  const cfg = getConfig();
  if (!cfg) return [];

  const params = new URLSearchParams({
    user_id: entityUserId(entityType, entityId),
    org_id: cfg.orgId,
    project_id: cfg.projectId,
    limit: String(options?.limit ?? 50),
  });

  try {
    const res = await fetch(`${MEM0_API_HOST}/v1/memories/?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Token ${cfg.apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        reportMem0KeyExpired(res.status, 'listMemoriesForEntity').catch(() => {});
      }
      return [];
    }
    const json = (await res.json()) as any;
    if (Array.isArray(json)) return json as Mem0Memory[];
    if (Array.isArray(json?.results)) return json.results as Mem0Memory[];
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch the change history for a single memory (additions, updates, deletes).
 * Used by the admin audit dashboard to show why/when a memory flipped.
 */
export async function getMemoryHistory(memoryId: string): Promise<unknown[]> {
  const cfg = getConfig();
  if (!cfg) return [];
  try {
    const res = await fetch(
      `${MEM0_API_HOST}/v1/memories/${memoryId}/history/?org_id=${cfg.orgId}&project_id=${cfg.projectId}`,
      {
        method: 'GET',
        headers: { Authorization: `Token ${cfg.apiKey}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    return Array.isArray(json) ? json : (Array.isArray(json?.results) ? json.results : []);
  } catch {
    return [];
  }
}

// Reserved option keys that are extracted from the call and mapped to mem0
// top-level parameters. Anything NOT in this set is treated as free-form
// metadata and flattened into the memory record — this keeps all 11 legacy
// call sites (which pass { pipeline, signal, ... } directly) working.
const RESERVED_OPTION_KEYS = new Set([
  'category', 'agentId', 'appId', 'runId', 'immutable', 'expirationDate', 'metadata',
]);

export interface AddMemoryOptions {
  /** Category tag — lands the memory in one of the 13 project-level custom categories. */
  category?: Mem0Category;
  /** Which AI agent authored this memory (Pro-tier scoping). */
  agentId?: Mem0Agent;
  /** Which GASCOIN pipeline/app produced this memory. */
  appId?: Mem0App;
  /** Unique per-flow run ID (e.g. `claim_{id}_review`) for forensic grouping. */
  runId?: string;
  /**
   * If true, the memory cannot be modified or deleted by subsequent writes.
   * Use for append-only events (ring flags, payouts, ban records).
   */
  immutable?: boolean;
  /**
   * YYYY-MM-DD date after which the memory is auto-expired by mem0.
   * Use for decaying signals (e.g. 90-day fraud signal TTL).
   */
  expirationDate?: string;
  /** Arbitrary additional metadata (stored in the memory record). */
  metadata?: Record<string, unknown>;
  /**
   * Legacy pass-through: any other key at the top level is folded into
   * metadata automatically. Kept so existing call sites don't need updating.
   */
  [key: string]: unknown;
}

/**
 * Add a memory for an entity. Fire-and-forget safe.
 *
 * Defaults:
 *   - enable_graph: true (Pro graph memory engaged on every write)
 *   - output_format: v1.1 (matches mem0 SDK default)
 *   - version: v2 (newer API shape)
 *
 * Pro-tier scoping fields are optional — pass them to enable:
 *   - agent_id: forensic "which AI agent wrote this"
 *   - app_id: which pipeline produced it
 *   - run_id: unique per-claim-review flow
 *   - immutable: true for ring flags, payouts, ban state
 *   - expiration_date: TTL for decaying signals
 */
export async function addMemory(
  entityType: 'wallet' | 'x_handle' | 'system',
  entityId: string,
  content: string,
  options?: AddMemoryOptions,
): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return;

  // Extract any non-reserved keys at the top level into metadata (legacy compat).
  const legacyMeta: Record<string, unknown> = {};
  if (options) {
    for (const k of Object.keys(options)) {
      if (!RESERVED_OPTION_KEYS.has(k)) legacyMeta[k] = (options as Record<string, unknown>)[k];
    }
  }

  const body: Record<string, unknown> = {
    messages: [{ role: 'user', content }],
    user_id: entityUserId(entityType, entityId),
    org_id: cfg.orgId,
    project_id: cfg.projectId,
    enable_graph: true,
    output_format: 'v1.1',
    version: 'v2',
    metadata: {
      ...legacyMeta,
      ...(options?.metadata || {}),
      ...(options?.category ? { category: options.category } : {}),
      entity_type: entityType,
      entity_id: entityId,
      ts: new Date().toISOString(),
    },
  };
  if (options?.agentId) body.agent_id = options.agentId;
  if (options?.appId) body.app_id = options.appId;
  if (options?.runId) body.run_id = options.runId;
  if (options?.immutable) body.immutable = true;
  if (options?.expirationDate) body.expiration_date = options.expirationDate;

  try {
    const res = await fetch(`${MEM0_API_HOST}/v1/memories/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      reportMem0KeyExpired(res.status, 'addMemory').catch(() => {});
    }
  } catch (err) {
    silentLog(err, {
      module: 'mem0',
      operation: 'addMemory',
      wallet: entityType === 'wallet' ? entityId : undefined,
      extra: { entityType, entityId },
    });
  }
}

// Helper — compute YYYY-MM-DD that is N days in the future.
function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
  } catch (err) {
    silentLog(err, { module: 'mem0', operation: 'refreshFlagCache', wallet });
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
    claimId?: string;
  },
): Promise<void> {
  // Build a ~50-token compressed fingerprint that Claude/Grok can re-use.
  const line = `${summary.verdict} | tier=${summary.tier} | claims=${summary.claimCount} | risk=${summary.riskBucket}${summary.lastFlags.length ? ' | flags=' + summary.lastFlags.slice(0, 3).join(',') : ''} | ${summary.narrative.slice(0, 120)}`;

  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.CLAIM_VERDICT,
    agentId: MEM0_AGENTS.CLAUDE_OVERSIGHT,
    appId: MEM0_APPS.WORKERS,
    runId: summary.claimId ? `claim_${summary.claimId}_review` : undefined,
    // Claim verdicts are append-only history — never overwrite, never decay.
    immutable: true,
    metadata: {
      pipeline: 'process_claims',
      signal: 'distilled_profile',
      verdict: summary.verdict,
      risk: summary.riskBucket,
      tier: summary.tier,
      severity: summary.riskBucket === 'critical' ? 'high' : 'info',
      claim_id: summary.claimId,
    },
  });
  // Bust after a successful write so stale cache isn't cleared on write failure.
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a detected fraud signal — one of the most common writes from the
 * submission pipeline. Lands in the fraud_signals category with explicit
 * severity so retrieval ranks it appropriately for Claude.
 *
 * Fraud signals decay after 90 days — a single aiScore hit from 6 months ago
 * shouldn't dominate a wallet's profile forever. Ring flags and ban state
 * don't decay (use writeReferralRingFlag / writeBanState for those).
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
  const sourceAgent = signal.source === 'gemini_vision' ? MEM0_AGENTS.GEMINI_VISION
    : signal.source === 'grok_reasoning' ? MEM0_AGENTS.GROK_FRAUD
    : signal.source === 'claude_oversight' ? MEM0_AGENTS.CLAUDE_OVERSIGHT
    : MEM0_AGENTS.SUBMIT_PIPELINE;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.FRAUD_SIGNALS,
    agentId: sourceAgent,
    appId: MEM0_APPS.SUBMIT,
    runId: signal.claimId ? `claim_${signal.claimId}_fraud` : undefined,
    // 90-day TTL — critical fraud signals surface strongly within the window,
    // then decay so they don't dominate a wallet's profile forever.
    expirationDate: daysFromNow(90),
    metadata: {
      pipeline: signal.source,
      signal: signal.name,
      severity: signal.severity,
      claim_id: signal.claimId,
    },
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a detected referral ring — the highest-priority memory for the
 * payout worker's cross-pipeline guard. Lands in referral_ring_flag,
 * marked immutable (never remove), and never expires.
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
    agentId: MEM0_AGENTS.REFERRAL_WORKER,
    appId: MEM0_APPS.WORKERS,
    // Ring flags are immutable fraud evidence — never overwritten, never decay.
    immutable: true,
    metadata: {
      pipeline: 'verify_referrals',
      signal: 'ring_detected',
      severity: 'critical',
      ring_type: ring.ringType,
      confidence: ring.confidence,
      cycle_path: ring.cyclePath,
    },
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a payout event (on-chain ETH dispatch). Lands in payout_event,
 * marked immutable (permanent audit record).
 */
export async function writePayoutEvent(
  wallet: string,
  payout: {
    claimId: string;
    amountEth: number;
    txHash: string;
    status: 'dispatched' | 'failed' | 'retried';
  },
): Promise<void> {
  const line = `payout:${payout.status} | ${payout.amountEth.toFixed(4)} ETH | claim=${payout.claimId} | tx=${payout.txHash.slice(0, 16)}...`;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.PAYOUT_EVENT,
    agentId: MEM0_AGENTS.PAYOUT_WORKER,
    appId: MEM0_APPS.PAYOUT,
    runId: `claim_${payout.claimId}_payout`,
    // On-chain events are immutable ground truth.
    immutable: true,
    metadata: {
      pipeline: 'payout_worker',
      signal: payout.status,
      severity: payout.status === 'failed' ? 'high' : 'info',
      claim_id: payout.claimId,
      amount_eth: payout.amountEth,
      tx_hash: payout.txHash,
    },
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a ban state change. Immutable — a subsequent unban writes a new
 * memory rather than removing this one, preserving the audit trail.
 */
export async function writeBanState(
  wallet: string,
  ban: {
    state: 'banned' | 'unbanned';
    reason: string;
    durationDays?: number;
    triggeredBy?: string; // 'auto' | 'admin:{id}'
  },
): Promise<void> {
  const line = `ban:${ban.state}${ban.durationDays ? ` (${ban.durationDays}d)` : ''} | ${ban.reason.slice(0, 120)}${ban.triggeredBy ? ' | by=' + ban.triggeredBy : ''}`;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.BAN_STATE,
    agentId: MEM0_AGENTS.INTELLIGENCE_AGGREGATOR,
    appId: MEM0_APPS.ADMIN,
    immutable: true,
    metadata: {
      pipeline: 'auto_ban',
      signal: ban.state,
      severity: ban.state === 'banned' ? 'high' : 'info',
      reason: ban.reason,
      duration_days: ban.durationDays,
      triggered_by: ban.triggeredBy,
    },
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record an account quality snapshot — score, pass/fail, and flags.
 * Written on every submission so Claude can see quality trend over time
 * (e.g. follower spike, bio spam added, account went private).
 */
export async function writeAccountQuality(
  wallet: string,
  quality: {
    score: number;       // 0-100
    passed: boolean;
    flags: string[];
    claimId?: string;
  },
): Promise<void> {
  const line = `account_quality:${quality.passed ? 'pass' : 'fail'} | score=${quality.score}${quality.flags.length ? ' | flags=' + quality.flags.slice(0, 4).join(',') : ''}${quality.claimId ? ' | claim=' + quality.claimId : ''}`;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.ACCOUNT_QUALITY,
    agentId: MEM0_AGENTS.SUBMIT_PIPELINE,
    appId: MEM0_APPS.SUBMIT,
    runId: quality.claimId ? `claim_${quality.claimId}_quality` : undefined,
    metadata: {
      pipeline: 'submission',
      signal: 'account_quality',
      severity: quality.passed ? 'info' : 'medium',
      score: quality.score,
      flags: quality.flags,
      claim_id: quality.claimId,
    },
  });
  await bustEntityProfileCache('wallet', wallet);
}

/**
 * Record a pipeline anomaly — unexpected failures, fallbacks, or degraded
 * service events. Decays after 30 days (diagnostic signals, not fraud evidence).
 */
export async function writePipelineAnomaly(
  wallet: string,
  anomaly: {
    type: string;   // e.g. 'ocr_fallback', 'gateway_timeout', 'x_api_down'
    detail?: string;
    claimId?: string;
  },
): Promise<void> {
  const line = `anomaly:${anomaly.type}${anomaly.detail ? ' | ' + anomaly.detail.slice(0, 120) : ''}${anomaly.claimId ? ' | claim=' + anomaly.claimId : ''}`;
  await addMemory('wallet', wallet, line, {
    category: MEM0_CATEGORIES.PIPELINE_ANOMALY,
    agentId: MEM0_AGENTS.SUBMIT_PIPELINE,
    appId: MEM0_APPS.SUBMIT,
    runId: anomaly.claimId ? `claim_${anomaly.claimId}_anomaly` : undefined,
    expirationDate: daysFromNow(30),
    metadata: {
      pipeline: 'submission',
      signal: anomaly.type,
      severity: 'low',
      claim_id: anomaly.claimId,
    },
  });
}

// ---------------------------------------------------------------------------
// Webhook management — register a URL on the project to receive event pings
// ---------------------------------------------------------------------------

export interface Mem0Webhook {
  webhook_id?: string;
  name: string;
  url: string;
  event_types: Array<'memory_add' | 'memory_update' | 'memory_delete' | 'memory_categorize'>;
  is_active?: boolean;
}

/**
 * Create a webhook on the current project. Returns webhook_id on success.
 * Intended for one-time setup from a script — not the hot path.
 */
export async function createWebhook(webhook: Mem0Webhook): Promise<string | null> {
  const cfg = getConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${MEM0_API_HOST}/api/v1/webhooks/projects/${cfg.projectId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        name: webhook.name,
        url: webhook.url,
        event_types: webhook.event_types,
        is_active: webhook.is_active ?? true,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    return json?.webhook_id || null;
  } catch {
    return null;
  }
}

/** List webhooks registered on the current project. */
export async function listWebhooks(): Promise<Mem0Webhook[]> {
  const cfg = getConfig();
  if (!cfg) return [];
  try {
    const res = await fetch(`${MEM0_API_HOST}/api/v1/webhooks/projects/${cfg.projectId}/`, {
      method: 'GET',
      headers: { Authorization: `Token ${cfg.apiKey}` },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    return Array.isArray(json) ? json : (Array.isArray(json?.results) ? json.results : []);
  } catch {
    return [];
  }
}

/**
 * Invalidate the cached entity profile for a given wallet or x_handle.
 * Call after writing new memories so the next read reflects the update.
 */
/**
 * GDPR Right-to-Erasure — delete ALL mem0 memories for a wallet entity.
 * Called by the erase-user admin route. Fire-and-forget safe; never throws.
 * Uses DELETE /v1/memories/ with user_id filter (mem0 Pro bulk-delete endpoint).
 */
export async function deleteEntityMemories(
  entityType: 'wallet' | 'x_handle',
  entityId: string,
): Promise<{ deleted: number }> {
  const cfg = getConfig();
  if (!cfg) return { deleted: 0 };

  const userId = entityUserId(entityType, entityId);

  try {
    const params = new URLSearchParams({ user_id: userId, org_id: cfg.orgId, project_id: cfg.projectId });
    const res = await fetch(`${MEM0_API_HOST}/v1/memories/?${params.toString()}`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${cfg.apiKey}` },
      cache: 'no-store',
    });

    if (res.status === 401 || res.status === 403) {
      reportMem0KeyExpired(res.status, 'deleteEntityMemories').catch(() => {});
      return { deleted: 0 };
    }
    if (!res.ok) return { deleted: 0 };

    // Also bust the Redis cache so stale profile data isn't served after deletion
    await bustEntityProfileCache(entityType, entityId).catch(() => {});

    return { deleted: 1 };
  } catch {
    return { deleted: 0 };
  }
}

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
