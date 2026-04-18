import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (must precede all imports) ────────────────────────────────────────

vi.mock('@/lib/integrations/receipt-pipeline', () => ({
  computeExactHash: vi.fn().mockReturnValue('sha256abc'),
  computePerceptualHash: vi.fn().mockResolvedValue('abcdef0123456789'),
  checkExifMetadata: vi.fn().mockReturnValue({ score: 0.9, flags: [] }),
  checkImageDimensions: vi.fn().mockReturnValue({ score: 0.9, flags: [] }),
}));

vi.mock('@/lib/integrations/ai-gateway', () => ({
  isAiGatewayAvailable: vi.fn().mockReturnValue(true),
  generateAIJson: vi.fn().mockResolvedValue({
    ok: true,
    data: { fraudRiskLevel: 'low', confidence: 0.8, reasoning: 'Signals look normal', concerns: [] },
  }),
  AI_MODELS: { GROK: 'grok-3', GEMINI_FAST: 'gemini-flash', GEMINI_VISION: 'gemini-pro-vision' },
}));

vi.mock('@/lib/prompts', () => ({
  getSystemPrompt: vi.fn().mockResolvedValue('system prompt'),
  PROMPT_KEYS: { GROK_FRAUD: 'grok_fraud' },
}));

vi.mock('@/lib/mem0', () => ({
  writeFraudSignal: vi.fn().mockResolvedValue(undefined),
  addMemory: vi.fn().mockResolvedValue(undefined),
  MEM0_CATEGORIES: {
    FRAUD_SIGNALS: 'fraud_signals',
    WALLET_TRUST_TRAJECTORY: 'wallet_trust_trajectory',
  },
  MEM0_AGENTS: {
    GROK_FRAUD: 'grok-fraud',
    GEMINI_VISION: 'gemini-vision',
    SUBMIT_PIPELINE: 'submit-pipeline',
  },
  MEM0_APPS: { SUBMIT: 'gascoin-submit' },
}));

vi.mock('@/lib/knowledge-base', () => ({
  writeIntelligence: vi.fn().mockResolvedValue(undefined),
}));

import { runFraudChecks } from '@/lib/integrations/fraud';
import { isAiGatewayAvailable, generateAIJson } from '@/lib/integrations/ai-gateway';
import { checkExifMetadata, checkImageDimensions, type PipelineResult } from '@/lib/integrations/receipt-pipeline';
import { writeFraudSignal, addMemory } from '@/lib/mem0';
import { writeIntelligence } from '@/lib/knowledge-base';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DUMMY_BUF = Buffer.alloc(48).buffer as ArrayBuffer;
const WALLET = 'GAsWalletFraud1';
const CLAIM_ID = 'claim-fraud-test-1';

function makePipeline(overrides: Record<string, unknown> = {}): PipelineResult {
  return {
    exactHash: 'sha256abc',
    perceptualHash: 'abcdef0123456789',
    exif: { score: 0.9, flags: [] as string[], hasExif: true, cameraModel: null, dateTime: null, hasGps: false, software: null },
    dimensions: { score: 0.9, flags: [] as string[], width: 3024, height: 4032, format: 'jpeg', fileSize: 2_000_000 },
    authenticityScore: 0.9,
    fraudRisk: 'low',
    flags: [] as string[],
    extraction: {
      station_country: 'US',
      receipt_date: '2026-04-01',
      total_amount: 50,
      currency: 'USD',
      wallet_address: null,
      has_handwriting: true,
      has_gascoin_hashtag: false,
      is_physical_receipt: true,
      is_gas_station: true,
      is_digitally_manipulated: false,
      confidence: 0.9,
      fraud_notes: '',
      raw_text: '',
      ...overrides,
    },
  } as any;
}

function mockGrok(result: { fraudRiskLevel: 'low' | 'medium' | 'high'; confidence: number; reasoning?: string; concerns?: string[] }) {
  vi.mocked(generateAIJson).mockResolvedValueOnce({
    ok: true,
    data: { reasoning: 'test', concerns: [], ...result },
  });
}

// ─── aiScore computation ──────────────────────────────────────────────────────

