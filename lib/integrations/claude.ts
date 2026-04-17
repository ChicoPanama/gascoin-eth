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
 *   - Upstash exact-match cache by claimId+contextHash (1h) prevents re-queries
 *   - Fallback chain: claude-sonnet-4.6 → claude-sonnet-4.5
 */

import { z } from 'zod';
import { getEntityProfile, writeDistilledProfile } from '../mem0';
import { buildClaudeKBContext, writeIntelligence } from '../knowledge-base';
import { getSupabaseAdmin } from '../supabase';
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
  recentRejections7d?: number;
  recentFlags7d?: number;
  // Receipt pipeline flags from Gemini + heuristics (passed through from FraudSignals.flags).
  // Includes 'ocr_unavailable' when Gemini timed out — signals that all receipt signals are
  // degraded and approvals in that window need extra scrutiny.
  flags?: string[];
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

// Minimum confidence required to approve per tier. Below this threshold an
// 'approve' verdict is downgraded to 'flag' before the payout job is created.
const TIER_MIN_CONFIDENCE: Record<string, number> = {
  Fleet: 0.80,
  'Road Warrior': 0.70,
  Commuter: 0.60,
  Standard: 0.50,
};

// System prompt is loaded from Edge Config (or bundled default) at call time
// via getSystemPrompt(). Kept stable across calls to maximize Anthropic
// provider-native cache hit rate (90% off cached input on Sonnet 4.6).

