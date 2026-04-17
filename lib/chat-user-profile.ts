/**
 * Per-user agentic profile for the chat agent.
 *
 * Assembles a UserChatProfile from:
 *   1. Supabase claims — submission count, last status, streak, cooldown
 *   2. On-chain token balance → tier
 *   3. mem0 — preferred language, past support topics (persistent cross-session)
 *
 * Cached in Redis per wallet, 30-min TTL. First load populates the cache;
 * subsequent chat requests within the window hit Redis only.
 *
 * All functions return safe defaults on failure. Never throws.
 */

import { cacheGetOrFetch } from './cache';
import { getSupabaseAdmin } from './supabase';
import { getTokenBalanceServer } from './token-balance';
import { searchMemories, addMemory, MEM0_CATEGORIES, MEM0_APPS } from './mem0';

// ── Tier thresholds (mirrors lib/policy.ts) ──────────────────────────────────

const TIER_THRESHOLDS = [
  { name: 'Fleet',        min: 10_000_000, cooldownDays: 1.75, perWeek: 4 },
  { name: 'Road Warrior', min:  5_000_000, cooldownDays: 3.5,  perWeek: 2 },
  { name: 'Commuter',     min:    100_000, cooldownDays: 7,     perWeek: 1 },
  { name: 'Standard',     min:          1, cooldownDays: 7,     perWeek: 1 },
] as const;

