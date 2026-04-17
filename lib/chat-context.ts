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
import { cacheGet, cacheSet } from './cache';
import { getSupabaseAdmin } from './supabase';
import { getCachedFlags, type CachedFlags } from './mem0';

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
 * Inject user's mem0 profile summary (trust trajectory, active flags) into
 * the system prompt. Uses getCachedFlags which reads from Redis (15-min TTL,
 * populated by the intelligence aggregator worker). Zero mem0 API calls.
 *
 * Never exposes fraud algorithm internals — only surfaces:
 *   - Trust trajectory (improving/stable/declining/new)
 *   - Active risk flags (ban state, ring flags) — so the agent knows
 *     to escalate to DM support instead of troubleshooting a banned user
 */
export async function buildMem0Context(wallet: string): Promise<string> {
  if (!wallet) return '';
  try {
    const flags: CachedFlags | null = await getCachedFlags(wallet);
    if (!flags) return ''; // no cached profile = new user or cold cache

    const lines: string[] = ['\n\n[ACCOUNT INTELLIGENCE]'];
    lines.push(`Trust: ${flags.trajectory}`);
    if (flags.riskFlags.length > 0) {
      // Sanitize flag names — never expose internal signal taxonomy to the LLM.
      // The agent only needs to know the account is flagged, not why.
      lines.push('Status: account flagged for review');
    }
    if (flags.trustLevel === 'suspicious') {
      lines.push('NOTE: This account is flagged. If they report issues, recommend DMing @GasCoinApp on X for direct support.');
    }
    return lines.join('\n');
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
