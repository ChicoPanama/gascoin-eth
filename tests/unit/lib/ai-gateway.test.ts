import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (must precede all imports) ────────────────────────────────────────

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn().mockReturnValue('output-schema-object') },
  APICallError: {
    isInstance: (e: unknown) => (e as any)?.__isAPICallError === true,
  },
}));

vi.mock('@/lib/mem0', () => ({
  writePipelineAnomaly: vi.fn().mockResolvedValue(undefined),
  MEM0_AGENTS: { SUBMIT_PIPELINE: 'submit-pipeline' },
  MEM0_APPS: { SUBMIT: 'gascoin-submit' },
  MEM0_CATEGORIES: { PIPELINE_ANOMALY: 'pipeline_anomaly' },
}));

import {
  isAiGatewayAvailable,
  generateAIText,
  generateAIJson,
  generateAIJsonVision,
  writeFallbackAnomaly,
  AI_MODELS,
} from '@/lib/integrations/ai-gateway';
import { generateText } from 'ai';
import { writePipelineAnomaly } from '@/lib/mem0';
import { z } from 'zod';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSuccessResult(text = 'hello', output: unknown = null) {
  return {
    text,
    output,
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    response: { modelId: 'google/gemini-3-flash' },
  };
}

function makeApiError(status: number): Error {
  const err = new Error(`AI Gateway error ${status}`) as any;
  err.__isAPICallError = true;
  err.statusCode = status;
  return err;
}

// ─── isAiGatewayAvailable ────────────────────────────────────────────────────

describe('isAiGatewayAvailable', () => {
  const origVERCEL = process.env.VERCEL;
  const origOIDC = process.env.VERCEL_OIDC_TOKEN;

  beforeEach(() => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;
  });

  afterEach(() => {
    if (origVERCEL !== undefined) process.env.VERCEL = origVERCEL;
    else delete process.env.VERCEL;
    if (origOIDC !== undefined) process.env.VERCEL_OIDC_TOKEN = origOIDC;
    else delete process.env.VERCEL_OIDC_TOKEN;
  });

  it('returns false when neither VERCEL nor VERCEL_OIDC_TOKEN is set', () => {
    expect(isAiGatewayAvailable()).toBe(false);
  });

  it('returns true when VERCEL is set', () => {
    process.env.VERCEL = '1';
    expect(isAiGatewayAvailable()).toBe(true);
  });

  it('returns true when VERCEL_OIDC_TOKEN is set', () => {
    process.env.VERCEL_OIDC_TOKEN = 'tok123';
    expect(isAiGatewayAvailable()).toBe(true);
  });
});

// ─── generateAIText ───────────────────────────────────────────────────────────

describe('generateAIText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VERCEL = '1';
  });

  it('returns ok=false when gateway is unavailable', async () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;
    const result = await generateAIText({ prompt: 'hello' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('not configured');
  });

  it('returns ok=true with text and usage on success', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('test output') as any);
    const result = await generateAIText({ prompt: 'hello', model: 'google/gemini-3-flash' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe('test output');
      expect(result.usage?.input).toBe(100);
      expect(result.usage?.output).toBe(50);
      expect(result.usage?.total).toBe(150);
    }
  });

  it('returns ok=false with error message on API error', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('network timeout'));
    const result = await generateAIText({ prompt: 'hello' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('network timeout');
  });

  it('includes status code for APICallError', async () => {
    vi.useFakeTimers();
    // All retry attempts fail with 429 so the final result propagates the status code
    vi.mocked(generateText).mockRejectedValue(makeApiError(429));
    const resultPromise = generateAIText({ prompt: 'hello' });
    // Advance through all retry backoff delays (5s, 10s, 20s)
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    vi.useRealTimers();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(429);
  });
});

// ─── generateAIJson ───────────────────────────────────────────────────────────

describe('generateAIJson', () => {
  const TestSchema = z.object({ label: z.string(), score: z.number() });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VERCEL = '1';
  });

  it('returns ok=false when gateway is unavailable', async () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;
    const result = await generateAIJson(TestSchema, { prompt: 'classify' });
    expect(result.ok).toBe(false);
  });

  it('returns ok=true with parsed output on success', async () => {
    const outputData = { label: 'spam', score: 0.9 };
    vi.mocked(generateText).mockResolvedValueOnce(
      makeSuccessResult('', outputData) as any,
    );
    const result = await generateAIJson(TestSchema, { prompt: 'classify', model: 'xai/grok-4.1-fast-reasoning' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.label).toBe('spam');
      expect(result.data.score).toBe(0.9);
    }
  });

  it('returns ok=false on provider error', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(makeApiError(503));
    const result = await generateAIJson(TestSchema, { prompt: 'classify' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(503);
  });

  it('propagates fallback models through providerOptions.gateway', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', { label: 'ok', score: 1 }) as any);
    await generateAIJson(TestSchema, {
      prompt: 'classify',
      model: 'xai/grok-4.1-fast-reasoning',
      fallbackModels: ['google/gemini-3-flash', 'anthropic/claude-haiku-4.5'],
      tags: ['feature:fraud', 'pipeline:submit'],
    });

    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    const gateway = callArgs.providerOptions?.gateway;
    expect(gateway.models).toEqual(['google/gemini-3-flash', 'anthropic/claude-haiku-4.5']);
    expect(gateway.tags).toEqual(['feature:fraud', 'pipeline:submit']);
  });

  it('passes userId as gateway.user', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', { label: 'ok', score: 1 }) as any);
    await generateAIJson(TestSchema, {
      prompt: 'classify',
      userId: 'wallet-abc123',
    });
    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    expect(callArgs.providerOptions?.gateway?.user).toBe('wallet-abc123');
  });

  it('does not set providerOptions when no gateway options are provided', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', { label: 'ok', score: 1 }) as any);
    await generateAIJson(TestSchema, { prompt: 'classify' });
    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    expect(callArgs.providerOptions).toBeUndefined();
  });

  it('passes system prompt as system role message', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', { label: 'ok', score: 1 }) as any);
    await generateAIJson(TestSchema, { system: 'You are a classifier.', prompt: 'classify this' });
    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    const msgs = callArgs.messages;
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toBe('You are a classifier.');
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toBe('classify this');
  });
});

