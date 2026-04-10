/**
 * Claude Oversight Engine
 *
 * Final review layer before payout dispatch. Claude receives the complete
 * submission package (all gate results, fraud signals, X account data,
 * location signals, submission history) and returns a verdict.
 *
 * Sits in the process-claims worker AFTER auto-approval but BEFORE
 * payout job creation — the "manager signs off" moment.
 */

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

export async function reviewClaim(context: ClaudeReviewContext): Promise<ClaudeVerdict> {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    // No API key — auto-approve (don't block pipeline)
    return { verdict: 'approve', confidence: 1, narrative: 'Claude oversight unavailable — auto-approved by policy engine', concerns: [] };
  }

  try {
    const failedGates = context.gateResults.filter((g) => !g.passed);
    const passedGates = context.gateResults.filter((g) => g.passed);

    const prompt = `You are the oversight manager for GASCOIN, a gas receipt refund protocol on Solana. Your job is to review auto-approved claims before SOL is dispatched. Be thorough but fair.

CLAIM SUMMARY:
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

Based on ALL signals above, determine if this claim should be:
- "approve" — all looks legitimate, dispatch SOL
- "flag" — something is off, send to manual review (needs_review)
- "reject" — clear fraud indicators

Respond ONLY with valid JSON:
{"verdict":"approve|flag|reject","confidence":0.0-1.0,"narrative":"2-3 sentence explanation for audit log","concerns":["list","of","specific","concerns"]}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { verdict: 'approve', confidence: 0.5, narrative: `Claude API returned ${res.status} — defaulting to policy engine decision`, concerns: ['api_error'] };
    }

    const json = await res.json() as any;
    const text = json?.content?.[0]?.text || '';

    // Parse JSON from Claude's response (handle markdown code blocks)
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      verdict: parsed.verdict || 'approve',
      confidence: Number(parsed.confidence) || 0.5,
      narrative: String(parsed.narrative || ''),
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    };
  } catch (err) {
    // On any failure, don't block the pipeline — approve with note
    return {
      verdict: 'approve',
      confidence: 0.5,
      narrative: 'Claude oversight encountered an error — defaulting to policy engine decision',
      concerns: ['claude_error'],
    };
  }
}

/**
 * Batch review multiple claims in one Claude call (cost optimization).
 * Falls back to individual reviews if batch parsing fails.
 */
export async function reviewClaimsBatch(contexts: ClaudeReviewContext[]): Promise<Map<string, ClaudeVerdict>> {
  const results = new Map<string, ClaudeVerdict>();

  // For now, review individually — batch prompt optimization can come later
  for (const ctx of contexts) {
    const verdict = await reviewClaim(ctx);
    results.set(ctx.claimId, verdict);
  }

  return results;
}
