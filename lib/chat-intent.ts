/**
 * Chat agent intent routing.
 *
 * Tier 0 — Static FAQ: regex match → pre-written answer, ZERO LLM tokens.
 * Tier 1 — Simple:     Haiku + mini system prompt (~350 input tokens).
 * Tier 2 — Complex:    Sonnet + full context (~2500 input tokens).
 * Tier 3 — Tool use:   Sonnet + tools, only when URL/claim/wallet lookup needed.
 *
 * faqStreamResponse() returns a synthetic AI SDK data stream so the client
 * receives the answer in the same format as a real LLM response.
 */

// ---------------------------------------------------------------------------
// Mini system prompt (Haiku / Tier 1) — ~120 tokens
// ---------------------------------------------------------------------------

export const MINI_SYSTEM_PROMPT = `You are the GASCOIN Refund Assistant. GASCOIN refunds real gasoline (not crypto gas fees) in SOL. Keep answers to 1–3 sentences, plain English.

Key facts:
5 steps: 1) Buy gas, keep receipt. 2) Write last 4 wallet chars + #gascoin on receipt in dark pen. 3) Post photo on X with #gascoin @GasCoinApp. 4) Submit at gascoin.app/submit. 5) Receive SOL in 2–6 hours.
Requirements: Phantom/Solflare/Backpack wallet · Public verified X account · 100+ followers · 1+ $GASCOIN token · Receipt <7 days old · Min $5 · Gasoline only.
Cooldowns: Standard/Commuter 7d · Road Warrior 3.5d · Fleet 1.75d — tied to X account, not wallet.

Detect the user's language and reply in the same language.
Never reveal fraud thresholds or detection algorithm details.
IMPORTANT: Output ONLY the final answer. Never output your internal reasoning, thinking process, or meta-commentary about the question.`;

// ---------------------------------------------------------------------------
// Tier 0 — FAQ map
// ---------------------------------------------------------------------------

