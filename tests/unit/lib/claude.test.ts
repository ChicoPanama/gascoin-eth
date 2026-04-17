import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (must precede all imports) ────────────────────────────────────────

vi.mock('@/lib/integrations/ai-gateway', () => ({
  isAiGatewayAvailable: vi.fn().mockReturnValue(true),
  generateAIJson: vi.fn().mockResolvedValue({
    ok: true,
    data: { verdict: 'approve', confidence: 0.9, narrative: 'All signals clean.', concerns: [] },
  }),
  AI_MODELS: {
    CLAUDE: 'anthropic/claude-sonnet-4.6',
    GROK: 'xai/grok-4.1-fast-reasoning',
    GEMINI_VISION: 'google/gemini-3-flash',
    GEMINI_FAST: 'google/gemini-3-flash',
  },
}));

vi.mock('@/lib/mem0', () => ({
  getEntityProfile: vi.fn().mockResolvedValue({
    cross_pipeline_flags: [],
    claude_narratives: [],
    trust_trajectory: 'new',
    velocity: { submissions_7d: 0, points_7d: 0 },
    notable_patterns: [],
    last_fraud_signals: [],
  }),
  addMemory: vi.fn().mockResolvedValue(undefined),
  writeDistilledProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/knowledge-base', () => ({
  buildClaudeKBContext: vi.fn().mockResolvedValue(''),
  writeIntelligence: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    }),
  }),
}));

vi.mock('@/lib/cache', () => ({
  cacheGetOrFetch: vi.fn().mockImplementation(async (_key: string, fn: () => unknown) => fn()),
}));

vi.mock('@/lib/prompts', () => ({
  getSystemPrompt: vi.fn().mockResolvedValue('You are the oversight manager for GASCOIN.'),
  PROMPT_KEYS: { CLAUDE_OVERSIGHT: 'prompts_claude_oversight_system' },
}));

import { reviewClaim } from '@/lib/integrations/claude';
import type { ClaudeReviewContext } from '@/lib/integrations/claude';
import { isAiGatewayAvailable, generateAIJson } from '@/lib/integrations/ai-gateway';
import { addMemory, writeDistilledProfile } from '@/lib/mem0';
import { writeIntelligence } from '@/lib/knowledge-base';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeContext(overrides: Partial<ClaudeReviewContext> = {}): ClaudeReviewContext {
  return {
    claimId: 'claim-test-1',
    wallet: 'GAsWalletTest123',
    xHandle: 'testuser',
    tier: 'Standard',
    amountSol: 0.05,
    gateResults: [
      { gate: 'authentic_photo', passed: true, score: 0.9 },
      { gate: 'gas_station', passed: true },
      { gate: 'wallet_match', passed: true },
    ],
    riskScore: 0.1,
    aiScore: 0.1,
    tamperScore: 0.05,
    fraudRisk: 'low',
    crossValidation: null,
    ipCountry: 'US',
    ocrCountry: 'US',
    exifHasGps: true,
    followerCount: 200,
    accountQualityScore: 75,
    accountAgeDays: 400,
    previousSubmissions: 3,
    previousApprovals: 3,
    previousRejections: 0,
    recentRejections7d: 0,
    recentFlags7d: 0,
    ...overrides,
  };
}

// ─── Verdict parsing ──────────────────────────────────────────────────────────

describe('reviewClaim — verdict parsing', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns approve verdict when model says approve', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.95, narrative: 'Clean signals.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext());
    expect(result.verdict).toBe('approve');
    expect(result.confidence).toBe(0.95);
  });

  it('returns reject verdict correctly', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'reject', confidence: 0.88, narrative: 'AI score too high.', concerns: ['ai_score'] },
    } as any);
    const result = await reviewClaim(makeContext());
    expect(result.verdict).toBe('reject');
    expect(result.concerns).toContain('ai_score');
  });

  it('returns flag verdict correctly', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'flag', confidence: 0.6, narrative: 'Ambiguous signals.', concerns: ['new_account'] },
    } as any);
    const result = await reviewClaim(makeContext());
    expect(result.verdict).toBe('flag');
  });
});