async function doClaudeReview(context: ClaudeReviewContext): Promise<ClaudeVerdict> {
  if (!isAiGatewayAvailable()) {
    // Gateway unavailable (expired OIDC, missing env) — hold for manual review.
    // Auto-approving on outage would silently pass high-risk claims. Surface
    // the gap in the intelligence feed so admins know it happened.
    writeIntelligence({
      entry_type: 'gateway_unavailable',
      entity_type: 'claim',
      entity_id: context.claimId,
      summary: `Claude Gateway unavailable — claim ${context.claimId} held for manual review`,
      detail_json: { wallet: context.wallet, tier: context.tier, amountSol: context.amountSol },
      severity: 'high',
      pipeline_source: 'claude_oversight',
    }).catch(() => {});
    return {
      verdict: 'flag',
      confidence: 0,
      narrative: 'Claude oversight unavailable — held for manual review',
      concerns: ['gateway_unavailable'],
    };
  }

  // Fetch mem0 entity profile first, then build KB context with referral awareness
  const failedGates = context.gateResults.filter((g) => !g.passed);
  const passedGates = context.gateResults.filter((g) => g.passed);

  const entityProfile = await getEntityProfile('wallet', context.wallet).catch((err) => {
    writeIntelligence({
      entry_type: 'mem0_fetch_error',
      entity_type: 'wallet',
      entity_id: context.wallet,
      summary: `mem0 entity profile fetch failed for wallet ${context.wallet}`,
      detail_json: { error: String(err) },
      severity: 'warning',
      pipeline_source: 'claude_oversight',
    }).catch(() => {});
    return null;
  });
  const hasReferralFlags =
    entityProfile?.cross_pipeline_flags?.some((f) => f.includes('referral')) ?? false;
  const kbContext = await buildClaudeKBContext({
    riskScore: context.riskScore,
    failedGates: failedGates.map((g) => g.gate),
    fraudRisk: context.fraudRisk,
    hasReferralFlags,
  }).catch(() => '');

  // Fetch recent unacknowledged high-severity intelligence entries for this wallet
  // so Claude can see what the pipeline has previously flagged.
  let priorIntelSection = '';
  try {
    const supabase = getSupabaseAdmin();
    const { data: priorFlags } = await supabase
      .from('intelligence_entries')
      .select('entry_type, summary, created_at')
      .eq('entity_type', 'wallet')
      .eq('entity_id', context.wallet)
      .eq('acknowledged', false)
      .in('severity', ['critical', 'high'])
      .order('created_at', { ascending: false })
      .limit(3);
    if (priorFlags?.length) {
      priorIntelSection =
        `\nPRIOR INTELLIGENCE (unresolved high-severity flags):\n` +
        priorFlags
          .map(
            (f: any) =>
              `- [${new Date(f.created_at).toLocaleDateString()}] ${f.entry_type}: ${f.summary.slice(0, 120)}`,
          )
          .join('\n') +
        '\n';
    }
  } catch {}

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

  const tierScrutiny: Record<string, string> = {
    Fleet: 'MAXIMUM scrutiny — 10M+ tokens, largest payouts. Any ambiguity → flag.',
    'Road Warrior': 'HIGH scrutiny — 5M+ tokens, premium payouts. Soft signals matter more.',
    Commuter: 'STANDARD scrutiny — 100K+ tokens, enhanced refunds. Normal review.',
    Standard: 'BASELINE scrutiny — entry tier, weekly cap. Lean toward approve on weak signals.',
  };
  const scrutinyNote = tierScrutiny[context.tier] || 'STANDARD scrutiny.';

  const userPrompt = `CLAIM SUMMARY:
- Claim ID: ${context.claimId}
- Wallet: ${context.wallet}
- X Handle: @${context.xHandle}
- Tier: ${context.tier} — ${scrutinyNote}
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

RECEIPT PIPELINE FLAGS:
${context.flags && context.flags.length > 0
  ? (context.flags.includes('ocr_unavailable')
      ? `⚠ OCR UNAVAILABLE — Gemini Vision did not run. All receipt signals are heuristic-only (EXIF/dimensions). Do not interpret missing-receipt flags as fraud; they reflect data absence, not evidence.\n` +
        `- Other flags: ${context.flags.filter(f => f !== 'ocr_unavailable').join(', ') || 'none'}`
      : `- ${context.flags.join(', ')}`)
  : '- none'}

HISTORY:
- Previous submissions: ${context.previousSubmissions ?? 0}
- Previous approvals: ${context.previousApprovals ?? 0}
- Previous rejections: ${context.previousRejections ?? 0} (${context.recentRejections7d ?? 0} in last 7 days)
- Recent manual-review flags (7d): ${context.recentFlags7d ?? 0}
${entitySection}${priorIntelSection}${kbSection}
Return your verdict as JSON matching the required schema.`;

  const systemPrompt = await getSystemPrompt(PROMPT_KEYS.CLAUDE_OVERSIGHT);
  const result = await generateAIJson(VerdictSchema, {
    model: AI_MODELS.CLAUDE,
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 400,
    temperature: 0.1,
    enableAnthropicCache: true,
    gatewayCacheSeconds: 3600,
    fallbackModels: ['anthropic/claude-sonnet-4.5'],
    tags: ['feature:claude-oversight', 'pipeline:process-claims'],
  });

  if (!result.ok) {
    return {
      verdict: 'flag',
      confidence: 0,
      narrative: `Claude oversight errored (${result.error?.slice(0, 400)}) — sent to manual review queue`,
      concerns: ['claude_error'],
    };
  }

  const verdict: ClaudeVerdict = {
    verdict: result.data.verdict,
    confidence: result.data.confidence,
    narrative: result.data.narrative,
    concerns: result.data.concerns,
  };

  // Enforce per-tier minimum confidence floor. An 'approve' with confidence
  // below the tier threshold is downgraded to 'flag' — a 55% confidence
  // approve on a Fleet-tier 2.5 SOL payout is not good enough.
  const minConf = TIER_MIN_CONFIDENCE[context.tier] ?? 0.50;
  if (verdict.verdict === 'approve' && verdict.confidence < minConf) {
    verdict.verdict = 'flag';
    verdict.concerns = [...verdict.concerns, `confidence_below_tier_floor_${minConf}`];
    verdict.narrative = `${verdict.narrative} (downgraded: confidence ${verdict.confidence} < ${minConf} floor for ${context.tier})`;
  }

  // Escalate if the wallet has a recent rejection pattern: 2+ rejections or
  // manual-review flags in the last 7 days warrant human review regardless
  // of the individual claim's signals looking clean.
  const recentPatternAlert =
    (context.recentRejections7d ?? 0) >= 2 || (context.recentFlags7d ?? 0) >= 2;
  if (recentPatternAlert && verdict.verdict === 'approve') {
    verdict.verdict = 'flag';
    verdict.concerns = [...verdict.concerns, 'recent_rejection_pattern_7d'];
    verdict.narrative = `${verdict.narrative} (escalated: 2+ rejections/flags in 7 days)`;
  }

  // Write compressed distilled profile to mem0. The distilled line is the
  // only mem0 write — the raw full narrative write was removed to prevent
  // the profile cache from being bloated with redundant text.
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
    claimId: context.claimId,
  }).catch((err) => {
    writeIntelligence({
      entry_type: 'mem0_write_error',
      entity_type: 'wallet',
      entity_id: context.wallet,
      summary: `mem0 writeDistilledProfile failed for wallet ${context.wallet}`,
      detail_json: { error: String(err), claimId: context.claimId },
      severity: 'warning',
      pipeline_source: 'claude_oversight',
    }).catch(() => {});
  });

  return verdict;
}

export async function reviewClaim(context: ClaudeReviewContext): Promise<ClaudeVerdict> {
  // Cache key includes a short hash of the claim's risk signals so a re-queued
  // claim with updated data gets a fresh Claude verdict rather than the stale
  // cached one.
  const contextHash = Buffer.from(
    JSON.stringify({
      riskScore: context.riskScore,
      gateResults: context.gateResults,
      fraudRisk: context.fraudRisk,
    }),
  )
    .toString('base64')
    .slice(0, 12);

  return cacheGetOrFetch(
    `claude:review:${context.claimId}:${contextHash}`,
    () => doClaudeReview(context),
    3600,
  );
}

/**
 * Batch review multiple claims in parallel.
 */
export async function reviewClaimsBatch(
  contexts: ClaudeReviewContext[],
): Promise<Map<string, ClaudeVerdict>> {
  const entries = await Promise.all(
    contexts.map(async (ctx) => [ctx.claimId, await reviewClaim(ctx)] as const),
  );
  return new Map(entries);
}