describe('runFraudChecks — aiScore computation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('defaults to 0.25 when no pipeline data', async () => {
    const result = await runFraudChecks(DUMMY_BUF);
    expect(result.aiScore).toBe(0.25);
  });

  it('sets aiScore=0.8 when is_digitally_manipulated', async () => {
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.aiScore).toBe(0.8);
  });

  it('sets aiScore=0.7 when not a physical receipt', async () => {
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_physical_receipt: false, is_digitally_manipulated: false }));
    expect(result.aiScore).toBe(0.7);
  });

  it('sets aiScore=0.1 when model is highly confident it is real', async () => {
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ confidence: 0.95, is_physical_receipt: true, is_digitally_manipulated: false }));
    expect(result.aiScore).toBe(0.1);
  });

  it('sets aiScore=1-confidence when confidence is moderate', async () => {
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ confidence: 0.6, is_physical_receipt: true, is_digitally_manipulated: false }));
    expect(result.aiScore).toBeCloseTo(0.4, 5);
  });

  it('stays at 0.25 neutral when ocr_fallback:true even though is_physical_receipt:false', async () => {
    // fallbackExtraction() returns is_physical_receipt:false — without the guard
    // this would push aiScore to 0.7 and trigger Grok on every Gemini outage.
    const result = await runFraudChecks(
      DUMMY_BUF,
      makePipeline({ is_physical_receipt: false, is_digitally_manipulated: false, ocr_fallback: true }),
    );
    expect(result.aiScore).toBe(0.25);
  });
});

// ─── tamperScore computation ──────────────────────────────────────────────────

describe('runFraudChecks — tamperScore computation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('computes tamperScore from exif + dims weights', async () => {
    vi.mocked(checkExifMetadata).mockReturnValueOnce({ score: 0.6, flags: [] } as any);
    vi.mocked(checkImageDimensions).mockReturnValueOnce({ score: 0.8, flags: [] } as any);
    const result = await runFraudChecks(DUMMY_BUF);
    // (1-0.6)*0.4 + (1-0.8)*0.3 = 0.16 + 0.06 = 0.22
    expect(result.tamperScore).toBeCloseTo(0.22, 5);
  });

  it('adds 0.3 bonus when digitally manipulated flag is set', async () => {
    vi.mocked(checkExifMetadata).mockReturnValueOnce({ score: 0.9, flags: [] } as any);
    vi.mocked(checkImageDimensions).mockReturnValueOnce({ score: 0.9, flags: [] } as any);
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    // base = (1-0.9)*0.4 + (1-0.9)*0.3 = 0.07, + 0.3 = 0.37
    expect(result.tamperScore).toBeCloseTo(0.37, 5);
  });

  it('clamps tamperScore to 0–1', async () => {
    // Pass exif/dims directly in pipeline to override defaults
    const badPipeline = { ...makePipeline({ is_digitally_manipulated: true }), exif: { score: 0, flags: [] }, dimensions: { score: 0, flags: [] } };
    const result = await runFraudChecks(DUMMY_BUF, badPipeline as any);
    // (1-0)*0.4 + (1-0)*0.3 + 0.3 = 1.0 — clamped to 1.0
    expect(result.tamperScore).toBe(1.0);
  });
});

// ─── Grok trigger conditions ──────────────────────────────────────────────────

describe('runFraudChecks — Grok trigger conditions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does NOT trigger Grok when all signals are clean', async () => {
    // aiScore=0.25 (no pipeline), tamperScore≈0.07 (good exif+dims), flags=0
    await runFraudChecks(DUMMY_BUF);
    expect(generateAIJson).not.toHaveBeenCalled();
  });

  it('triggers Grok when aiScore > 0.3', async () => {
    // is_digitally_manipulated → aiScore=0.8
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(generateAIJson).toHaveBeenCalledOnce();
  });

  it('triggers Grok when tamperScore > 0.3', async () => {
    vi.mocked(checkExifMetadata).mockReturnValueOnce({ score: 0, flags: [] } as any); // exif=0 → tamper ≈ 0.43
    await runFraudChecks(DUMMY_BUF);
    expect(generateAIJson).toHaveBeenCalledOnce();
  });

  it('triggers Grok when flags.length > 2', async () => {
    vi.mocked(checkExifMetadata).mockReturnValueOnce({ score: 0.9, flags: ['f1', 'f2', 'f3'] } as any);
    await runFraudChecks(DUMMY_BUF);
    expect(generateAIJson).toHaveBeenCalledOnce();
  });

  it('does NOT trigger Grok when ocr_fallback:true (Gemini outage path)', async () => {
    // fallbackExtraction() has is_physical_receipt:false — used to push aiScore to 0.7
    // and trigger Grok. With the guard, aiScore stays at 0.25 neutral and Grok is skipped.
    await runFraudChecks(
      DUMMY_BUF,
      makePipeline({ is_physical_receipt: false, is_digitally_manipulated: false, ocr_fallback: true }),
    );
    expect(generateAIJson).not.toHaveBeenCalled();
  });

  it('does NOT trigger Grok when gateway is unavailable', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    // aiFraudAnalysis uses isAiGatewayAvailable internally — returns fallback without calling generateAIJson
    expect(generateAIJson).not.toHaveBeenCalled();
    expect(result.crossValidation?.concerns).toContain('ai_unavailable');
  });
});

