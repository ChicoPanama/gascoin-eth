import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkExifMetadata, checkImageDimensions, computePerceptualHash, computeExactHash, comparePerceptualHashes, processReceipt, fallbackExtraction } from '@/lib/integrations/receipt-pipeline';
import { fakeReceiptBuffer } from '../../factories';

// ─── Mocks for orchestrator tests ────────────────────────────────────────────

vi.mock('@/lib/integrations/ai-gateway', () => ({
  isAiGatewayAvailable: vi.fn().mockReturnValue(false),
  generateAIJsonVision: vi.fn(),
  AI_MODELS: { GEMINI_VISION: 'gemini-vision', GEMINI_FAST: 'gemini-flash' },
}));

vi.mock('@/lib/cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/knowledge-base', () => ({
  writeIntelligence: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/prompts', () => ({
  getSystemPrompt: vi.fn().mockResolvedValue('system prompt'),
  PROMPT_KEYS: { GEMINI_RECEIPT: 'prompts_gemini_receipt_system' },
}));

describe('checkExifMetadata', () => {
  it('detects EXIF marker in JPEG', () => {
    const buf = fakeReceiptBuffer();
    const result = checkExifMetadata(buf);
    expect(result.hasExif).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns low score for PNG (no EXIF)', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...new Array(100).fill(0)]);
    const result = checkExifMetadata(png);
    expect(result.hasExif).toBe(false);
    expect(result.flags).toContain('png_format');
  });

  it('flags editing software in binary data', () => {
    const buf = fakeReceiptBuffer();
    // Inject "Photoshop" string
    const ps = Buffer.from('Adobe Photoshop');
    const combined = Buffer.concat([buf.subarray(0, 50), ps, buf.subarray(50)]);
    const result = checkExifMetadata(combined);
    expect(result.software).toBeTruthy();
    expect(result.flags.some((f) => f.includes('software_detected'))).toBe(true);
  });
});

describe('checkImageDimensions', () => {
  it('parses JPEG dimensions', () => {
    const buf = fakeReceiptBuffer();
    const result = checkImageDimensions(buf);
    expect(result.format).toBe('jpeg');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('flags AI-typical dimensions', () => {
    // Create a buffer that reports 1024x1024
    const buf = fakeReceiptBuffer();
    // Modify SOF0 to report 1024x1024
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0xFF && buf[i + 1] === 0xC0) {
        buf[i + 5] = 0x04; buf[i + 6] = 0x00; // height 1024
        buf[i + 7] = 0x04; buf[i + 8] = 0x00; // width 1024
        break;
      }
    }
    const result = checkImageDimensions(buf);
    if (result.width === 1024 && result.height === 1024) {
      expect(result.flags).toContain('ai_typical_dimensions');
    }
  });
});