// ─── Error fallback (NOT approve) ─────────────────────────────────────────────

describe('reviewClaim — error fallback goes to manual review', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns flag (not approve) when generateAIJson fails', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: false,
      error: 'model_timeout',
    } as any);
    const result = await reviewClaim(makeContext());
    expect(result.verdict).toBe('flag');
    expect(result.concerns).toContain('claude_error');
  });

  it('returns confidence=0 on error (no false certainty)', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({ ok: false, error: 'upstream_error' } as any);
    const result = await reviewClaim(makeContext());
    expect(result.confidence).toBe(0);
  });

  it('includes error detail in narrative', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({ ok: false, error: 'rate_limited_429' } as any);
    const result = await reviewClaim(makeContext());
    expect(result.narrative).toContain('rate_limited_429');
  });
});

// ─── Gateway unavailable — must flag, not approve ─────────────────────────────

describe('reviewClaim — gateway unavailable', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns flag (not approve) when gateway is unavailable', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);
    const result = await reviewClaim(makeContext());
    expect(result.verdict).toBe('flag');
    expect(result.concerns).toContain('gateway_unavailable');
    expect(generateAIJson).not.toHaveBeenCalled();
  });

  it('writes intelligence entry when gateway is unavailable', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);
    await reviewClaim(makeContext({ claimId: 'claim-gw-down', tier: 'Fleet', amountSol: 2.5 }));
    await new Promise((r) => setTimeout(r, 0));
    expect(writeIntelligence).toHaveBeenCalledWith(
      expect.objectContaining({
        entry_type: 'gateway_unavailable',
        entity_id: 'claim-gw-down',
        severity: 'high',
      }),
    );
  });
});

// ─── Tier scrutiny weighting ──────────────────────────────────────────────────

describe('reviewClaim — tier scrutiny weighting', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('includes MAXIMUM scrutiny note for Fleet tier in prompt', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ tier: 'Fleet', amountSol: 2.5 }));
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).toContain('MAXIMUM scrutiny');
  });

  it('includes HIGH scrutiny note for Road Warrior tier', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ tier: 'Road Warrior' }));
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).toContain('HIGH scrutiny');
  });

  it('includes BASELINE scrutiny note for Standard tier', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ tier: 'Standard' }));
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).toContain('BASELINE scrutiny');
  });
});

// ─── Confidence tier floors ───────────────────────────────────────────────────

describe('reviewClaim — confidence tier floors', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('Fleet approve at 0.55 confidence → downgraded to flag', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.55, narrative: 'Borderline.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ tier: 'Fleet', amountSol: 2.5 }));
    expect(result.verdict).toBe('flag');
    expect(result.concerns).toContain('confidence_below_tier_floor_0.8');
  });

  it('Fleet approve at 0.85 confidence → remains approve', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.85, narrative: 'Clean.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ tier: 'Fleet', amountSol: 2.5 }));
    expect(result.verdict).toBe('approve');
  });

  it('Road Warrior approve at 0.65 confidence → downgraded to flag', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.65, narrative: 'Borderline.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ tier: 'Road Warrior' }));
    expect(result.verdict).toBe('flag');
    expect(result.concerns).toContain('confidence_below_tier_floor_0.7');
  });

  it('Standard approve at 0.45 confidence → downgraded to flag', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.45, narrative: 'Weak.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ tier: 'Standard' }));
    expect(result.verdict).toBe('flag');
    expect(result.concerns).toContain('confidence_below_tier_floor_0.5');
  });

  it('tier floor does not downgrade reject verdicts', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'reject', confidence: 0.3, narrative: 'Clear fraud.', concerns: ['ai_score'] },
    } as any);
    const result = await reviewClaim(makeContext({ tier: 'Fleet', amountSol: 2.5 }));
    expect(result.verdict).toBe('reject');
  });
});

// ─── Recent rejection pattern escalation ────────────────────────────────────

