/**
 * Chat agent tools (function calling).
 *
 * Only loaded for Tier 3 intents — tool definitions add ~400 input tokens,
 * so they are NOT injected on Tier 1 or Tier 2 requests.
 *
 * Tools:
 *   checkCooldown   — exact cooldown expiry for a wallet
 *   validateTweet   — run gates 6/7/8 against a tweet URL
 *   getClaimStatus  — live gate results for the most recent claim
 *   checkTokenTier  — GASCOIN balance → tier info
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getSupabaseAdmin } from './supabase';
import { getTweet } from './x-api';
import { getTokenBalanceServer } from './token-balance';

// Tier thresholds (mirrors lib/policy.ts GATE_DEFS + evaluateClaim logic)
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
  return null; // below Standard
}

/**
 * Build the tools object for streamText.
 * `sessionWallet` is the Privy-verified wallet from the session;
 * tools accept an optional override so Claude can look up specific wallets.
 */
export function buildChatTools(sessionWallet: string) {
  return {
    // ── Cooldown check ────────────────────────────────────────────────────
    checkCooldown: tool({
      description:
        'Check when a user can submit their next GASCOIN claim based on cooldown. ' +
        'Use when the user asks about cooldown, how long they have to wait, or when they can submit next.',
      inputSchema: z.object({
        wallet: z.string().optional().describe(
          'Solana wallet address. Defaults to the connected session wallet.'
        ),
      }),
      execute: async ({ wallet: w }) => {
        const target = (w || sessionWallet || '').trim();
        if (!target) return { error: 'No wallet address available.' };

        try {
          const supabase = getSupabaseAdmin();

          // Fetch last non-retry claim (retry_later doesn't consume cooldown)
          const { data } = await supabase
            .from('claims')
            .select('created_at, status')
            .eq('wallet', target)
            .not('status', 'eq', 'retry_later')
            .order('created_at', { ascending: false })
            .limit(1);

          if (!data || data.length === 0) {
            return {
              canSubmitNow: true,
              message: 'No prior submissions found — cooldown has never started. You can submit now.',
            };
          }

          // Also fetch token balance to get accurate tier cooldown
          const balResult = await getTokenBalanceServer(target).catch(() => null);
          const balance = balResult?.uiAmount ?? 0;
          const tier = getTierInfo(balance);
          const cooldownDays = tier?.cooldownDays ?? 7;

          const lastDate = new Date(data[0].created_at);
          const expiresAt = new Date(lastDate.getTime() + cooldownDays * 86_400_000);
          const now = new Date();

          if (now >= expiresAt) {
            return {
              canSubmitNow: true,
              tier: tier?.name ?? 'Standard',
              lastSubmission: lastDate.toISOString(),
              message: `Cooldown expired — you can submit now. (${tier?.name ?? 'Standard'} tier, ${cooldownDays}d window)`,
            };
          }

          const msLeft = expiresAt.getTime() - now.getTime();
          const hoursLeft = Math.floor(msLeft / 3_600_000);
          const minutesLeft = Math.floor((msLeft % 3_600_000) / 60_000);

          return {
            canSubmitNow: false,
            tier: tier?.name ?? 'Standard',
            cooldownDays,
            expiresAt: expiresAt.toISOString(),
            hoursLeft,
            minutesLeft,
            message: `Cooldown expires in ${hoursLeft}h ${minutesLeft}m (${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}). Tier: ${tier?.name ?? 'Standard'}.`,
          };
        } catch (err) {
          console.error('[chat-tools] checkCooldown error', err);
          return { error: 'Could not fetch cooldown — try gascoin.app/wallet for exact timing.' };
        }
      },
    }),

    // ── Tweet validation ──────────────────────────────────────────────────
    validateTweet: tool({
      description:
        'Validate a tweet URL against GASCOIN gate requirements (gates 6, 7, and 8). ' +
        'Use when the user shares a tweet URL and wants to know if it will pass.',
      inputSchema: z.object({
        tweetUrl: z.string().describe('Full tweet URL, e.g. https://x.com/username/status/123456789'),
      }),
      execute: async ({ tweetUrl }) => {
        const match = tweetUrl.match(/\/status\/(\d+)/);
        if (!match) {
          return { error: 'Could not parse tweet ID from that URL. Make sure it looks like https://x.com/yourname/status/123456789' };
        }

        try {
          const result = await getTweet(match[1]);

          if (!result || 'notFound' in result || 'error' in result) {
            return {
              found: false,
              gate8: { passed: false, label: 'Tweet is live and public' },
              message: 'Tweet not found or inaccessible. Verify your X account is public and the tweet still exists.',
            };
          }

          const text = (result as { text?: string }).text || '';
          const hasHashtag = /[#$]gascoin/i.test(text);
          const mentionsApp  = /@gazcoinapp/i.test(text);

          return {
            found: true,
            tweetPreview: text.slice(0, 180),
            gates: {
              gate6: {
                passed: hasHashtag,
                label: 'Includes #gascoin or $GASCOIN',
                fix: hasHashtag ? null : 'Add #gascoin or $GASCOIN to the tweet text. Make sure it\'s not inside a URL.',
              },
              gate7: {
                passed: mentionsApp,
                label: 'Tags @GasCoinApp',
                fix: mentionsApp ? null : 'Tag @GasCoinApp exactly (including capital letters). Typos like @GasCoin or @gazcoin will fail.',
              },
              gate8: {
                passed: true,
                label: 'Tweet is live and accessible',
              },
            },
            allPassed: hasHashtag && mentionsApp,
          };
        } catch (err) {
          console.error('[chat-tools] validateTweet error', err);
          return { error: 'Could not fetch the tweet right now — please try again in a moment.' };
        }
      },
    }),

    // ── Claim status ──────────────────────────────────────────────────────
    getClaimStatus: tool({
      description:
        'Get the current status and gate results for the user\'s most recent claim. ' +
        'Use when the user asks what happened to their submission, which gates failed, or why they were rejected.',
      inputSchema: z.object({
        wallet: z.string().optional().describe('Solana wallet address. Defaults to session wallet.'),
      }),
      execute: async ({ wallet: w }) => {
        const target = (w || sessionWallet || '').trim();
        if (!target) return { error: 'No wallet address available.' };

        try {
          const supabase = getSupabaseAdmin();
          const { data: claims } = await supabase
            .from('claims')
            .select('id, status, created_at, decision_reason, amount_usd, risk_score')
            .eq('wallet', target)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!claims || claims.length === 0) {
            return { noClaims: true, message: 'No submissions found for this wallet.' };
          }

          const claim = claims[0] as {
            id: string; status: string; created_at: string;
            decision_reason?: string; amount_usd?: number; risk_score?: number;
          };

          const { data: gates } = await supabase
            .from('gate_results')
            .select('gate_name, passed, reason_code')
            .eq('claim_id', claim.id);

          const allGates = (gates || []) as Array<{ gate_name: string; passed: boolean; reason_code?: string }>;
          const failedGates = allGates.filter(g => !g.passed);

          return {
            status: claim.status,
            submittedAt: new Date(claim.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            }),
            decisionReason: claim.decision_reason || null,
            amountUsd: claim.amount_usd || null,
            totalGates: allGates.length,
            failedGates: failedGates.map(g => ({
              name: g.gate_name,
              reason: g.reason_code || 'gate failed',
            })),
            allPassed: failedGates.length === 0,
          };
        } catch (err) {
          console.error('[chat-tools] getClaimStatus error', err);
          return { error: 'Could not fetch claim status — check gascoin.app/wallet for live status.' };
        }
      },
    }),

    // ── Token tier ────────────────────────────────────────────────────────
    checkTokenTier: tool({
      description:
        'Check a wallet\'s $GASCOIN token balance and determine their current tier. ' +
        'Use when the user asks about their tier, token balance, or how many submissions per week they get.',
      inputSchema: z.object({
        wallet: z.string().optional().describe('Solana wallet address. Defaults to session wallet.'),
      }),
      execute: async ({ wallet: w }) => {
        const target = (w || sessionWallet || '').trim();
        if (!target) return { error: 'No wallet address available.' };

        try {
          const result = await getTokenBalanceServer(target);
          const balance = result?.uiAmount ?? 0;
          const tier = getTierInfo(balance);

          if (!tier) {
            return {
              balance,
              tier: 'None',
              meetsMinimum: false,
              message: `Your wallet holds ${balance.toLocaleString()} $GASCOIN — below the 1-token minimum for Standard tier. Buy at least 1 $GASCOIN on Jupiter (jup.ag) to participate.`,
            };
          }

          const nextTier = TIER_THRESHOLDS[TIER_THRESHOLDS.findIndex(t => t.name === tier.name) - 1];

          return {
            balance,
            tier: tier.name,
            cooldownDays: tier.cooldownDays,
            submissionsPerWeek: tier.perWeek,
            meetsMinimum: true,
            nextTierName: nextTier?.name ?? null,
            nextTierMin: nextTier?.min ?? null,
            tokensToNextTier: nextTier ? Math.max(0, nextTier.min - balance) : null,
            message: `${tier.name} tier — ${balance.toLocaleString()} $GASCOIN · ${tier.perWeek}× per week · ${tier.cooldownDays}d cooldown.`,
          };
        } catch (err) {
          console.error('[chat-tools] checkTokenTier error', err);
          return { error: 'Could not fetch token balance right now.' };
        }
      },
    }),
  };
}