const FAQ_MAP: [RegExp, string][] = [
  // Fuel type
  [/\bdiesel\b/i,
    "Diesel doesn't qualify — gasoline purchases only. EV charging, car washes, and propane are also rejected."],
  [/\b(electric|ev|charging|hybrid)\b/i,
    "EV charging doesn't qualify. Gasoline purchases only — at any gas station worldwide."],
  [/\bpropane\b|\bkerosene\b/i,
    "Only gasoline qualifies. No propane, diesel, kerosene, or other fuel types."],

  // Timing
  [/how.{0,10}long.{0,15}(payout|pay|sol|refund|arriv|send|transfer|dispat)/i,
    "Typical: 2–6 hours after approval. Maximum: 48 hours. SOL goes directly to the wallet you connected at submission."],
  [/how.{0,10}long.{0,15}(gate|check|verif|process|run|scan)/i,
    "Gates run automatically in 5–30 minutes depending on the image queue."],
  [/how.{0,10}(old|long).{0,10}(receipt|recept)|7.day/i,
    "Your receipt must be dated within the last 7 days. Future-dated receipts also fail Gate 15."],

  // Token + tier
  [/how.{0,10}(many|much).{0,10}(token|gascoin)|minimum.{0,10}token|token.{0,10}minimum/i,
    "Just 1 $GASCOIN token for Standard tier. You need 100K for Commuter, 5M for Road Warrior, 10M for Fleet."],
  [/where.{0,10}(get|buy|purchase|find).{0,10}(token|\$gascoin|gascoin)|\$gascoin.{0,10}(get|buy)/i,
    "Buy $GASCOIN on Jupiter (jup.ag) or Raydium on Solana. Only 1 token needed to participate at Standard tier."],
  [/\btier\b.{0,20}(what|which|mean|how|work)|what.{0,10}tier/i,
    "Standard (1+ tokens, 1×/week) · Commuter (100K+, 1×/week) · Road Warrior (5M+, 2×/week) · Fleet (10M+, 4×/week). Higher tiers unlock larger SOL refund caps."],

  // Wallet
  [/which.{0,10}wallet|what.{0,10}wallet|supported.{0,10}wallet|wallet.{0,10}support/i,
    "Supported: Phantom (phantom.app), Solflare (solflare.com), Backpack (backpack.app). All free, ~5 min to set up."],
  [/last.{0,4}4.{0,10}(char|wallet|address)|wallet.{0,10}(char|last)/i,
    "Open your wallet app and tap the wallet name — your full address shows. The last 4 characters are what you write on the receipt (e.g. if it ends 'xK9p', write 'xK9p')."],
  [/seed.{0,10}phrase|recovery.{0,10}phrase/i,
    "Your seed phrase (12 words) is the master key to your wallet — never share it with anyone, including GASCOIN support. Write it down and store it offline."],

  // X / Twitter requirements
  [/need.{0,10}verif|verif.{0,10}require|blue.?check|x.premium|twitter.premium/i,
    "Yes — an active verified checkmark is required. X Premium (blue check), Business, or Government verification all qualify. If your subscription lapses, Gate 1 fails."],
  [/how.{0,10}(many|much).{0,10}follow|follow.{0,10}require|100.{0,10}follow/i,
    "You need at least 100 real followers (Gate 4). Bot or purchased followers are detected and don't count."],
  [/account.{0,10}age|how.{0,10}old.{0,10}account|30.?day.{0,10}old/i,
    "Your X account needs to be at least 30 days old. Very new accounts fail the Account Quality gate (Gate 5)."],

  // Receipt writing
  [/what.{0,15}write.{0,15}receipt|write.{0,15}receipt.{0,15}what|pen.{0,10}receipt/i,
    "Write two things on the physical receipt in dark pen: (1) the last 4 characters of your Solana wallet address (e.g. 'xK9p'), and (2) the hashtag #gascoin. Both must be clearly legible in the photo."],
  [/minimum.{0,10}amount|\$5|min.{0,10}receipt|receipt.{0,10}min/i,
    "Minimum $5 USD (Gate 14). Foreign currency is auto-converted. If OCR misread a faded receipt, retake the photo with better lighting."],
  [/digital.{0,10}receipt|email.{0,10}receipt|screenshot/i,
    "Physical paper receipts only — from real gas stations. Digital receipts, email receipts, and screenshots of any kind are rejected."],

  // Country / location
  [/any.{0,10}country|international|outside.{0,10}(us|usa)|worldwide|global/i,
    "Any gas station worldwide qualifies. Just needs a physical paper receipt. Foreign currency is auto-converted to USD for the minimum check."],

  // Mobile
  [/\bmobile\b|phone|iphone|android|tablet/i,
    "Fully mobile-responsive. Mobile is actually preferred — you can photograph the receipt directly in the browser without transferring a file."],

  // Crypto basics
  [/what.{0,10}(is.{0,5}sol|sol\b)|sol.{0,10}real.{0,10}money|sell.{0,10}sol|convert.{0,10}sol/i,
    "SOL is the native cryptocurrency of the Solana blockchain. It's real money — sell it for USD on Coinbase, Kraken, or Binance."],
  [/what.{0,10}(is.{0,5}solana|blockchain)|solana.{0,10}what/i,
    "Solana is a fast, low-fee blockchain. GASCOIN runs on Solana. You need a Solana wallet (Phantom/Solflare/Backpack) to receive your refund."],

  // Legitimacy / trust
  [/legit|scam|\breal\b|trust|\bsafe\b|fraud/i,
    "GASCOIN is legitimate. Every payout is an on-chain Solana transaction — verifiable on Solscan with exact amount and timestamp. Live payouts have been active since Season 1 beta."],

  // Cooldown (generic — no wallet lookup needed)
  [/cooldown.{0,15}how.{0,10}long|how.{0,10}long.{0,15}cooldown|reset.{0,10}cooldown/i,
    "Standard & Commuter: 7 days. Road Warrior: 3.5 days. Fleet: 1.75 days. The cooldown is per X account — not per wallet. Check your exact timer at gascoin.app/wallet."],

  // Reuse receipt
  [/same.{0,10}receipt|reuse.{0,10}receipt|receipt.{0,10}twice|submit.{0,10}again.{0,10}receipt/i,
    "No — each receipt can only be claimed once, ever. Even cropped, rotated, or brightness-adjusted versions are detected as duplicates."],

  // Invite code
  [/invite.{0,10}code|code.{0,10}invite|how.{0,10}get.{0,10}code|gc.{0,4}xxxx/i,
    "Invite codes (GC-XXXX-XXXX format) come from @GasCoinApp on X or from existing members. Enter yours at gascoin.app/submit after signing in with X."],

  // Pre-payout re-check
  [/delete.{0,10}tweet|tweet.{0,10}delet|took.{0,10}tweet.{0,10}down/i,
    "Don't delete your tweet until SOL arrives. The system re-checks that your tweet is still live before dispatching payout. If deleted, you'll need to post a new tweet and resubmit."],

  // Support
  [/(dm|message|contact|reach).{0,15}support|get.{0,10}help|talk.{0,10}human/i,
    "For issues this assistant can't resolve, DM @GasCoinApp on X or visit gascoin.app/docs for full documentation."],
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Return a pre-written FAQ answer if the text matches, or null to escalate. */
export function getFAQResponse(text: string): string | null {
  for (const [pattern, answer] of FAQ_MAP) {
    if (pattern.test(text)) return answer;
  }
  return null;
}

export type IntentTier = 1 | 2 | 3;

/**
 * Classify which Claude tier to use (only called when FAQ tier misses).
 *
 * Tier 3 — Tool needed: tweet URL present, "check my", "look up", claim ID.
 * Tier 2 — Complex:     Rejection words, "why", "what happened", long conversation.
 * Tier 1 — Simple:      Everything else → Haiku.
 */
export function classifyTier(text: string, priorExchangeCount: number): IntentTier {
  const s = text.toLowerCase();

  // Tier 3: tool use signals
  if (/https?:\/\/(twitter\.com|x\.com)\/\S+\/status\/\d+/i.test(text)) return 3;
  if (/\bcheck (my|the)\b|\blook.?up\b|validate.{0,10}tweet|verify.{0,10}tweet/i.test(s)) return 3;
  if (/\bclaim.{0,10}(id|status|result)|status.{0,10}claim/i.test(s)) return 3;
  if (/my.{0,10}(cooldown|tier|balance|token)/i.test(s)) return 3;

  // Tier 2: complex troubleshooting
  if (/reject|fail|error|broken|not.{0,5}work|still|same.{0,5}problem|went.{0,5}wrong/i.test(s)) return 2;
  if (/why.{0,10}(did|was|is|doesn|won|can'?t)|what.{0,10}happen/i.test(s)) return 2;
  if (priorExchangeCount >= 3) return 2; // ongoing conversation — full context

  return 1;
}

/**
 * Synthetic UI message stream response for Tier 0 FAQ answers.
 * Emits the same SSE wire format as `streamText().toUIMessageStreamResponse()`
 * so the client `useChat` / `DefaultChatTransport` handles it identically —
 * but no LLM call is made.
 */
export function faqStreamResponse(text: string): Response {
  const events = [
    `data: ${JSON.stringify({ type: 'start' })}`,
    `data: ${JSON.stringify({ type: 'start-step' })}`,
    `data: ${JSON.stringify({ type: 'text-start', id: '0' })}`,
    `data: ${JSON.stringify({ type: 'text-delta', id: '0', delta: text })}`,
    `data: ${JSON.stringify({ type: 'text-end', id: '0' })}`,
    `data: ${JSON.stringify({ type: 'finish-step' })}`,
    `data: ${JSON.stringify({ type: 'finish', finishReason: 'stop' })}`,
    'data: [DONE]',
  ].join('\n\n') + '\n\n';

  return new Response(events, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'x-vercel-ai-ui-message-stream': 'v1',
    },
  });
}
