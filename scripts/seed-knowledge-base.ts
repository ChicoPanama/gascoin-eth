/**
 * Seed Knowledge Base with Core Policy Data
 *
 * Inserts hardcoded entries for gate rules, risk formula, auto-ban thresholds,
 * token tiers, and fraud thresholds — extracted from code constants.
 *
 * Usage: npm run seed:kb
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SEED_ENTRIES = [
  {
    slug: 'policy/risk-score-formula',
    title: 'Risk Score Formula',
    category: 'policy',
    tags: ['risk', 'formula', 'gates'],
    content: 'Risk score = min(1, (failedGates * 0.09) + (aiScore * 0.35) + (tamperScore * 0.25) + (amountUsd > 200 ? 0.08 : 0)). Decisions: <0.35 = ready_for_dispatch, <0.6 = needs_review, >=0.6 = rejected.',
  },
  {
    slug: 'policy/auto-ban-thresholds',
    title: 'Auto-Ban Thresholds',
    category: 'policy',
    tags: ['ban', 'fraud', 'thresholds'],
    content: '5 rejections in 30 days = pattern ban. 3 duplicate receipt attempts = sybil ban. 10 lifetime rejections = serial bad actor ban. Admins can unban via user_bans table.',
  },
  {
    slug: 'policy/token-tiers',
    title: 'Token Tier Thresholds',
    category: 'policy',
    tags: ['tiers', 'tokens', 'cooldown'],
    content: 'Standard: 1 GASCOIN, 0.10 SOL max, 7d cooldown. Commuter: 100K, 0.25 SOL, 7d. Road Warrior: 5M, 0.50 SOL, 3.5d. Fleet: 10M, 1.00 SOL, 1.75d. Cooldown is per X account, not per wallet.',
  },
  {
    slug: 'policy/fraud-thresholds',
    title: 'Fraud Detection Thresholds',
    category: 'policy',
    tags: ['fraud', 'ai', 'thresholds'],
    content: 'AI generation score threshold: 0.65 (above = flagged). Tamper score threshold: 0.55 (above = flagged). Cross-validation elevates scores if Grok returns "high" with confidence >0.7.',
  },
  {
    slug: 'gates/x-verified',
    title: 'Gate: X Account Verified',
    category: 'gate_rule',
    tags: ['gates', 'x', 'verification'],
    content: 'X account must be public and verified. Blocks protected accounts.',
  },
  {
    slug: 'gates/tweet-hashtag',
    title: 'Gate: Tweet Hashtag',
    category: 'gate_rule',
    tags: ['gates', 'tweet', 'hashtag'],
    content: 'Tweet must contain #gascoin hashtag. Case-insensitive, standalone check.',
  },
  {
    slug: 'gates/tweet-live',
    title: 'Gate: Tweet Live',
    category: 'gate_rule',
    tags: ['gates', 'tweet'],
    content: 'Tweet URL must resolve to an existing, accessible tweet. Checks via X API v2 with oEmbed fallback.',
  },
  {
    slug: 'gates/wallet-match',
    title: 'Gate: Wallet Match',
    category: 'gate_rule',
    tags: ['gates', 'wallet', 'receipt'],
    content: 'Last 4 characters of connected wallet must appear on the receipt image (OCR verified).',
  },
  {
    slug: 'gates/gascoin-min-hold',
    title: 'Gate: GASCOIN Minimum Hold',
    category: 'gate_rule',
    tags: ['gates', 'token', 'balance'],
    content: 'Wallet must hold at least 1 $GAS token. Skipped in dry-run mode (ENABLE_LIVE_PAYOUT=false).',
  },
  {
    slug: 'gates/not-duplicate',
    title: 'Gate: No Duplicate Receipt',
    category: 'gate_rule',
    tags: ['gates', 'duplicate', 'fraud'],
    content: 'Receipt checked against SHA-256 exact hash and perceptual hash (dHash). Both must be unique across all submissions.',
  },
  {
    slug: 'gates/ai-image-check',
    title: 'Gate: AI Image Check',
    category: 'gate_rule',
    tags: ['gates', 'ai', 'fraud'],
    content: 'AI generation probability score must be below 0.65. Scored by Gemini Vision analysis of receipt authenticity.',
  },
  {
    slug: 'gates/tamper-check',
    title: 'Gate: Tamper Check',
    category: 'gate_rule',
    tags: ['gates', 'tamper', 'fraud'],
    content: 'Tamper probability score must be below 0.55. Weighted combination: no EXIF (40%) + wrong dimensions (30%) + manipulation flag (30%).',
  },
  {
    slug: 'gates/cooldown',
    title: 'Gate: Submission Cooldown',
    category: 'gate_rule',
    tags: ['gates', 'cooldown', 'tiers'],
    content: 'Per-X-account cooldown based on token tier. Standard/Commuter: 7d, Road Warrior: 3.5d, Fleet: 1.75d.',
  },
  {
    slug: 'gates/min-followers',
    title: 'Gate: Minimum Followers',
    category: 'gate_rule',
    tags: ['gates', 'followers', 'social'],
    content: 'X account must have at least 100 followers. Returns -1 on API failure (triggers retry_later, not rejection).',
  },
  {
    slug: 'gates/account-quality',
    title: 'Gate: Account Quality',
    category: 'gate_rule',
    tags: ['gates', 'quality', 'social'],
    content: 'Account quality score must be >= 40 (out of 100). Factors: age, follower ratio, tweet count, profile completeness, historical signals with decay weighting.',
  },
  {
    slug: 'fraud-pattern/referral-rings',
    title: 'Referral Ring Detection',
    category: 'fraud_pattern',
    tags: ['fraud', 'referral', 'ring'],
    content: 'Circular: A↔B (confidence 0.95). 3-node cycle: A→B→C→A (0.9). Chain farming: >=5 referrals within 24h from one wallet (0.8). Rings result in 0 points and hold for review.',
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${SEED_ENTRIES.length} knowledge base entries...`);

  let seeded = 0;
  for (const entry of SEED_ENTRIES) {
    const { error } = await supabase.from('knowledge_base').upsert({
      ...entry,
      source: 'seed',
      is_active: true,
      version: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' });

    if (error) {
      console.error(`  ERROR: ${entry.slug} — ${error.message}`);
    } else {
      console.log(`  OK: ${entry.slug}`);
      seeded++;
    }
  }

  console.log(`\nSeeded ${seeded}/${SEED_ENTRIES.length} entries`);
}

main().catch(console.error);
