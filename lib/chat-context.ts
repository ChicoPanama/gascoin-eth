/**
 * Chat agent context enrichment.
 *
 * Three runtime context layers injected into every chat request:
 *   1. RAG  — keyword → tag search over safe KB categories
 *   2. Wallet — recent claim + payout status from Supabase
 *   3. Memory — rolling conversation summary in Redis (per wallet, 2h TTL)
 *
 * All three are best-effort: failures return '' and never throw.
 * Fraud detection thresholds and architecture details are intentionally
 * excluded (SAFE_CATEGORIES filter).
 */

import { searchKB, getKBEntry } from './knowledge-base';
import { cacheGet, cacheSet, cacheGetOrFetch } from './cache';
import { getSupabaseAdmin } from './supabase';
import { getCachedFlags, searchMemories, type CachedFlags, type Mem0Memory } from './mem0';

// Shared Redis key for mem0 search results — both buildMem0Context and
// fetchMem0Prefs (in chat-user-profile.ts) read from this key so only
// one searchMemories API call is made per request, even in Promise.all.
export const MEM0_CHAT_CACHE_KEY = (wallet: string) => `chat:mem0:${wallet}`;
export const MEM0_CHAT_TTL = 300; // 5 minutes

// mem0 categories safe to surface in the user-facing chat agent.
// Excludes fraud_signals, referral_ring_flag, ban_state (detection internals).
const MEM0_SAFE_CHAT = new Set(['misc', 'claim_verdict', 'payout_event', 'tier_change']);

// KB categories safe to surface in the user-facing chat agent.
// Includes treasury so the agent can answer payout queue questions.
// Excludes: fraud_pattern, architecture, intelligence_report (contain detection internals).
const SAFE_CATEGORIES = new Set(['policy', 'gate_rule', 'decision', 'treasury']);

// ── 1. RAG ────────────────────────────────────────────────────────────────────

/** Map words in the user message to KB tags for targeted search. */
export function extractQueryTags(text: string): string[] {
  const s = text.toLowerCase();
  const tags: string[] = [];
  if (/\bgate\b|verif|check|fail|pass|reject|block/.test(s))         tags.push('gate_rule');
  if (/policy|rule|require|eligib|must\b|allowed/.test(s))            tags.push('policy');
  if (/cooldown|how.?long|wait|timer|expir|reset/.test(s))            tags.push('cooldown');
  if (/\btier\b|token|hold|standard|commuter|road.warrior|fleet/.test(s)) tags.push('tier');
  if (/receipt|photo|picture|image|pen|handwrit|scan|write/.test(s))  tags.push('receipt');
  if (/tweet|twitter|x\.com|hashtag|post|public|follow|account/.test(s)) tags.push('tweet');
  if (/payout|pay\b|sol\b|dispat|transfer|money|crypto|funds/.test(s)) tags.push('payout');
  if (/refer|invite|code|friend|share/.test(s))                        tags.push('referral');
  if (/point|streak|leaderboard|rank|earn|reward/.test(s))             tags.push('points');
  if (/submit|submission|step|how.to|start|begin|claim/.test(s))       tags.push('submission');
  return [...new Set(tags)];
}

/** Fetch relevant KB entries and return them as an injected context block. */
export async function buildKBContext(userMessage: string): Promise<string> {
  const tags = extractQueryTags(userMessage);
  if (tags.length === 0) return '';
  try {
    const entries = await searchKB(tags);
    const safe = entries.filter(e => SAFE_CATEGORIES.has(e.category));
    if (safe.length === 0) return '';
    const lines = safe
      .slice(0, 4)
      .map(e => `• ${e.title}: ${e.content.replace(/\s+/g, ' ').slice(0, 200)}`);
    return `\n\n[POLICY KNOWLEDGE]\n${lines.join('\n')}`;
  } catch {
    return '';
  }
}

// ── 2. Live wallet context ────────────────────────────────────────────────────

type ClaimRow = {
  status: string;
  created_at: string;
  decision_reason?: string | null;
  amount_usd?: number | null;
};

