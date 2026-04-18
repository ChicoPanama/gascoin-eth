/**
 * Seed the chat response cache with 1000 common GASCOIN questions.
 *
 * Runs each question through Nemotron, stores the response in Redis
 * via setChatCache. After this script, users asking any of these
 * questions get an instant cached response (zero LLM tokens).
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... npx tsx scripts/seed-chat-cache.ts
 *
 * Rate limiting: 1 request at a time, 3.5s between requests.
 * On 429: backs off 65s and retries. Resumes from last position.
 * Expected runtime: ~60 min for 1000 questions.
 *
 * Resume support: pass --start=N to skip the first N questions.
 *   OPENROUTER_API_KEY=sk-or-... npx tsx scripts/seed-chat-cache.ts --start=200
 */

import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { classifyTier, MINI_SYSTEM_PROMPT } from '../lib/chat-intent';
import { setChatCache } from '../lib/chat-cache';
import { QUESTIONS_1000 } from './questions-1000';
import { writeFileSync, appendFileSync, existsSync } from 'fs';

// ── Config ───────────────────────────────────────────────────────────────────

const DELAY_MS = 3500;       // Between requests (< 20/min)
const BACKOFF_MS = 65_000;   // On rate limit (wait >1 min)
const MAX_RETRIES = 3;       // Per question
const RESULTS_FILE = 'scripts/cache-seed-results.txt';

const SEED_SYSTEM = `[CRITICAL] You must ONLY output the final answer. NEVER output thinking, reasoning, analysis, or meta-commentary. Just answer directly.

You are the GASCOIN Gas Attendant. GASCOIN refunds real gasoline purchases (not crypto gas fees) in SOL on Solana.

Key facts:
5 steps: 1) Buy gas, keep receipt. 2) Write last 4 wallet chars + #gascoin on receipt. 3) Post photo on X with #gascoin @GasCoinApp. 4) Submit at gascoin.app/submit. 5) SOL in 2–6 hours.
17 verification gates run automatically. Gates 1–16 are blocking. Gate 17 (token hold) is informational.
3 AI engines: Gemini Vision (receipt OCR), Grok (cross-validation), Claude (oversight).
Tiers: Standard (1+ token, 7d cooldown), Commuter (100K+, 7d), Road Warrior (5M+, 3.5d), Fleet (10M+, 1.75d).
Wallets: Phantom, Solflare, Backpack. Buy $GASCOIN on Jupiter (jup.ag).
Points: 1,000 per approved claim + streak bonuses + daily holding points + engagement points.
Referral: 100 pts per referred approval + 2% ongoing, max 20 per 30 days.
Season 1 is beta, invite-only. Any gas station worldwide. Receipts must be <7 days old, min $5, gasoline only.
Cooldowns are per X account, not per wallet.

Keep answers to 2–4 sentences. Plain English. Output ONLY the final answer.`;

// ── Runner ───────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { console.error('OPENROUTER_API_KEY required'); process.exit(1); }

  // Parse --start=N for resume
  const startArg = process.argv.find(a => a.startsWith('--start='));
  const startIdx = startArg ? parseInt(startArg.split('=')[1], 10) : 0;

  const openRouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    headers: { 'HTTP-Referer': 'https://gascoin.app', 'X-Title': 'GASCOIN-CacheSeed' },
  });
  // Gemma 4 — no reasoning capability = zero chain-of-thought leaks in cached responses.
  const MODEL_T1  = openRouter.chat('google/gemma-4-26b-a4b-it:free');  // fast, 4B active
  const MODEL_T23 = openRouter.chat('google/gemma-4-31b-it:free');       // deeper, full 31B

  const questions = QUESTIONS_1000;
  console.log(`\n  GASCOIN Cache Seed — ${questions.length} questions (starting at ${startIdx})\n`);

  let cached = 0;
  let errors = 0;
  let skipped = 0;

  // Initialize results file
  if (startIdx === 0 && existsSync(RESULTS_FILE)) {
    writeFileSync(RESULTS_FILE, '');
  }

  for (let i = startIdx; i < questions.length; i++) {
    const q = questions[i];

    const tier = classifyTier(q, 0);
    const systemPrompt = tier === 1 ? MINI_SYSTEM_PROMPT : SEED_SYSTEM;
    const maxTokens = tier === 1 ? 512 : 640;
    const cacheTier: 1 | 2 = tier === 1 ? 1 : 2;

    let success = false;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const t0 = Date.now();
      try {
        const result = streamText({
          model: tier === 1 ? MODEL_T1 : MODEL_T23,
          system: systemPrompt,
          messages: [{ role: 'user' as const, content: q }],
          maxOutputTokens: maxTokens,
        });

        let text = '';
        for await (const chunk of result.textStream) { text += chunk; }
        const ms = Date.now() - t0;

        if (text.length > 10) {
          await setChatCache(q, text, cacheTier);
          cached++;
          success = true;
          const idx = String(i + 1).padStart(4);
          const total = String(questions.length);
          console.log(`  [${idx}/${total}] CACHED (${ms}ms) T${tier} "${q.slice(0, 55)}"`);
          appendFileSync(RESULTS_FILE, `Q: ${q}\nA: ${text}\n(${ms}ms, tier ${tier})\n\n---\n\n`);
        } else {
          skipped++;
          success = true; // don't retry empty responses
          console.log(`  [${String(i + 1).padStart(4)}/${questions.length}] EMPTY  "${q.slice(0, 55)}"`);
        }
        break;
      } catch (err) {
        const msg = (err as Error).message || '';
        if (msg.includes('Rate limit') || msg.includes('429')) {
          console.log(`  [${String(i + 1).padStart(4)}] RATE LIMITED — backing off ${BACKOFF_MS / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(BACKOFF_MS);
        } else {
          console.log(`  [${String(i + 1).padStart(4)}] ERROR: ${msg.slice(0, 80)} (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(DELAY_MS * 2);
        }
      }
    }
    if (!success) {
      errors++;
      console.log(`  [${String(i + 1).padStart(4)}] FAILED after ${MAX_RETRIES} attempts: "${q.slice(0, 55)}"`);
    }

    // Delay between requests
    await sleep(DELAY_MS);
  }

  console.log(`\n  ════════════════════════════════════════`);
  console.log(`  Cached:      ${cached}`);
  console.log(`  Empty:       ${skipped}`);
  console.log(`  Errors:      ${errors}`);
  console.log(`  Coverage:    ${cached}/${questions.length} instant responses`);
  console.log(`  ════════════════════════════════════════\n`);
  console.log(`  Results: ${RESULTS_FILE}`);
  if (errors > 0) {
    console.log(`  Resume:  npx tsx scripts/seed-chat-cache.ts --start=${startIdx + cached + skipped + errors}`);
  }
  console.log('');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
