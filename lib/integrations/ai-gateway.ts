/**
 * Vercel AI Gateway — unified client for all AI calls across GASCOIN.
 *
 * Replaces five bare-fetch integrations (claude.ts, grok.ts, receipt-pipeline.ts,
 * fraud.ts, ai-points-engine.ts) with a single routed entry point.
 *
 * Benefits:
 *   - Unified API across Anthropic, xAI, Google, OpenAI
 *   - Automatic provider failover (order + models)
 *   - Provider-native prompt caching (caching: 'auto' — Anthropic cache_control,
 *     Gemini explicit cache, Grok conv-id passthrough)
 *   - Per-call tags for cost attribution in Vercel dashboard
 *   - Hard budget caps and per-user rate limits in Vercel console
 *   - Audit logging + telemetry out of the box
 *
 * Authentication — OIDC only (zero manual rotation):
 *   - Production/Vercel: VERCEL_OIDC_TOKEN is auto-injected and auto-refreshed
 *     by the platform. Just enable AI Gateway in project settings.
 *   - Local dev: run `vercel env pull .env.local` to provision an OIDC token
 *     (~12h TTL). Re-pull at the start of each session when it expires.
 *   - The AI SDK resolves auth internally, so this module doesn't touch keys.
 *   - If the SDK can't authenticate, helpers return { ok: false } and callers
 *     fall back to their legacy conservative defaults (never blocks a pipeline).
 */

import { generateText, Output, APICallError, type ModelMessage } from 'ai';
import type { SharedV3ProviderOptions } from '@ai-sdk/provider';
import type { z, ZodTypeAny } from 'zod';
import { writePipelineAnomaly } from '../mem0';

// ── O7: Budget alerts ────────────────────────────────────────────────────
//
// Hard spend caps and per-user rate limits are configured in the Vercel
// dashboard — they are NOT enforced in code. You must set them manually:
//
//   Vercel Dashboard → Project → AI → Gateway → Budget & Limits
//   https://vercel.com/dashboard/project/gascoin-platform/ai/gateway
//
// Recommended settings:
//   - Monthly budget cap:      set a hard USD limit (e.g. $50/month)
//   - Per-user rate limit:     tie to `userId` tag passed in AICallOptions
//   - Alert threshold:         80% of budget triggers an email alert
//   - Provider fallback order: Gemini → Claude → Grok (fastest → smartest)
//
// Without a budget cap configured in the dashboard, a runaway AI call loop
// (e.g. a cron worker bug) can exhaust an uncapped spend. Check the dashboard
// after every production deploy.

// ── Config ────────────────────────────────────────────────────────────────

export const AI_MODELS = {
  // Claude oversight — 1h cache TTL support, best reasoning for final review
  CLAUDE: process.env.GC_AI_MODEL_CLAUDE || 'anthropic/claude-sonnet-4.6',
  // Grok — fraud reasoning, cross-signal inference
  GROK: process.env.GC_AI_MODEL_GROK || 'xai/grok-4.1-fast-reasoning',
  // Gemini — vision + fast structured extraction
  GEMINI_VISION: process.env.GC_AI_MODEL_GEMINI_VISION || 'google/gemini-3-flash',
  GEMINI_FAST: process.env.GC_AI_MODEL_GEMINI_FAST || 'google/gemini-3-flash',
} as const;