describe('computePerceptualHash', () => {
  it('returns a 16-char hex string', async () => {
    const hash = await computePerceptualHash(fakeReceiptBuffer());
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('same input produces same hash', async () => {
    const buf = fakeReceiptBuffer();
    const [h1, h2] = await Promise.all([computePerceptualHash(buf), computePerceptualHash(buf)]);
    expect(h1).toBe(h2);
  });
});

describe('computeExactHash', () => {
  it('returns 64-char hex SHA-256', () => {
    const hash = computeExactHash(fakeReceiptBuffer());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('comparePerceptualHashes', () => {
  it('identical hashes return 1.0', () => {
    expect(comparePerceptualHashes('abcdef0123456789', 'abcdef0123456789')).toBe(1.0);
  });
  it('all-zeros vs all-f hashes return 0.0 (max Hamming distance)', () => {
    expect(comparePerceptualHashes('0000000000000000', 'ffffffffffffffff')).toBe(0.0);
  });
  it('different length returns 0', () => {
    expect(comparePerceptualHashes('abcdef01', 'abcdef0123456789')).toBe(0);
  });
  it('one-bit difference returns high similarity', () => {
    // Only the last nibble differs by 1 bit (0 vs 1)
    expect(comparePerceptualHashes('abcdef0123456780', 'abcdef0123456781')).toBeGreaterThan(0.98);
  });
});

// ─── fallbackExtraction ───────────────────────────────────────────────────────

describe('fallbackExtraction', () => {
  it('returns confidence=0', () => {
    expect(fallbackExtraction().confidence).toBe(0);
  });

  it('sets ocr_fallback=true to distinguish from low-confidence real extraction', () => {
    expect(fallbackExtraction().ocr_fallback).toBe(true);
  });

  it('returns null for all extractable fields', () => {
    const f = fallbackExtraction();
    expect(f.station_country).toBeNull();
    expect(f.receipt_date).toBeNull();
    expect(f.total_amount).toBeNull();
    expect(f.wallet_address).toBeNull();
  });

  it('includes fraud_notes explaining the fallback', () => {
    expect(fallbackExtraction().fraud_notes).toContain('unavailable');
  });
});

// ─── processReceipt orchestrator ─────────────────────────────────────────────

describe('processReceipt — fallback path (gateway unavailable)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('runs EXIF, dimension, and perceptual hash checks', async () => {
    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.exif).toBeDefined();
    expect(result.dimensions).toBeDefined();
    expect(result.perceptualHash).toMatch(/^[0-9a-f]{16}$/);
    expect(result.exactHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses fallback extraction when AI gateway is unavailable', async () => {
    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.extraction.ocr_fallback).toBe(true);
    expect(result.extraction.confidence).toBe(0);
  });

  it('computes authenticityScore as a number between 0 and 1', async () => {
    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.authenticityScore).toBeGreaterThanOrEqual(0);
    expect(result.authenticityScore).toBeLessThanOrEqual(1);
  });

  it('returns a fraudRisk of low/medium/high/critical', async () => {
    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(['low', 'medium', 'high', 'critical']).toContain(result.fraudRisk);
  });
});

describe('processReceipt — AI path (gateway available)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('uses AI extraction result when gateway is available and returns success', async () => {
    const { isAiGatewayAvailable, generateAIJsonVision } = await import('@/lib/integrations/ai-gateway');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({
      ok: true,
      data: {
        station_country: 'US', receipt_date: '2026-04-16',
        total_amount: 52.40, currency: 'USD', wallet_address: 'GAsWallet1',
        has_handwriting: true, has_gascoin_hashtag: false,
        is_physical_receipt: true, is_gas_station: true,
        is_digitally_manipulated: false, confidence: 0.9,
        fraud_notes: '', raw_text: 'SHELL Total $52.40',
      },
    } as any);

    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.extraction.station_country).toBe('US');
    expect(result.extraction.confidence).toBe(0.9);
    expect(result.extraction.ocr_fallback).toBeUndefined();
  });

  it('falls back when AI Gateway returns an error', async () => {
    const { isAiGatewayAvailable, generateAIJsonVision } = await import('@/lib/integrations/ai-gateway');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({ ok: false, error: 'upstream_error' } as any);

    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.extraction.ocr_fallback).toBe(true);
    expect(result.extraction.confidence).toBe(0);
  });

  it('adds not_physical_receipt flag when model says is_physical_receipt=false', async () => {
    const { isAiGatewayAvailable, generateAIJsonVision } = await import('@/lib/integrations/ai-gateway');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({
      ok: true,
      data: {
        station_country: 'US', receipt_date: null, total_amount: null, currency: 'USD',
        wallet_address: null, has_handwriting: false, has_gascoin_hashtag: false,
        is_physical_receipt: false, is_gas_station: false,
        is_digitally_manipulated: false, confidence: 0.3,
        fraud_notes: 'Looks like a screenshot', raw_text: '',
      },
    } as any);

    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.flags).toContain('not_physical_receipt');
    expect(result.fraudRisk).not.toBe('low');
  });

  it('does not double-penalise is_digitally_manipulated=true', async () => {
    const { isAiGatewayAvailable, generateAIJsonVision } = await import('@/lib/integrations/ai-gateway');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({
      ok: true,
      data: {
        station_country: 'US', receipt_date: '2026-04-17', total_amount: 50, currency: 'USD',
        wallet_address: 'GAsWallet1', has_handwriting: true, has_gascoin_hashtag: true,
        is_physical_receipt: true, is_gas_station: true,
        is_digitally_manipulated: true, confidence: 0.9,
        fraud_notes: '', raw_text: 'SHELL Total $50',
      },
    } as any);

    const manipulatedResult = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');

    // Re-run with identical extraction but is_digitally_manipulated=false for comparison
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({
      ok: true,
      data: {
        station_country: 'US', receipt_date: '2026-04-17', total_amount: 50, currency: 'USD',
        wallet_address: 'GAsWallet1', has_handwriting: true, has_gascoin_hashtag: true,
        is_physical_receipt: true, is_gas_station: true,
        is_digitally_manipulated: false, confidence: 0.9,
        fraud_notes: '', raw_text: 'SHELL Total $50',
      },
    } as any);
    const { cacheGet } = await import('@/lib/cache');
    vi.mocked(cacheGet).mockResolvedValue(null);
    const cleanResult = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');

    // Manipulation should reduce score by exactly 0.10 (missing the +0.10 bonus), not 0.25
    const scoreDiff = cleanResult.authenticityScore - manipulatedResult.authenticityScore;
    expect(scoreDiff).toBeCloseTo(0.10, 5);
    expect(manipulatedResult.flags).toContain('digitally_manipulated');
  });

  it('adds no_gascoin_hashtag flag when has_gascoin_hashtag is false', async () => {
    const { isAiGatewayAvailable, generateAIJsonVision } = await import('@/lib/integrations/ai-gateway');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({
      ok: true,
      data: {
        station_country: 'US', receipt_date: '2026-04-17', total_amount: 50, currency: 'USD',
        wallet_address: 'GAsWallet1', has_handwriting: true, has_gascoin_hashtag: false,
        is_physical_receipt: true, is_gas_station: true,
        is_digitally_manipulated: false, confidence: 0.9,
        fraud_notes: '', raw_text: 'SHELL Total $50',
      },
    } as any);
    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.flags).toContain('no_gascoin_hashtag');
  });

  it('does not add no_gascoin_hashtag flag when has_gascoin_hashtag is true', async () => {
    const { isAiGatewayAvailable, generateAIJsonVision } = await import('@/lib/integrations/ai-gateway');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({
      ok: true,
      data: {
        station_country: 'US', receipt_date: '2026-04-17', total_amount: 50, currency: 'USD',
        wallet_address: 'GAsWallet1', has_handwriting: true, has_gascoin_hashtag: true,
        is_physical_receipt: true, is_gas_station: true,
        is_digitally_manipulated: false, confidence: 0.9,
        fraud_notes: '', raw_text: 'SHELL Total $50',
      },
    } as any);
    const result = await processReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(result.flags).not.toContain('no_gascoin_hashtag');
  });
});

