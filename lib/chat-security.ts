/**
 * Chat endpoint hardening: pre-filter injection attempts, scan output for
 * credential/prompt leaks, manage strike counts + IP bans.
 *
 * Layers (in order of precedence):
 *   1. isIpBanned       — blocks banned IPs before any LLM call
 *   2. detectInjection  — short-circuits obvious injection patterns to a
 *                         canned refusal without burning tokens
 *   3. scanOutputForLeaks — post-hoc scan of streamed output; writes to
 *                           intelligence_entries for admin review
 *   4. recordStrike     — 3 strikes in 10 min = auto-ban 24h
 *
 * Everything is best-effort: Redis/Supabase failures never block the chat
 * pipeline. We fail open for legitimate users, never open for detected
 * attackers (detection result is authoritative).
 */

import { cacheIncr, cacheGet, cacheSet } from './cache';

// ── Canary (put in system prompt, never in output) ─────────────────────
// Static, deterministic, and unique enough that we can grep confidently.
// If a chat response ever contains this string, we know the model
// regurgitated some portion of the system prompt.
export const SYSTEM_PROMPT_CANARY = 'GC-CANARY-9f2a8e01b4dc4c7e-NEVER-OUTPUT';

// ── Injection pattern detector ─────────────────────────────────────────
// Matches common prompt-injection / jailbreak phrasings. Ordered roughly
// by false-positive risk — the first hit short-circuits so more specific
// matches come first when it matters.
const INJECTION_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'canary_leak',           re: new RegExp(SYSTEM_PROMPT_CANARY, 'i') },
  { name: 'ignore_previous',       re: /\b(ignore|disregard|forget)\s+(the\s+|all\s+|your\s+|my\s+|previous|prior|above|everything|earlier)\b/i },
  { name: 'new_instructions',      re: /\bnew\s+(instructions?|rules?|prompt|directives?|guidelines?)\s*[:\-]/i },
  { name: 'role_change',           re: /\byou\s+are\s+now\s+(?!the gascoin|a helpful\b)/i },
  { name: 'pretend',               re: /\b(pretend|act\s+as|roleplay\s+as|imagine\s+you('re|\s+are))\b(?!.*(customer|user|driver|tester))/i },
  { name: 'jailbreak_mode',        re: /\b(jail\s*break|DAN\s+mode|developer\s+mode|god\s+mode|god-?mode|admin\s+mode|debug\s+mode|evil\s+mode|uncensored\s+mode)\b/i },
  { name: 'reveal_system_prompt',  re: /\b((show|reveal|print|display|output|repeat|recite|give|tell)\s+(me\s+)?(the\s+|your\s+)?(system|initial|original|first|above|full|complete|entire)?\s*(prompt|instructions?|rules?|context|message|directives?))\b/i },
  { name: 'above_this_line',       re: /\b(the\s+)?(text|words?|instructions?|content)\s+(above|before)\s+(this\s+(line|message|point))\b/i },
  { name: 'fake_system_role',      re: /^\s*(system|assistant|admin)\s*[:>]\s*/im },
  { name: 'prompt_continuation',   re: /\|endoftext\||<\|im_start\|>|<\|im_end\|>|<\|system\|>/i },
  { name: 'base64_blob',           re: /[A-Za-z0-9+/=]{80,}/ },
  { name: 'hex_blob',              re: /\b[0-9a-f]{80,}\b/i },
  { name: 'wallet_drainer',        re: /\b(drain|steal|exfiltrate|exploit|sybil|forge|bypass|evade)\s+(wallet|receipt|gate|ocr|verification)/i },
];

export interface InjectionResult {
  flagged: boolean;
  pattern?: string;
}

export function detectInjection(input: string): InjectionResult {
  if (!input) return { flagged: false };
  for (const { name, re } of INJECTION_PATTERNS) {
    if (re.test(input)) return { flagged: true, pattern: name };
  }
  return { flagged: false };
}

// ── Output leak scanner ────────────────────────────────────────────────
// Scans streamed output for: our canary, seed phrases, private keys,
// common API-key prefixes. Returns a reason code on any hit.

// Common BIP39 words (partial list — enough to recognize a seed phrase
// without pulling in a 2048-word dependency). The heuristic: 10+ of these
// in a row, space-separated, = almost certainly a seed phrase.
const BIP39_SAMPLE = new Set([
  'abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual','adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','affair','afford','afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety','any','apart','apology','appear','apple','approve','april','arch','arctic','area','arena','argue','arm','armed','armor','army','around','arrange','arrest','arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake','aware','away','awesome','awful','awkward','axis',
]);

function looksLikeSeedPhrase(text: string): boolean {
  // Find a run of 10+ words where all are short + lowercase + in BIP39 sample
  const words = text.toLowerCase().split(/[^a-z]+/);
  let run = 0;
  for (const w of words) {
    if (w && w.length >= 3 && w.length <= 8 && BIP39_SAMPLE.has(w)) {
      run++;
      if (run >= 10) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

const LEAK_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'canary_in_output', re: new RegExp(SYSTEM_PROMPT_CANARY, 'i') },
  { name: 'eth_private_key',  re: /\b0x[0-9a-f]{64}\b/i },
  { name: 'sk_openai',        re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'sk_proj_openai',   re: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'sbp_supabase',     re: /\bsbp_[A-Za-z0-9]{20,}\b/ },
  { name: 'sb_secret_supabase', re: /\bsb_secret_[A-Za-z0-9]{10,}\b/ },
  { name: 'vcp_vercel',       re: /\bvcp_[A-Za-z0-9]{20,}\b/ },
  { name: 'ghp_github',       re: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { name: 'gho_github',       re: /\bgho_[A-Za-z0-9]{20,}\b/ },
  { name: 'm0_mem0',          re: /\bm0-[A-Za-z0-9]{20,}\b/ },
  { name: 'xai_key',          re: /\bxai-[A-Za-z0-9]{20,}\b/ },
  { name: 'aws_access_key',   re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'jwt_long',         re: /\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'privy_secret',     re: /\bprivy_app_secret_[A-Za-z0-9]{30,}\b/ },
  { name: 'upstash_token',    re: /\bAU[A-Za-z0-9]{40,}\b/ },
  { name: 'system_prompt_echo', re: /SECURITY RULES\s*[—-]\s*NON-NEGOTIABLE/i },
];

export interface LeakResult {
  safe: boolean;
  reason?: string;
}

export function scanOutputForLeaks(text: string): LeakResult {
  if (!text) return { safe: true };
  for (const { name, re } of LEAK_PATTERNS) {
    if (re.test(text)) return { safe: false, reason: name };
  }
  if (looksLikeSeedPhrase(text)) return { safe: false, reason: 'seed_phrase_pattern' };
  return { safe: true };
}

// ── Strike / auto-ban ──────────────────────────────────────────────────
// Three strikes in 10 minutes → 24h block. IP + (optional) wallet both
// tracked; either triggering a ban applies to both identifiers.

const STRIKE_WINDOW_SEC = 10 * 60;
const STRIKE_THRESHOLD = 3;
const BAN_DURATION_SEC = 24 * 60 * 60;

export async function recordStrike(
  ip: string,
  wallet?: string | null,
): Promise<{ strikes: number; banned: boolean }> {
  const ipKey = `chat:strike:ip:${ip}`;
  const walletKey = wallet ? `chat:strike:wallet:${wallet.toLowerCase()}` : null;

  const [ipStrikes, walletStrikes] = await Promise.all([
    cacheIncr(ipKey, STRIKE_WINDOW_SEC),
    walletKey ? cacheIncr(walletKey, STRIKE_WINDOW_SEC) : Promise.resolve(0),
  ]);

  const max = Math.max(ipStrikes, walletStrikes);
  const banned = max >= STRIKE_THRESHOLD;

  if (banned) {
    await Promise.all([
      cacheSet(`chat:ban:ip:${ip}`, '1', BAN_DURATION_SEC),
      walletKey ? cacheSet(`chat:ban:wallet:${wallet!.toLowerCase()}`, '1', BAN_DURATION_SEC) : Promise.resolve(true),
    ]);
  }

  return { strikes: max, banned };
}

export async function isIpBanned(ip: string, wallet?: string | null): Promise<boolean> {
  const [ipBan, walletBan] = await Promise.all([
    cacheGet<string>(`chat:ban:ip:${ip}`),
    wallet ? cacheGet<string>(`chat:ban:wallet:${wallet.toLowerCase()}`) : Promise.resolve(null),
  ]);
  return ipBan === '1' || walletBan === '1';
}

// ── Logging to intelligence_entries (best-effort) ──────────────────────
// Imported lazily to avoid pulling Supabase into routes that don't use it.

export async function logSecurityEvent(opts: {
  kind: 'injection_attempt' | 'output_leak' | 'ban_triggered' | 'banned_request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  wallet?: string | null;
  pattern?: string;
  inputSample?: string;
}): Promise<void> {
  try {
    const { getSupabaseAdmin } = await import('./supabase');
    const supabase = getSupabaseAdmin();
    await supabase.from('intelligence_entries').insert({
      entry_type: opts.kind,
      entity_type: opts.wallet ? 'wallet' : 'ip',
      entity_id: opts.wallet || opts.ip,
      summary: `chat ${opts.kind}: ${opts.pattern || 'unknown'} · ip=${opts.ip}${opts.wallet ? ' · wallet=' + opts.wallet : ''}`,
      detail_json: {
        ip: opts.ip,
        wallet: opts.wallet || null,
        pattern: opts.pattern || null,
        input_sample: opts.inputSample ? opts.inputSample.slice(0, 200) : null,
      },
      severity: opts.severity,
      pipeline_source: 'chat_security',
    });
  } catch {
    // Non-fatal: never block chat on logging failure.
  }
}

export const CHAT_REFUSAL_LINE =
  "I'm the GASCOIN Gas Attendant — ask me anything about submitting receipts or getting your ETH refund.";
