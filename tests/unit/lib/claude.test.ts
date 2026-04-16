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

// ─── Gateway unavailable ──────────────────────────────────────────────────────

describe('reviewClaim — gateway unavailable', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns approve when gateway is unavailable (policy engine default)', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);
    const result = await reviewClaim(makeContext());
    expect(result.verdict).toBe('approve');
    expect(generateAIJson).not.toHaveBeenCalled();
  });
});

// ─── Tier scrutiny weighting ──────────────────────────────────────────────────

describe('reviewClaim — tier scrutiny weighting', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('includes MAXIMUM scrutiny note for Fleet tier in prompt', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.8, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ tier: 'Fleet', amountSol: 2.5 }));
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).toContain('MAXIMUM scrutiny');
  });

  it('includes HIGH scrutiny note for Road Warrior tier', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.8, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ tier: 'Road Warrior' }));
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).toContain('HIGH scrutiny');
  });

  it('includes BASELINE scrutiny note for Standard tier', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.8, narrative: 'OK', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ tier: 'Standard' }));
    const call = vi.mocked(generateAIJson).mock.calls[0][1];
    expect(call.prompt).toContain('BASELINE scrutiny');
  });
});

// ─── mem0 writes ──────────────────────────────────────────────────────────────

describe('reviewClaim — mem0 writes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('writes verdict to addMemory after successful review', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({
      ok: true,
      data: { verdict: 'approve', confidence: 0.9, narrative: 'Clean.', concerns: [] },
    } as any);
    await reviewClaim(makeContext({ claimId: 'claim-mem0-test' }));
    // addMemory fires async (fire-and-forget), give microtask a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(addMemory).toHaveBeenCalled();
    const call = vi.mocked(addMemory).mock.calls[0];
    expect(call[1]).toBe('GAsWalletTest123'); // wallet
    expect(call[2]).toContain('approve');
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

  it('does NOT write mem0 on error fallback', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({ ok: false, error: 'timeout' } as any);
    await reviewClaim(makeContext());
    await new Promise((r) => setTimeout(r, 0));
    expect(addMemory).not.toHaveBeenCalled();
    expect(writeDistilledProfile).not.toHaveBeenCalled();
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