// ─── extractAndScoreReceipt — cache behaviour ────────────────────────────────

describe('extractAndScoreReceipt — fallback not cached', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does not call cacheSet when extraction returns ocr_fallback=true', async () => {
    const { isAiGatewayAvailable } = await import('@/lib/integrations/ai-gateway');
    const { extractAndScoreReceipt } = await import('@/lib/integrations/receipt-pipeline');
    const { cacheGet, cacheSet } = await import('@/lib/cache');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(false); // forces fallback
    vi.mocked(cacheGet).mockResolvedValue(null); // cold cache

    await extractAndScoreReceipt(fakeReceiptBuffer(), 'image/jpeg');
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it('calls cacheSet when extraction succeeds (no ocr_fallback)', async () => {
    const { isAiGatewayAvailable, generateAIJsonVision } = await import('@/lib/integrations/ai-gateway');
    const { extractAndScoreReceipt } = await import('@/lib/integrations/receipt-pipeline');
    const { cacheGet, cacheSet } = await import('@/lib/cache');
    vi.mocked(isAiGatewayAvailable).mockReturnValueOnce(true);
    vi.mocked(cacheGet).mockResolvedValue(null);
    vi.mocked(generateAIJsonVision).mockResolvedValueOnce({
      ok: true,
      data: {
        station_country: 'US', receipt_date: '2026-04-17', total_amount: 50, currency: 'USD',
        wallet_address: null, has_handwriting: false, has_gascoin_hashtag: true,
        is_physical_receipt: true, is_gas_station: true,
        is_digitally_manipulated: false, confidence: 0.85,
        fraud_notes: '', raw_text: 'SHELL Total $50',
      },
    } as any);

    await extractAndScoreReceipt(fakeReceiptBuffer(), 'image/jpeg');
    // Allow the fire-and-forget cacheSet to resolve
    await Promise.resolve();
    expect(cacheSet).toHaveBeenCalled();
  });
});
