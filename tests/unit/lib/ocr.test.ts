import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/integrations/receipt-pipeline', () => ({
  processReceipt: vi.fn(),
  fallbackExtraction: vi.fn(() => ({
    station_country: null, receipt_date: null,
    total_amount: null, currency: 'USD', wallet_address: null,
    has_handwriting: false, has_gascoin_hashtag: false,
    is_physical_receipt: false, is_gas_station: false,
    is_digitally_manipulated: false, confidence: 0,
    fraud_notes: 'API unavailable — manual review required',
    raw_text: '',
    ocr_fallback: true,
  })),
}));

import { analyzeReceipt } from '@/lib/integrations/ocr';
import { processReceipt } from '@/lib/integrations/receipt-pipeline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(content: string | Uint8Array = 'fake image data', name = 'receipt.jpg', type = 'image/jpeg'): File {
  return new File([content as BlobPart], name, { type });
}

function makePipelineResult(overrides: Record<string, unknown> = {}) {
  return {
    exif: { hasExif: true, cameraModel: 'iPhone', dateTime: null, hasGps: false, software: null, score: 0.8, flags: [] },
    dimensions: { width: 3024, height: 4032, format: 'jpeg', fileSize: 2_000_000, score: 0.85, flags: [] },
    perceptualHash: 'abcdef0123456789',
    exactHash: 'sha256deadbeef',
    authenticityScore: 0.75,
    fraudRisk: 'low' as const,
    flags: [],
    extraction: {
      station_country: 'US',
      receipt_date: '2026-04-16',
      total_amount: 52.40,
      currency: 'USD',
      wallet_address: 'GAsWallet1234567890abcdefghijklmnopqrstuvwx',
      has_handwriting: true,
      has_gascoin_hashtag: false,
      is_physical_receipt: true,
      is_gas_station: true,
      is_digitally_manipulated: false,
      confidence: 0.88,
      fraud_notes: '',
      raw_text: 'SHELL #4521\nTotal $52.40\nGAS UNLEADED',
      ...overrides,
    },
  };
}

// ─── analyzeReceipt ───────────────────────────────────────────────────────────

describe('analyzeReceipt — field mapping', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('converts File to buffer and calls processReceipt', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult() as any);
    const file = makeFile();
    await analyzeReceipt(file);
    expect(processReceipt).toHaveBeenCalledOnce();
    // First arg is a Buffer, second is the mime type
    const [buf, mimeType] = vi.mocked(processReceipt).mock.calls[0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(mimeType).toBe('image/jpeg');
  });

  it('uses image/jpeg as fallback mime when file.type is empty', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult() as any);
    const file = new File(['data'], 'receipt.bin', { type: '' });
    await analyzeReceipt(file);
    expect(vi.mocked(processReceipt).mock.calls[0][1]).toBe('image/jpeg');
  });

  it('propagates confidence from extraction', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ confidence: 0.72 }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.confidence).toBe(0.72);
  });

  it('maps raw_text to result.text', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ raw_text: 'SHELL Total $45.00' }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.text).toBe('SHELL Total $45.00');
  });

  it('maps has_gascoin_hashtag to receiptHasGascoin', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ has_gascoin_hashtag: true }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.receiptHasGascoin).toBe(true);
  });

  it('maps wallet_address to walletOnReceipt', async () => {
    const addr = 'GAsWalletTestABC123';
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ wallet_address: addr }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.walletOnReceipt).toBe(addr);
  });

  it('maps station_country to country', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ station_country: 'CA' }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.country).toBe('CA');
  });

  it('maps total_amount to amountUsd', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ total_amount: 67.89 }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.amountUsd).toBe(67.89);
  });

  it('includes full pipeline result in result.pipeline', async () => {
    const pipeline = makePipelineResult();
    vi.mocked(processReceipt).mockResolvedValueOnce(pipeline as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.pipeline).toBe(pipeline);
  });
});

describe('analyzeReceipt — null/undefined field handling', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets walletOnReceipt to undefined when wallet_address is null', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ wallet_address: null }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.walletOnReceipt).toBeUndefined();
  });

  it('sets amountUsd to undefined when total_amount is null', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ total_amount: null }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.amountUsd).toBeUndefined();
  });

  it('sets amountUsd to undefined when total_amount is 0', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ total_amount: 0 }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.amountUsd).toBeUndefined();
  });

  it('sets country to undefined when station_country is null', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ station_country: null }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.country).toBeUndefined();
  });

  it('returns confidence=0 when fallback fires (OCR unavailable)', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult({ confidence: 0, ocr_fallback: true }) as any);
    const result = await analyzeReceipt(makeFile());
    expect(result.confidence).toBe(0);
  });
});

describe('analyzeReceipt — JPEG and PNG file handling', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('passes image/png mime type through correctly', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult() as any);
    const file = makeFile('png data', 'receipt.png', 'image/png');
    await analyzeReceipt(file);
    expect(vi.mocked(processReceipt).mock.calls[0][1]).toBe('image/png');
  });

  it('handles large file buffer without crashing', async () => {
    vi.mocked(processReceipt).mockResolvedValueOnce(makePipelineResult() as any);
    const largeData = new Uint8Array(5 * 1024 * 1024); // 5MB
    const file = makeFile(largeData, 'large.jpg', 'image/jpeg');
    const result = await analyzeReceipt(file);
    expect(result).toBeDefined();
    const [buf] = vi.mocked(processReceipt).mock.calls[0];
    expect(buf.length).toBe(5 * 1024 * 1024);
  });
});