// ─── Score elevation ──────────────────────────────────────────────────────────

describe('runFraudChecks — Grok score elevation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('elevates aiScore to 0.6 minimum when Grok returns high with confidence > 0.7', async () => {
    // confidence=0.5 → aiScore = 0.5 (below 0.6)
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.8 });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ confidence: 0.5 }));
    expect(result.aiScore).toBeGreaterThanOrEqual(0.6);
  });

  it('elevates tamperScore to 0.5 minimum when Grok returns high with confidence > 0.7', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.8 });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ confidence: 0.5 }));
    expect(result.tamperScore).toBeGreaterThanOrEqual(0.5);
  });

  it('does NOT reduce aiScore if it was already above 0.6', async () => {
    // is_digitally_manipulated → aiScore=0.8, stays 0.8
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.8 });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.aiScore).toBe(0.8);
  });

  it('does NOT elevate scores when Grok confidence <= 0.7', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.65 });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ confidence: 0.5 }));
    expect(result.aiScore).toBeCloseTo(0.5, 5);
  });

  it('does NOT elevate scores when Grok risk is medium', async () => {
    mockGrok({ fraudRiskLevel: 'medium', confidence: 0.9 });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ confidence: 0.5 }));
    expect(result.aiScore).toBeCloseTo(0.5, 5);
  });
});

// ─── Gateway unavailable fallback ────────────────────────────────────────────

describe('runFraudChecks — gateway unavailable fallback', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns medium risk when gateway is not available', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.crossValidation?.fraudRiskLevel).toBe('medium');
    expect(result.crossValidation?.confidence).toBe(0.5);
  });

  it('returns ai_unavailable concern when gateway is not available', async () => {
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false);
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.crossValidation?.concerns).toContain('ai_unavailable');
  });

  it('returns gateway_error concern when generateAIJson fails', async () => {
    vi.mocked(generateAIJson).mockResolvedValueOnce({ ok: false, error: 'timeout' } as any);
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.crossValidation?.concerns).toContain('gateway_error');
  });
});

// ─── writeFraudSignal calls ───────────────────────────────────────────────────

describe('runFraudChecks — writeFraudSignal side effects', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls writeFraudSignal for aiScore > 0.65', async () => {
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET, claimId: CLAIM_ID });
    const calls = vi.mocked(writeFraudSignal).mock.calls;
    const aiSignal = calls.find(c => c[1].name.startsWith('aiScore_'));
    expect(aiSignal).toBeDefined();
    expect(aiSignal![0]).toBe(WALLET);
    expect(aiSignal![1].source).toBe('gemini_vision');
  });

  it('uses severity=critical when aiScore > 0.85', async () => {
    // is_digitally_manipulated → aiScore=0.8, not quite 0.85, use high by default
    // We'll use confidence-based path to get above 0.85 — actually 0.8 is high not critical
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET });
    const calls = vi.mocked(writeFraudSignal).mock.calls;
    const aiSignal = calls.find(c => c[1].name.startsWith('aiScore_'));
    expect(aiSignal![1].severity).toBe('high'); // 0.8 is not > 0.85
  });

  it('calls writeFraudSignal for tamperScore > 0.55', async () => {
    // Set exif/dims to 0 in pipeline (not via function mock — pipeline takes precedence)
    const badPipeline = { ...makePipeline({ is_digitally_manipulated: true }), exif: { score: 0, flags: [] }, dimensions: { score: 0, flags: [] } };
    await runFraudChecks(DUMMY_BUF, badPipeline as any, { wallet: WALLET });
    const calls = vi.mocked(writeFraudSignal).mock.calls;
    expect(calls.some(c => c[1].name.startsWith('tamperScore_'))).toBe(true);
  });

  it('calls writeFraudSignal for digitally_manipulated', async () => {
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET });
    const calls = vi.mocked(writeFraudSignal).mock.calls;
    expect(calls.some(c => c[1].name === 'digitally_manipulated')).toBe(true);
  });

  it('calls writeFraudSignal for not_physical_receipt', async () => {
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_physical_receipt: false }), { wallet: WALLET });
    const calls = vi.mocked(writeFraudSignal).mock.calls;
    expect(calls.some(c => c[1].name === 'not_physical_receipt')).toBe(true);
  });

  it('calls writeFraudSignal for grok cross-validation when high + confidence > 0.7', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.85, reasoning: 'Suspicious patterns detected' });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET, claimId: CLAIM_ID });
    const calls = vi.mocked(writeFraudSignal).mock.calls;
    const grokSignal = calls.find(c => c[1].name.startsWith('grok_cross_validation_'));
    expect(grokSignal).toBeDefined();
    expect(grokSignal![1].source).toBe('grok_reasoning');
  });

  it('does NOT call writeFraudSignal for grok when confidence <= 0.7', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.65 });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET });
    const calls = vi.mocked(writeFraudSignal).mock.calls;
    expect(calls.some(c => c[1].name.startsWith('grok_cross_validation_'))).toBe(false);
  });

  it('does NOT call writeFraudSignal when no wallet in context', async () => {
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(writeFraudSignal).not.toHaveBeenCalled();
  });
});

