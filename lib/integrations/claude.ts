/**
 * Claude Oversight Engine
 *
 * Final review layer before payout dispatch. Claude receives the complete
 * submission package (all gate results, fraud signals, X account data,
 * location signals, submission history) and returns a verdict.
 *
 * Sits in the process-claims worker AFTER auto-approval but BEFORE
 * payout job creation — the "manager signs off" moment.
 *
 * Routed through Vercel AI Gateway:
 *   - Model: anthropic/claude-sonnet-4.6 (1h extended cache TTL)
 *   - Native prompt caching on a bulked >1024 token system rulebook (90% off)
 *   - Upstash exact-match cache by claimId (1h) prevents worker re-queries
 *   - Fallback chain: claude-sonnet-4.6 → claude-sonnet-4.5 → grok-4.1-fast-reasoning
 */

import { z } from 'zod';
import { getEntityProfile, addMemory, writeDistilledProfile } from '../mem0';
import { buildClaudeKBContext } from '../knowledge-base';
import { cacheGetOrFetch } from '../cache';
import { getSystemPrompt, PROMPT_KEYS } from '../prompts';
import { generateAIJson, isAiGatewayAvailable, AI_MODELS } from './ai-gateway';

export interface ClaudeReviewContext {
  claimId: string;
  wallet: string;
  xHandle: string;
  tier: string;
  amountSol: number;
  // Gate results
  gateResults: Array<{ gate: string; passed: boolean; score?: number; reason?: string }>;
  riskScore: number;
  // Fraud signals
  aiScore: number;
  tamperScore: number;
  fraudRisk: string;
  crossValidation?: { fraudRiskLevel: string; confidence: number; reasoning: string; concerns: string[] } | null;
  // Location signals
  ipCountry?: string | null;
  ocrCountry?: string | null;
  exifHasGps?: boolean;
  // Account signals
  followerCount?: number;
  accountQualityScore?: number;
  accountAgeDays?: number;
  // History
  previousSubmissions?: number;
  previousApprovals?: number;
  previousRejections?: number;
}

export interface ClaudeVerdict {
  verdict: 'approve' | 'flag' | 'reject';
  confidence: number;
  narrative: string;
  concerns: string[];
}

const VerdictSchema = z.object({
  verdict: z.enum(['approve', 'flag', 'reject']),
  confidence: z.number().min(0).max(1),
  narrative: z.string().describe('2-3 sentence explanation for audit log'),
  concerns: z.array(z.string()),
});

// System prompt is loaded from Edge Config (or bundled default) at call time
// via getSystemPrompt(). Kept stable across calls to maximize Anthropic
// provider-native cache hit rate (90% off cached input on Sonnet 4.6).