export function isAiGatewayAvailable(): boolean {
  // On Vercel deployments, VERCEL is always set and OIDC is auto-injected.
  // Locally, `vercel env pull` writes VERCEL_OIDC_TOKEN.
  // The SDK handles the rest (token refresh, priority resolution) internally.
  return !!(process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

// ── Result types ──────────────────────────────────────────────────────────

export type AIResult<T> =
  | { ok: true; data: T; usage?: { input: number; output: number; total: number }; cached?: boolean }
  | { ok: false; error: string; code?: number };

export type AITextResult =
  | { ok: true; text: string; usage?: { input: number; output: number; total: number } }
  | { ok: false; error: string; code?: number };

// ── Shared options ────────────────────────────────────────────────────────

export interface AICallOptions {
  /** Model slug in `provider/model` form. Defaults to GEMINI_FAST. */
  model?: string;
  /** Stable system prompt. Bulk to ≥1024 tokens to unlock Anthropic native caching. */
  system?: string;
  /** Variable user content (small, changes per call). */
  prompt?: string;
  /** Structured messages (takes precedence over `prompt`). */
  messages?: ModelMessage[];
  /** Max completion tokens. Keep tight — most GASCOIN calls need ≤500. */
  maxTokens?: number;
  /** Sampling temperature. Default 0 for deterministic extraction/classification. */
  temperature?: number;
  /** Fallback models if primary fails. Gateway tries these in order. */
  fallbackModels?: string[];
  /** Cost-attribution tags (e.g. ['feature:receipt-ocr', 'env:prod']). */
  tags?: string[];
  /** End-user ID for Gateway per-user rate limiting & audit. */
  userId?: string;
  /**
   * Cache the Gateway response layer at the edge. Use for deterministic calls
   * with stable inputs (e.g. audit narrations). Receipt/claim calls should rely
   * on Upstash exact-match caching upstream instead, since the input varies.
   */
  gatewayCacheSeconds?: number;
  /**
   * Mark the system prompt as a cache breakpoint for Anthropic (90% off cached
   * input tokens). Requires system ≥1024 tokens. Safe no-op on other providers.
   */
  enableAnthropicCache?: boolean;
  /** Controller for timeouts / abort. */
  signal?: AbortSignal;
}

// ── Internal: build providerOptions from our options ──────────────────────

function buildProviderOptions(opts: AICallOptions): SharedV3ProviderOptions | undefined {
  const gateway: Record<string, unknown> = {};
  if (opts.fallbackModels && opts.fallbackModels.length > 0) {
    gateway.models = opts.fallbackModels;
  }
  if (opts.tags && opts.tags.length > 0) {
    gateway.tags = opts.tags;
  }
  if (opts.userId) {
    gateway.user = opts.userId;
  }
  if (opts.gatewayCacheSeconds && opts.gatewayCacheSeconds > 0) {
    gateway.cacheControl = `max-age=${opts.gatewayCacheSeconds}`;
  }
  return Object.keys(gateway).length > 0
    ? ({ gateway } as unknown as SharedV3ProviderOptions)
    : undefined;
}

function buildMessages(opts: AICallOptions): ModelMessage[] {
  if (opts.messages && opts.messages.length > 0) {
    if (opts.enableAnthropicCache && opts.messages[0]?.role === 'system') {
      // Clone to avoid mutating caller input, attach cache breakpoint
      const [first, ...rest] = opts.messages;
      return [
        {
          ...first,
          providerOptions: {
            ...(first.providerOptions || {}),
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        ...rest,
      ];
    }
    return opts.messages;
  }

  const msgs: ModelMessage[] = [];
  if (opts.system) {
    msgs.push({
      role: 'system',
      content: opts.system,
      ...(opts.enableAnthropicCache
        ? { providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } }
        : {}),
    });
  }
  if (opts.prompt) {
    msgs.push({ role: 'user', content: opts.prompt });
  }
  return msgs;
}

function formatError(err: unknown): { error: string; code?: number } {
  if (APICallError.isInstance(err)) {
    return { error: `AI Gateway ${err.statusCode}: ${err.message.slice(0, 200)}`, code: err.statusCode };
  }
  if (err instanceof Error) return { error: err.message.slice(0, 300) };
  return { error: 'Unknown AI Gateway error' };
}

// ── Public API: plain text ────────────────────────────────────────────────

export async function generateAIText(opts: AICallOptions): Promise<AITextResult> {
  if (!isAiGatewayAvailable()) {
    return { ok: false, error: 'AI Gateway not configured' };
  }

  const model = opts.model || AI_MODELS.GEMINI_FAST;

  try {
    const result = await generateText({
      model,
      messages: buildMessages(opts),
      maxOutputTokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0,
      providerOptions: buildProviderOptions(opts),
      abortSignal: opts.signal,
    });

    return {
      ok: true,
      text: result.text,
      usage: result.usage
        ? {
            input: (result.usage as any).inputTokens ?? 0,
            output: (result.usage as any).outputTokens ?? 0,
            total: (result.usage as any).totalTokens ?? 0,
          }
        : undefined,
    };
  } catch (err) {
    return { ok: false, ...formatError(err) };
  }
}

// ── Public API: structured JSON output ────────────────────────────────────

export async function generateAIJson<T extends ZodTypeAny>(
  schema: T,
  opts: AICallOptions,
): Promise<AIResult<z.infer<T>>> {
  if (!isAiGatewayAvailable()) {
    return { ok: false, error: 'AI Gateway not configured' };
  }

  const model = opts.model || AI_MODELS.GEMINI_FAST;

  try {
    const result = await generateText({
      model,
      messages: buildMessages(opts),
      maxOutputTokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0,
      output: Output.object({ schema }),
      providerOptions: buildProviderOptions(opts),
      abortSignal: opts.signal,
    });

    const data = result.output as z.infer<T>;
    return {
      ok: true,
      data,
      usage: result.usage
        ? {
            input: (result.usage as any).inputTokens ?? 0,
            output: (result.usage as any).outputTokens ?? 0,
            total: (result.usage as any).totalTokens ?? 0,
          }
        : undefined,
    };
  } catch (err) {
    return { ok: false, ...formatError(err) };
  }
}

// ── Public API: vision structured JSON output ────────────────────────────
// For receipt OCR — sends system + text + image as one user message.

export interface AIVisionCallOptions extends Omit<AICallOptions, 'messages'> {
  /** Raw image buffer (jpeg/png). */
  image: Buffer | Uint8Array | ArrayBuffer;
  /** MIME type. Defaults to image/jpeg. */
  mimeType?: string;
}

export async function generateAIJsonVision<T extends ZodTypeAny>(
  schema: T,
  opts: AIVisionCallOptions,
): Promise<AIResult<z.infer<T>>> {
  if (!isAiGatewayAvailable()) {
    return { ok: false, error: 'AI Gateway not configured' };
  }

  const model = opts.model || AI_MODELS.GEMINI_VISION;
  const imageBuf =
    opts.image instanceof Buffer
      ? opts.image
      : Buffer.from(opts.image as ArrayBuffer);

  const messages: ModelMessage[] = [];
  if (opts.system) {
    messages.push({
      role: 'system',
      content: opts.system,
      ...(opts.enableAnthropicCache
        ? { providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } }
        : {}),
    });
  }
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: opts.prompt || 'Analyze this image.' },
      { type: 'image', image: imageBuf, mediaType: opts.mimeType || 'image/jpeg' },
    ],
  });

  try {
    const result = await generateText({
      model,
      messages,
      maxOutputTokens: opts.maxTokens ?? 1000,
      temperature: opts.temperature ?? 0,
      output: Output.object({ schema }),
      providerOptions: buildProviderOptions(opts),
      abortSignal: opts.signal,
    });

    return {
      ok: true,
      data: result.output as z.infer<T>,
      usage: result.usage
        ? {
            input: (result.usage as any).inputTokens ?? 0,
            output: (result.usage as any).outputTokens ?? 0,
            total: (result.usage as any).totalTokens ?? 0,
          }
        : undefined,
    };
  } catch (err) {
    return { ok: false, ...formatError(err) };
  }
}

// ── Fallback anomaly helper ────────────────────────────────────────────────
// Callers invoke this when they detect a fallback model was used
// (e.g. primary provider returned an error and the gateway retried).

export async function writeFallbackAnomaly(
  wallet: string,
  info: { requestedModel: string; fallbackModel: string; reason?: string },
): Promise<void> {
  const detail = `requested=${info.requestedModel} | fallback=${info.fallbackModel}${info.reason ? ' | reason=' + info.reason : ''}`;
  await writePipelineAnomaly(wallet, {
    type: 'ai_gateway_fallback',
    detail,
  });
}