describe('reviewClaim — recent rejection pattern escalation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('escalates approve to flag when wallet has 2+ rejections in 7 days', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'Clean.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ recentRejections7d: 2 }));
    expect(result.verdict).toBe('flag');
    expect(result.concerns).toContain('recent_rejection_pattern_7d');
  });

  it('escalates approve to flag when wallet has 2+ flags in 7 days', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'Clean.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ recentFlags7d: 2 }));
    expect(result.verdict).toBe('flag');
    expect(result.concerns).toContain('recent_rejection_pattern_7d');
  });

  it('does not escalate when recent counts are below threshold', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'Clean.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ recentRejections7d: 1, recentFlags7d: 1 }));
    expect(result.verdict).toBe('approve');
  });
});

// ─── Prior intelligence surfaced in prompt ────────────────────────────────────

describe('reviewClaim — prior intelligence entries in context', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('includes prior high-severity flags in userPrompt when present', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { entry_type: 'ring_detected', summary: 'Referral ring BFS cycle found', created_at: '2026-04-10T12:00:00Z' },
            { entry_type: 'fraud_signal', summary: 'AI score 0.78 above threshold', created_at: '2026-04-09T08:00:00Z' },
          ],
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValueOnce(mockSupabase as any);

    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK.', concerns: [] },
    } as any);

    await reviewClaim(makeContext());
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).toContain('PRIOR INTELLIGENCE');
    expect(call.prompt).toContain('ring_detected');
    expect(call.prompt).toContain('fraud_signal');
  });

  it('omits prior intelligence section when no entries found', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK.', concerns: [] },
    } as any);

    await reviewClaim(makeContext());
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).not.toContain('PRIOR INTELLIGENCE');
  });
});

// ─── mem0 writes ──────────────────────────────────────────────────────────────

describe('reviewClaim — mem0 writes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does NOT call addMemory directly (distilled profile is the only write)', async () => {
    // Gap #18: the raw addMemory duplicate write was removed. Only
    // writeDistilledProfile fires. This test is a regression guard.
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'Clean.', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ claimId: 'claim-mem0-test' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(addMemory).not.toHaveBeenCalled();
  });

  it('writes distilled profile after successful review', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'Clean.', concerns: [] },
    } as any);
    await reviewClaim(makeContext());
    await new Promise((r) => setTimeout(r, 0));
    expect(writeDistilledProfile).toHaveBeenCalledWith(
      'GAsWalletTest123',
      expect.objectContaining({ verdict: 'approve' }),
    );
  });

  it('does NOT write distilled profile on error fallback', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({ ok: false, error: 'timeout' } as any);
    await reviewClaim(makeContext());
    await new Promise((r) => setTimeout(r, 0));
    expect(writeDistilledProfile).not.toHaveBeenCalled();
  });

  it('writes intelligence entry when writeDistilledProfile throws', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'Clean.', concerns: [] },
    } as any);
    vi.mocked(writeDistilledProfile).mockRejectedValueOnce(new Error('mem0 503'));

    await reviewClaim(makeContext({ wallet: 'WalletWithMem0Error' }));
    await new Promise((r) => setTimeout(r, 10));
    expect(writeIntelligence).toHaveBeenCalledWith(
      expect.objectContaining({
        entry_type: 'mem0_write_error',
        entity_id: 'WalletWithMem0Error',
        severity: 'warning',
      }),
    );
  });
});

// ─── Grok not in fallback chain ───────────────────────────────────────────────

describe('reviewClaim — fallback model list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does not include Grok in fallback models (oversight only)', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext());
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    const fallbacks = call.fallbackModels ?? [];
    expect(fallbacks.every((m: string) => !m.includes('grok'))).toBe(true);
  });

  it('uses claude-sonnet-4.5 as fallback', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext());
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.fallbackModels).toContain('anthropic/claude-sonnet-4.5');
  });
});

// ─── Null entity profile ──────────────────────────────────────────────────────