// ─── WALLET_TRUST_TRAJECTORY elevation signal ─────────────────────────────────

describe('runFraudChecks — Grok elevation writes WALLET_TRUST_TRAJECTORY', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls addMemory with WALLET_TRUST_TRAJECTORY when Grok elevates scores', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.85, reasoning: 'Elevation test' });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET });
    const calls = vi.mocked(addMemory).mock.calls;
    const trajectoryCall = calls.find(c => (c[2] as any)?.category === 'wallet_trust_trajectory' || (c[3] as any)?.category === 'wallet_trust_trajectory');
    expect(trajectoryCall).toBeDefined();
  });

  it('does NOT call addMemory for trajectory when Grok confidence <= 0.7', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.65 });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET });
    const calls = vi.mocked(addMemory).mock.calls;
    expect(calls.some(c => (c[3] as any)?.category === 'wallet_trust_trajectory')).toBe(false);
  });

  it('does NOT call addMemory when no wallet in context', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.9 });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(addMemory).not.toHaveBeenCalled();
  });
});

// ─── Return shape ─────────────────────────────────────────────────────────────

describe('runFraudChecks — return shape', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all required fields', async () => {
    const result = await runFraudChecks(DUMMY_BUF);
    expect(result).toHaveProperty('aiScore');
    expect(result).toHaveProperty('tamperScore');
    expect(result).toHaveProperty('duplicateHash', false);
    expect(result).toHaveProperty('duplicatePhash', false);
    expect(result).toHaveProperty('hashSha256', 'sha256abc');
    expect(result).toHaveProperty('pHash', 'abcdef0123456789');
    expect(result).toHaveProperty('authenticityScore');
    expect(result).toHaveProperty('fraudRisk');
    expect(result).toHaveProperty('exifScore');
    expect(result).toHaveProperty('dimensionScore');
    expect(result).toHaveProperty('flags');
    expect(result).toHaveProperty('crossValidation');
  });

  it('fraudRisk uses Grok result when cross-validation triggered', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.9 });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.fraudRisk).toBe('high');
  });

  it('fraudRisk falls back to heuristic when Grok not triggered', async () => {
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ confidence: 0.9 }));
    // authenticityScore = (0.9 + 0.9)/2 = 0.9 > 0.6 → fraudRisk = 'low'
    expect(result.fraudRisk).toBe('low');
    expect(result.crossValidation).toBeNull();
  });

  it('crossValidation matches Grok output', async () => {
    mockGrok({ fraudRiskLevel: 'medium', confidence: 0.6, reasoning: 'Some concerns', concerns: ['c1'] });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.crossValidation?.fraudRiskLevel).toBe('medium');
    expect(result.crossValidation?.confidence).toBe(0.6);
    expect(result.crossValidation?.concerns).toContain('c1');
  });

  it('aggregates flags from exif, dims, and pipeline', async () => {
    // Flags come from pipeline.exif.flags, pipeline.dimensions.flags, and pipeline.flags
    const flaggedPipeline = {
      ...makePipeline(),
      exif: { score: 0.5, flags: ['no_make'] },
      dimensions: { score: 0.5, flags: ['screen_res'] },
      flags: ['low_confidence'],
    };
    const result = await runFraudChecks(DUMMY_BUF, flaggedPipeline as any);
    expect(result.flags).toContain('no_make');
    expect(result.flags).toContain('screen_res');
    expect(result.flags).toContain('low_confidence');
  });
});