function getTierInfo(balance: number) {
  for (const t of TIER_THRESHOLDS) {
    if (balance >= t.min) return t;
  }
  return null;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserChatProfile {
  /** Abbreviated wallet: "Fg8x...k9Qp" */
  walletShort: string;
  /** Token tier name or null if below minimum */
  tier: string | null;
  /** GASCOIN token balance */
  tokenBalance: number;
  /** Total approved claims */
  totalClaims: number;
  /** Current streak count (consecutive submission windows) */
  streakCount: number;
  /** Last claim status: approved, rejected, pending, processing, etc. */
  lastClaimStatus: string | null;
  /** Last claim date as ISO string */
  lastClaimDate: string | null;
  /** Cooldown: hours until next eligible submission, 0 = can submit now */
  cooldownHoursLeft: number;
  /** User's preferred language detected from past interactions (null = English/unknown) */
  preferredLanguage: string | null;
  /** Recent support topics the user has asked about (e.g. "gate 10", "cooldown") */
  recentTopics: string[];
  /** Whether this is a first-time user with no history */
  isNewUser: boolean;
}

const EMPTY_PROFILE: UserChatProfile = {
  walletShort: '',
  tier: null,
  tokenBalance: 0,
  totalClaims: 0,
  streakCount: 0,
  lastClaimStatus: null,
  lastClaimDate: null,
  cooldownHoursLeft: 0,
  preferredLanguage: null,
  recentTopics: [],
  isNewUser: true,
};

const PROFILE_TTL = 1800; // 30 minutes

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Load the user's chat profile. Cached in Redis for 30 minutes.
 * Returns EMPTY_PROFILE on cache miss + build failure (safe default).
 */
export async function getUserChatProfile(wallet: string): Promise<UserChatProfile> {
  if (!wallet) return { ...EMPTY_PROFILE };
  return cacheGetOrFetch(
    `chat:profile:${wallet}`,
    () => buildProfile(wallet),
    PROFILE_TTL,
  );
}

// ── Profile builder ──────────────────────────────────────────────────────────

async function buildProfile(wallet: string): Promise<UserChatProfile> {
  const walletShort = wallet.length > 8
    ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
    : wallet;

  // Fetch all data sources in parallel
  const [claimsResult, balanceResult, mem0Result] = await Promise.all([
    fetchClaimsSummary(wallet),
    getTokenBalanceServer(wallet).catch(() => null),
    fetchMem0Prefs(wallet),
  ]);

  const balance = balanceResult?.uiAmount ?? 0;
  const tierInfo = getTierInfo(balance);

  // Calculate cooldown
  let cooldownHoursLeft = 0;
  if (claimsResult.lastClaimDate && tierInfo) {
    const lastDate = new Date(claimsResult.lastClaimDate);
    const expiresAt = new Date(lastDate.getTime() + tierInfo.cooldownDays * 86_400_000);
    const msLeft = expiresAt.getTime() - Date.now();
    cooldownHoursLeft = msLeft > 0 ? Math.ceil(msLeft / 3_600_000) : 0;
  }

  return {
    walletShort,
    tier: tierInfo?.name ?? null,
    tokenBalance: balance,
    totalClaims: claimsResult.totalClaims,
    streakCount: claimsResult.streakCount,
    lastClaimStatus: claimsResult.lastClaimStatus,
    lastClaimDate: claimsResult.lastClaimDate,
    cooldownHoursLeft,
    preferredLanguage: mem0Result.language,
    recentTopics: mem0Result.topics,
    isNewUser: claimsResult.totalClaims === 0,
  };
}

// ── Supabase claims summary ──────────────────────────────────────────────────

interface ClaimsSummary {
  totalClaims: number;
  streakCount: number;
  lastClaimStatus: string | null;
  lastClaimDate: string | null;
}

async function fetchClaimsSummary(wallet: string): Promise<ClaimsSummary> {
  try {
    const supabase = getSupabaseAdmin();

    // Last 20 claims — enough to calculate streak and summary
    const { data } = await supabase
      .from('claims')
      .select('status, created_at')
      .eq('wallet', wallet)
      .order('created_at', { ascending: false })
      .limit(20);

    const rows = (data || []) as Array<{ status: string; created_at: string }>;
    if (rows.length === 0) {
      return { totalClaims: 0, streakCount: 0, lastClaimStatus: null, lastClaimDate: null };
    }

    // Count approved claims
    const approved = rows.filter(r => r.status === 'approved' || r.status === 'paid');

    // Calculate streak — consecutive approved claims from most recent
    let streakCount = 0;
    for (const r of rows) {
      if (r.status === 'approved' || r.status === 'paid') streakCount++;
      else break;
    }

    return {
      totalClaims: approved.length,
      streakCount,
      lastClaimStatus: rows[0].status,
      lastClaimDate: rows[0].created_at,
    };
  } catch {
    return { totalClaims: 0, streakCount: 0, lastClaimStatus: null, lastClaimDate: null };
  }
}

// ── mem0 user preferences ────────────────────────────────────────────────────

interface Mem0Prefs {
  language: string | null;
  topics: string[];
}

async function fetchMem0Prefs(wallet: string): Promise<Mem0Prefs> {
  try {
    const memories = await searchMemories('wallet', wallet, 'chat user preferences language topics', {
      limit: 10,
    });

    let language: string | null = null;
    const topics: string[] = [];

    for (const mem of memories) {
      const text = mem.memory || '';
      // Extract language preference
      const langMatch = text.match(/lang:(\w+)/);
      if (langMatch) language = langMatch[1];
      // Extract support topics
      const topicMatch = text.match(/topic:(\w[\w\s]*)/);
      if (topicMatch) topics.push(topicMatch[1].trim());
    }

    return { language, topics: [...new Set(topics)].slice(0, 5) };
  } catch {
    return { language: null, topics: [] };
  }
}

// ── Save detected preferences ────────────────────────────────────────────────

/**
 * Detect and persist user preferences from a chat exchange.
 * Called once per session (rate-limited by the caller).
 * Fire-and-forget — never throws.
 *
 * Detects:
 *   - Language: if the agent responded in a non-English language
 *   - Topics: gate failures, cooldown, payout, tier questions
 */
export async function saveUserPreferences(
  wallet: string,
  userText: string,
  assistantText: string,
): Promise<void> {
  if (!wallet) return;

  const parts: string[] = [];

  // Detect language from common non-English patterns in the assistant response
  const langPatterns: [RegExp, string][] = [
    [/\b(hola|cómo|puedes|necesitas|enviar)\b/i, 'es'],
    [/\b(bonjour|comment|pouvez|envoyer)\b/i, 'fr'],
    [/\b(olá|como|pode|enviar)\b/i, 'pt'],
    [/\b(hallo|wie|können|senden)\b/i, 'de'],
    [/\b(ciao|come|puoi|inviare)\b/i, 'it'],
  ];
  for (const [pattern, code] of langPatterns) {
    if (pattern.test(assistantText)) {
      parts.push(`lang:${code}`);
      break;
    }
  }

  // Detect support topic from user question
  const topicPatterns: [RegExp, string][] = [
    [/gate.{0,5}\d+|gate.{0,10}(fail|reject|block)/i, 'gate_failures'],
    [/cooldown|how.{0,5}long|wait/i, 'cooldown'],
    [/payout|pay\b|sol\b|dispat|when.{0,10}(get|receive)/i, 'payout'],
    [/tier|token|balance|hold/i, 'tier_tokens'],
    [/receipt|photo|write|pen/i, 'receipt_help'],
    [/tweet|twitter|x\.com|hashtag/i, 'tweet_help'],
  ];
  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(userText)) {
      parts.push(`topic:${topic}`);
      break; // one topic per exchange
    }
  }

  if (parts.length === 0) return;

  try {
    await addMemory('wallet', wallet,
      `chat_prefs | ${parts.join(' | ')}`,
      { category: MEM0_CATEGORIES.MISC, appId: MEM0_APPS.SUBMIT },
    );
  } catch {
    // Silent — never block
  }
}
