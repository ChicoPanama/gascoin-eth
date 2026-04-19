/**
 * Chat response cache — Upstash Redis, keyed by normalized question hash.
 *
 * Flow:
 *   1. Normalize the user's text (lowercase, collapse whitespace, strip punctuation).
 *   2. SHA-256 hash the normalized form → cache key `chat:q:{hash}`.
 *   3. HIT  → serve cached text via faqStreamResponse(), zero LLM tokens.
 *   4. MISS → call LLM, store response text on finish, next ask is a hit.
 *
 * What gets cached:
 *   Tier 1 (simple questions)    — always, TTL 7 days
 *   Tier 2 without wallet ctx    — yes, TTL 24h  (nuanced but not personalized)
 *   Tier 2 with wallet ctx       — no  (answer may reference wallet-specific state)
 *   Tier 3 (tool use)            — never (live data: cooldowns, claim status, balances)
 *   Tier 0 (regex FAQ)           — no  (already free, no benefit)
 */

import { createHash } from 'crypto';
import { cacheGet, cacheSet } from './cache';

const TTL_TIER1  = 60 * 60 * 24 * 7;  // 7 days  — simple answers are stable
const TTL_TIER2  = 60 * 60 * 24;       // 24 hours — complex answers slightly shorter

// ── Key derivation ─────────────────────────────────────────────────────────

/**
 * Normalize question text so minor variations ("what is sol?" vs "What is ETH")
 * resolve to the same cache key.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')   // strip punctuation → space
    .replace(/\s+/g, ' ')       // collapse whitespace
    .trim();
}

function questionKey(text: string): string {
  const hash = createHash('sha256').update(normalize(text)).digest('hex').slice(0, 16);
  return `chat:q:${hash}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns a cached LLM response for this question, or null on miss.
 * Never throws — cache failure is transparent.
 */
export async function getChatCache(question: string): Promise<string | null> {
  try {
    return await cacheGet<string>(questionKey(question));
  } catch {
    return null;
  }
}

/**
 * Store an LLM response so the next identical (or normalized-equivalent) question
 * is served from cache instead of calling the model.
 *
 * @param question  Original user text
 * @param response  Full LLM response text
 * @param tier      1 = Tier 1 (7-day TTL), 2 = Tier 2 no-wallet (24-hour TTL)
 */
export async function setChatCache(
  question: string,
  response: string,
  tier: 1 | 2,
): Promise<void> {
  if (!response.trim()) return;
  const ttl = tier === 1 ? TTL_TIER1 : TTL_TIER2;
  try {
    await cacheSet(questionKey(question), response, ttl);
  } catch {
    // Cache write failure is non-fatal
  }
}