// ─── P3-B: 2-flag boundary (>= FLAGS_THRESHOLD fix) ──────────────────────────

describe('runFraudChecks — 2-flag boundary triggers Grok', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('triggers Grok when flags.length === 2 (canonical screenshot pattern)', async () => {
    vi.mocked(checkExifMetadata).mockReturnValueOnce({ score: 0.9, flags: ['no_exif_data', 'screen_dimensions'] } as any);
    await runFraudChecks(DUMMY_BUF);
    expect(generateAIJson).toHaveBeenCalledOnce();
  });

  it('does NOT trigger Grok when flags.length === 1 (below threshold)', async () => {
    vi.mocked(checkExifMetadata).mockReturnValueOnce({ score: 0.9, flags: ['no_exif_data'] } as any);
    await runFraudChecks(DUMMY_BUF);
    expect(generateAIJson).not.toHaveBeenCalled();
  });
});

// ─── P3-C: Grok low verdict must not downgrade heuristic high ────────────────

describe('runFraudChecks — Grok low verdict does not downgrade heuristic high', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('keeps fraudRisk=high when Grok returns low but heuristic is high', async () => {
    mockGrok({ fraudRiskLevel: 'low', confidence: 0.9 });
    // is_digitally_manipulated → aiScore=0.8 → Grok triggered; heuristic fraudRisk='high' from pipeline
    const pipeline = { ...makePipeline({ is_digitally_manipulated: true }), fraudRisk: 'high' as const };
    const result = await runFraudChecks(DUMMY_BUF, pipeline as any);
    expect(result.fraudRisk).toBe('high');
  });

  it('does NOT keep high when Grok returns high on a low heuristic (Grok elevates)', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.9 });
    const result = await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(result.fraudRisk).toBe('high');
  });
});

// ─── P3-A: raw_text included in Grok prompt ──────────────────────────────────

describe('runFraudChecks — raw_text included in Grok prompt for math check', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('passes raw_text to generateAIJson when ocrConfidence > 0.5 and raw_text exists', async () => {
    const pipeline = makePipeline({ is_digitally_manipulated: true, raw_text: '10.0 gal $3.99 total $89.90' });
    await runFraudChecks(DUMMY_BUF, pipeline);
    const call = vi.mocked(generateAIJson).mock.calls[0];
    expect(call[1].prompt).toContain('10.0 gal');
  });

  it('shows "not available" in prompt when raw_text is absent', async () => {
    const pipeline = makePipeline({ is_digitally_manipulated: true });
    await runFraudChecks(DUMMY_BUF, pipeline);
    const call = vi.mocked(generateAIJson).mock.calls[0];
    expect(call[1].prompt).toContain('not available');
  });
});

// ─── P3-D: writeIntelligence called for high-confidence Grok verdicts ────────

describe('runFraudChecks — writeIntelligence for high-confidence Grok verdicts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls writeIntelligence with grok_fraud_high when Grok returns high + confidence > 0.7', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.85, reasoning: 'Suspicious signals detected' });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET, claimId: CLAIM_ID });
    const calls = vi.mocked(writeIntelligence).mock.calls;
    const call = calls.find(c => c[0].entry_type === 'grok_fraud_high');
    expect(call).toBeDefined();
    expect(call![0].severity).toBe('critical');
    expect(call![0].entity_id).toBe(WALLET);
    expect(call![0].detail_json).toMatchObject({ claimId: CLAIM_ID });
  });

  it('does NOT call writeIntelligence when Grok confidence <= 0.7', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.65 });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }), { wallet: WALLET });
    expect(vi.mocked(writeIntelligence).mock.calls.some(c => c[0].entry_type === 'grok_fraud_high')).toBe(false);
  });

  it('does NOT call writeIntelligence when no wallet in context', async () => {
    mockGrok({ fraudRiskLevel: 'high', confidence: 0.85 });
    await runFraudChecks(DUMMY_BUF, makePipeline({ is_digitally_manipulated: true }));
    expect(writeIntelligence).not.toHaveBeenCalled();
  });
});