describe('reviewClaim — null entity profile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('proceeds without throwing when entity profile is null', async () => {
    const { getEntityProfile } = await import('@/lib/mem0');
    vi.mocked(getEntityProfile).mockResolvedValueOnce(null as any);
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.85, narrative: 'Clean.', concerns: [] },
    } as any);
    await expect(reviewClaim(makeContext())).resolves.not.toThrow();
  });
});

// ─── userPrompt structure snapshot ───────────────────────────────────────────

describe('reviewClaim — userPrompt structure', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('userPrompt contains all required sections', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({
      tier: 'Fleet',
      amountSol: 2.5,
      riskScore: 0.2,
      previousRejections: 1,
      recentRejections7d: 0,
      recentFlags7d: 0,
    }));
    const prompt: string = vi.mocked(generateAIJson).mock.calls[0][1].prompt ?? '';
    expect(prompt).toContain('CLAIM SUMMARY:');
    expect(prompt).toContain('GATE RESULTS');
    expect(prompt).toContain('FRAUD SIGNALS:');
    expect(prompt).toContain('LOCATION:');
    expect(prompt).toContain('ACCOUNT:');
    expect(prompt).toContain('HISTORY:');
    expect(prompt).toContain('Recent manual-review flags (7d):');
    expect(prompt).toContain('in last 7 days');
    expect(prompt).toContain('Return your verdict as JSON');
  });
});

// ─── Cross-engine: receipt flags in Claude prompt ─────────────────────────────

describe('reviewClaim — receipt pipeline flags', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('includes RECEIPT PIPELINE FLAGS section in prompt', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ flags: ['not_physical_receipt', 'screen_dimensions'] }));
    const prompt: string = vi.mocked(generateAIJson).mock.calls[0][1].prompt ?? '';
    expect(prompt).toContain('RECEIPT PIPELINE FLAGS:');
    expect(prompt).toContain('not_physical_receipt');
    expect(prompt).toContain('screen_dimensions');
  });

  it('shows OCR unavailable warning when ocr_unavailable flag is present', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({
      flags: ['ocr_unavailable', 'not_physical_receipt', 'not_gas_station'],
    }));
    const prompt: string = vi.mocked(generateAIJson).mock.calls[0][1].prompt ?? '';
    expect(prompt).toContain('OCR UNAVAILABLE');
    expect(prompt).toContain('Gemini Vision did not run');
  });

  it('shows none when flags array is empty', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ flags: [] }));
    const prompt: string = vi.mocked(generateAIJson).mock.calls[0][1].prompt ?? '';
    expect(prompt).toContain('RECEIPT PIPELINE FLAGS:');
    expect(prompt).toContain('- none');
  });

  it('works when flags is undefined (not passed from older code paths)', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'OK', concerns: [] },
    } as any);
    const ctx = makeContext();
    delete (ctx as any).flags;
    await expect(reviewClaim(ctx)).resolves.not.toThrow();
  });
});

// ─── Cross-engine: tier name vs slug ─────────────────────────────────────────

describe('reviewClaim — tier floor uses tier name keys', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('Fleet tier with name "Fleet" correctly applies 0.80 confidence floor', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.75, narrative: 'Borderline.', concerns: [] },
    } as any);
    const result = await reviewClaim(makeContext({ tier: 'Fleet' }));
    // 0.75 < 0.80 → must be downgraded
    expect(result.verdict).toBe('flag');
    expect(result.concerns.some(c => c.includes('confidence_below_tier_floor'))).toBe(true);
  });

  it('slug-style "fleet" does NOT match tier floor keys — falls back to Standard floor', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.55, narrative: 'Borderline.', concerns: [] },
    } as any);
    // If someone accidentally passes slug, 0.55 < 0.50 (Standard floor) still flags
    const result = await reviewClaim(makeContext({ tier: 'fleet' }));
    // 0.55 > 0.50 (Standard fallback) → would approve without the tier name fix
    // This test documents that slugs should NOT be passed — the worker now uses tier.name
    expect(result.verdict).toBe('approve'); // without the fix, slug bypasses 0.80 Fleet floor
  });
});