/** Query recent claims for a wallet and return a compact context block. */
export async function buildWalletContext(wallet: string): Promise<string> {
  if (!wallet) return '';
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('claims')
      .select('status, created_at, decision_reason, amount_usd')
      .eq('wallet', wallet)
      .order('created_at', { ascending: false })
      .limit(5);

    const rows = (data || []) as ClaimRow[];
    const abbrev =
      wallet.length > 8
        ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
        : wallet;

    if (rows.length === 0) {
      return `\n\n[USER STATUS]\nWallet: ${abbrev} — No submissions on record.`;
    }

    const lines = [`\n\n[USER STATUS]`, `Wallet: ${abbrev}`];
    for (const c of rows) {
      const d = new Date(c.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const amt = c.amount_usd != null ? ` ($${c.amount_usd.toFixed(2)})` : '';
      const why = c.decision_reason ? ` — ${c.decision_reason}` : '';
      lines.push(`• ${d}: ${c.status}${amt}${why}`);
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ── 3. Conversation memory ────────────────────────────────────────────────────

const MEMORY_TTL = 7200; // 2 hours
const MEMORY_WINDOW = 900; // max chars stored (rolling)

/** Load prior conversation summary from Redis. */
export async function loadConvMemory(wallet: string): Promise<string> {
  if (!wallet) return '';
  try {
    const mem = await cacheGet<string>(`chat:conv:${wallet}`);
    if (!mem) return '';
    return `\n\n[PRIOR CONTEXT WITH THIS USER]\n${mem}`;
  } catch {
    return '';
  }
}

/** Append latest exchange to the rolling memory summary. Fire-and-forget safe. */
export async function saveConvMemory(
  wallet: string,
  userText: string,
  assistantText: string,
): Promise<void> {
  if (!wallet) return;
  try {
    const existing = (await cacheGet<string>(`chat:conv:${wallet}`)) || '';
    const exchange = `Q: ${userText.slice(0, 120)}\nA: ${assistantText.slice(0, 220)}`;
    const updated = existing
      ? `${existing}\n\n${exchange}`.slice(-MEMORY_WINDOW)
      : exchange;
    await cacheSet(`chat:conv:${wallet}`, updated, MEMORY_TTL);
  } catch {
    // best-effort — never block
  }
}

// ── 4. mem0 entity profile ────────────────────────────────────────────────────

/**
 * Inject user's mem0 profile into the system prompt.
 *
 * Two data sources run in parallel:
 *   1. Redis flags (from intelligence aggregator, 15-min TTL) — trust trajectory,
 *      risk flags, ban state. Fast path — zero mem0 API calls on hit.
 *   2. Direct mem0 search (5-min Redis TTL, shared with fetchMem0Prefs) — chat
 *      history, support interactions, claim verdicts. Surfaces persistent memory
 *      for users whose aggregator cache is cold (new users, low-activity wallets).
 *
 * Categories never surfaced: fraud_signals, referral_ring_flag, ban_state,
 * pipeline_anomaly (contain detection internals). Safe: misc, claim_verdict,
 * payout_event, tier_change.
 */
export async function buildMem0Context(wallet: string): Promise<string> {
  if (!wallet) return '';
  try {
    const [flags, memories] = await Promise.all([
      getCachedFlags(wallet).catch(() => null),
      cacheGetOrFetch(
        MEM0_CHAT_CACHE_KEY(wallet),
        () => searchMemories('wallet', wallet,
          'support chat history gate failures preferences payout cooldown tier',
          { limit: 8 },
        ),
        MEM0_CHAT_TTL,
      ).catch(() => [] as Mem0Memory[]),
    ]);

    const parts: string[] = [];

    // ── 1. Intelligence aggregator flags (Redis) ──────────────────────────
    if (flags) {
      parts.push(`Trust: ${flags.trajectory}`);
      if (flags.riskFlags.length > 0) {
        // Never expose internal signal names — just flag the account.
        parts.push('Status: flagged for review');
      }
      if (flags.trustLevel === 'suspicious') {
        parts.push('NOTE: Account flagged. Recommend DM @GasCoinApp on X for direct support.');
      }
    }

    // ── 2. Direct mem0 memories (chat history, verdicts, prefs) ──────────
    const safe = (memories as Mem0Memory[])
      .filter(m => {
        const cat = String((m.metadata as Record<string, unknown>)?.category ?? '');
        return !cat || MEM0_SAFE_CHAT.has(cat);
      })
      .filter(m => (m.memory || '').length > 8)
      .slice(0, 5);

    if (safe.length > 0) {
      // Surface as inline history — agent gets persistent cross-session memory
      parts.push('History: ' + safe.map(m => m.memory.slice(0, 140)).join(' | '));
    }

    if (parts.length === 0) return '';
    return `\n\n[ACCOUNT INTELLIGENCE]\n${parts.join('\n')}`;
  } catch {
    return '';
  }
}

// ── 5. Gate-specific KB enrichment ────────────────────────────────────────────

/**
 * Fetch targeted KB entries for specific failed gates.
 * Used by the getClaimStatus tool to inject precise fix instructions
 * into the tool result rather than relying on the model's static knowledge.
 */
export async function getGateKBEntries(gateNames: string[]): Promise<string> {
  if (gateNames.length === 0) return '';
  try {
    // Gate names in DB are like "wallet_chars", "receipt_hashtag", etc.
    // KB slugs follow the pattern "gate-{name}" or just the gate name.
    const entries = await Promise.all(
      gateNames.slice(0, 5).map(name => getKBEntry(`gate-${name}`).catch(() => null))
    );
    // Filter to safe categories only — never expose fraud_pattern or architecture entries
    const found = entries.filter(e => e && SAFE_CATEGORIES.has(e.category));
    if (found.length === 0) return '';

    const lines = found.map(e => `• ${e!.title}: ${e!.content.replace(/\s+/g, ' ').slice(0, 300)}`);
    return '\n\n[FIX INSTRUCTIONS]\n' + lines.join('\n');
  } catch {
    return '';
  }
}

// ── Util ──────────────────────────────────────────────────────────────────────

/**
 * Extract plain text from the last user message.
 * Handles both UIMessage format (parts[]) and ModelMessage format (content).
 */
export function extractLastUserText(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown>;
    if (msg.role !== 'user') continue;
    if (Array.isArray(msg.parts)) {
      return (msg.parts as Array<{ type: string; text?: string }>)
        .filter(p => p.type === 'text')
        .map(p => p.text ?? '')
        .join('');
    }
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.content)) {
      return (msg.content as Array<{ type: string; text?: string }>)
        .filter(p => p.type === 'text')
        .map(p => p.text ?? '')
        .join('');
    }
  }
  return '';
}