// ─── generateAIJsonVision ─────────────────────────────────────────────────────

describe('generateAIJsonVision', () => {
  const ReceiptSchema = z.object({ amount: z.number(), currency: z.string() });
  const IMAGE_BUF = Buffer.alloc(64);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VERCEL = '1';
  });

  it('returns ok=false when gateway is unavailable', async () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;
    const result = await generateAIJsonVision(ReceiptSchema, { image: IMAGE_BUF });
    expect(result.ok).toBe(false);
  });

  it('returns ok=true with output data on success', async () => {
    const outputData = { amount: 52.4, currency: 'USD' };
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', outputData) as any);
    const result = await generateAIJsonVision(ReceiptSchema, {
      image: IMAGE_BUF,
      mimeType: 'image/jpeg',
      model: 'google/gemini-3-flash',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.amount).toBe(52.4);
      expect(result.data.currency).toBe('USD');
    }
  });

  it('constructs vision message with image content block', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', { amount: 10, currency: 'USD' }) as any);
    await generateAIJsonVision(ReceiptSchema, {
      image: IMAGE_BUF,
      prompt: 'Extract receipt data',
      mimeType: 'image/jpeg',
    });
    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    const userMsg = callArgs.messages.find((m: any) => m.role === 'user');
    expect(userMsg).toBeDefined();
    const imageBlock = userMsg.content.find((c: any) => c.type === 'image');
    expect(imageBlock).toBeDefined();
    expect(imageBlock.mediaType).toBe('image/jpeg');
  });

  it('accepts ArrayBuffer and converts to Buffer', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', { amount: 10, currency: 'USD' }) as any);
    const ab = new ArrayBuffer(32);
    await generateAIJsonVision(ReceiptSchema, { image: ab });
    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    const userMsg = callArgs.messages.find((m: any) => m.role === 'user');
    const imageBlock = userMsg.content.find((c: any) => c.type === 'image');
    expect(Buffer.isBuffer(imageBlock.image)).toBe(true);
  });

  it('defaults mimeType to image/jpeg', async () => {
    vi.mocked(generateText).mockResolvedValueOnce(makeSuccessResult('', { amount: 10, currency: 'USD' }) as any);
    await generateAIJsonVision(ReceiptSchema, { image: IMAGE_BUF });
    const callArgs = vi.mocked(generateText).mock.calls[0][0] as any;
    const userMsg = callArgs.messages.find((m: any) => m.role === 'user');
    const imageBlock = userMsg.content.find((c: any) => c.type === 'image');
    expect(imageBlock.mediaType).toBe('image/jpeg');
  });

  it('returns ok=false on API error', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(makeApiError(500));
    const result = await generateAIJsonVision(ReceiptSchema, { image: IMAGE_BUF });
    expect(result.ok).toBe(false);
  });
});

// ─── writeFallbackAnomaly ─────────────────────────────────────────────────────

describe('writeFallbackAnomaly', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls writePipelineAnomaly with type ai_gateway_fallback', async () => {
    await writeFallbackAnomaly('wallet-abc', {
      requestedModel: 'xai/grok-4.1-fast-reasoning',
      fallbackModel: 'google/gemini-3-flash',
    });
    expect(writePipelineAnomaly).toHaveBeenCalledWith('wallet-abc', expect.objectContaining({
      type: 'ai_gateway_fallback',
    }));
  });

  it('includes requested and fallback model in detail', async () => {
    await writeFallbackAnomaly('wallet-abc', {
      requestedModel: 'xai/grok-4.1-fast-reasoning',
      fallbackModel: 'google/gemini-3-flash',
    });
    const call = vi.mocked(writePipelineAnomaly).mock.calls[0][1];
    expect(call.detail).toContain('requested=xai/grok-4.1-fast-reasoning');
    expect(call.detail).toContain('fallback=google/gemini-3-flash');
  });

  it('includes optional reason in detail when provided', async () => {
    await writeFallbackAnomaly('wallet-abc', {
      requestedModel: 'xai/grok-4.1-fast-reasoning',
      fallbackModel: 'google/gemini-3-flash',
      reason: 'provider_timeout',
    });
    const call = vi.mocked(writePipelineAnomaly).mock.calls[0][1];
    expect(call.detail).toContain('reason=provider_timeout');
  });

  it('does not include reason in detail when absent', async () => {
    await writeFallbackAnomaly('wallet-abc', {
      requestedModel: 'xai/grok-4.1-fast-reasoning',
      fallbackModel: 'google/gemini-3-flash',
    });
    const call = vi.mocked(writePipelineAnomaly).mock.calls[0][1];
    expect(call.detail).not.toContain('reason=');
  });
});

// ─── AI_MODELS constant ───────────────────────────────────────────────────────

describe('AI_MODELS', () => {
  it('exports model slug constants', () => {
    expect(AI_MODELS.CLAUDE).toBeTruthy();
    expect(AI_MODELS.GROK).toBeTruthy();
    expect(AI_MODELS.GEMINI_VISION).toBeTruthy();
    expect(AI_MODELS.GEMINI_FAST).toBeTruthy();
  });

  it('model slugs follow provider/model format', () => {
    for (const slug of Object.values(AI_MODELS)) {
      expect(slug).toMatch(/^[a-z-]+\/.+/);
    }
  });
});