async function doClaudeReview(context: ClaudeReviewContext): Promise<ClaudeVerdict> {
  if (!isAiGatewayAvailable()) {
    return {
      verdict: 'approve',
      confidence: 1,
      narrative: 'Claude oversight unavailable — auto-approved by policy engine',
      concerns: [],
    };
  }

  // Fetch mem0 entity profile first, then build KB context with referral awareness
  const failedGates = context.gateResults.filter((g) => !g.passed);
  const passedGates = context.gateResults.filter((g) => g.passed);

  const entityProfile = await getEntityProfile('wallet', context.wallet).catch(() => null);
  const hasReferralFlags =
    entityProfile?.cross_pipeline_flags?.some((f) => f.includes('referral')) ?? false;
  const kbContext = await buildClaudeKBContext({
    riskScore: context.riskScore,
    failedGates: failedGates.map((g) => g.gate),
    fraudRisk: context.fraudRisk,
    hasReferralFlags,
  }).catch(() => '');

  // Entity intelligence section (only if we have non-trivial data)
  let entitySection = '';
  if (
    entityProfile &&
    (entityProfile.cross_pipeline_flags.length > 0 ||
      entityProfile.claude_narratives.length > 0 ||
      entityProfile.trust_trajectory !== 'new')
  ) {
    entitySection = `
ENTITY INTELLIGENCE:
- Trust trajectory: ${entityProfile.trust_trajectory}
- Cross-pipeline flags: ${entityProfile.cross_pipeline_flags.join(', ') || 'none'}
- Recent verdicts: ${entityProfile.claude_narratives.slice(0, 3).join(' | ') || 'first review'}
- 7d velocity: ${entityProfile.velocity.submissions_7d} submissions, ${entityProfile.velocity.points_7d} points
- Patterns: ${entityProfile.notable_patterns.join('; ') || 'none detected'}
`;
  }

  const kbSection = kbContext ? `\nINSTITUTIONAL CONTEXT:\n${kbContext}\n` : '';

  const userPrompt = `CLAIM SUMMARY:
- Claim ID: ${context.claimId}
- Wallet: ${context.wallet}
- X Handle: @${context.xHandle}
- Tier: ${context.tier}
- Payout amount: ${context.amountSol} SOL
- Risk score: ${context.riskScore}

GATE RESULTS (${passedGates.length} passed, ${failedGates.length} failed):
${context.gateResults.map((g) => `  ${g.passed ? 'PASS' : 'FAIL'} ${g.gate}${g.score !== undefined ? ` (score: ${g.score})` : ''}${g.reason ? ` — ${g.reason}` : ''}`).join('\n')}

FRAUD SIGNALS:
- AI generation score: ${context.aiScore} (threshold: 0.65)
- Tamper score: ${context.tamperScore} (threshold: 0.55)
- Fraud risk level: ${context.fraudRisk}
${context.crossValidation ? `- AI cross-validation: ${context.crossValidation.fraudRiskLevel} (confidence: ${context.crossValidation.confidence}) — ${context.crossValidation.reasoning}` : '- AI cross-validation: not triggered'}
${context.crossValidation?.concerns?.length ? `- Concerns: ${context.crossValidation.concerns.join(', ')}` : ''}

LOCATION:
- IP country: ${context.ipCountry || 'unknown'}
- Receipt country (OCR): ${context.ocrCountry || 'unknown'}
- EXIF GPS present: ${context.exifHasGps ?? 'unknown'}

ACCOUNT:
- Followers: ${context.followerCount ?? 'unknown'}
- Account quality score: ${context.accountQualityScore ?? 'unknown'}
- Account age: ${context.accountAgeDays ?? 'unknown'} days

HISTORY:
- Previous submissions: ${context.previousSubmissions ?? 0}
- Previous approvals: ${context.previousApprovals ?? 0}
- Previous rejections: ${context.previousRejections ?? 0}
${entitySection}${kbSection}
Return your verdict as JSON matching the required schema.`;

  const systemPrompt = await getSystemPrompt(PROMPT_KEYS.CLAUDE_OVERSIGHT);
  const result = await generateAIJson(VerdictSchema, {
    model: AI_MODELS.CLAUDE,
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 400,
    temperature: 0.1,
    enableAnthropicCache: true,
    fallbackModels: ['anthropic/claude-sonnet-4.5', AI_MODELS.GROK],
    tags: ['feature:claude-oversight', 'pipeline:process-claims'],
  });

  if (!result.ok) {
    return {
      verdict: 'approve',
      confidence: 0.5,
      narrative: `Claude oversight errored (${result.error}) — defaulting to policy engine decision`,
      concerns: ['claude_error'],
    };
  }

  const verdict: ClaudeVerdict = {
    verdict: result.data.verdict,
    confidence: result.data.confidence,
    narrative: result.data.narrative,
    concerns: result.data.concerns,
  };

  // Write the raw verdict + a distilled profile line to mem0. The distilled
  // line gets pulled into the NEXT claim for this wallet as compressed
  // context, cutting input token count while preserving recent history.
  addMemory(
    'wallet',
    context.wallet,
    `Claude ${verdict.verdict} claim ${context.claimId}: ${verdict.narrative}`,
    { pipeline: 'process_claims', verdict: verdict.verdict, confidence: verdict.confidence },
  ).catch(() => {});

  writeDistilledProfile(context.wallet, {
    verdict: verdict.verdict,
    riskBucket:
      context.riskScore > 0.75
        ? 'critical'
        : context.riskScore > 0.5
        ? 'high'
        : context.riskScore > 0.25
        ? 'medium'
        : 'low',
    tier: context.tier,
    claimCount: (context.previousSubmissions ?? 0) + 1,
    lastFlags: verdict.concerns.slice(0, 3),
    narrative: verdict.narrative,
  }).catch(() => {});

  return verdict;
}

export async function reviewClaim(context: ClaudeReviewContext): Promise<ClaudeVerdict> {
  // Upstash exact-match by claimId (1h TTL): a worker re-run on the same
  // claim returns the cached verdict instead of re-querying Claude. Single-
  // flight coalescing also prevents concurrent workers from duplicating work.
  return cacheGetOrFetch(
    `claude:review:${context.claimId}`,
    () => doClaudeReview(context),
    3600,
  );
}

/**
 * Batch review multiple claims. Currently sequential — could be parallelized
 * with Promise.all once we verify Gateway handles concurrent calls without
 * exhausting per-user rate limits.
 */
export async function reviewClaimsBatch(
  contexts: ClaudeReviewContext[],
): Promise<Map<string, ClaudeVerdict>> {
  const results = new Map<string, ClaudeVerdict>();
  for (const ctx of contexts) {
    const verdict = await reviewClaim(ctx);
    results.set(ctx.claimId, verdict);
  }
  return results;
}
