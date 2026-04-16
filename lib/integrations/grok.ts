/**
 * xAI Grok Integration (via Vercel AI Gateway)
 *
 * Grok handles fraud reasoning across pre-computed signals (from Gemini vision
 * + X account checks + gate heuristics). Routed through the AI Gateway so we
 * get automatic prompt caching, failover to Gemini on outage, and unified
 * cost attribution via tags.
 *
 * The public API (callGrok, callGrokVision, isGrokAvailable, GrokResponse) is
 * preserved so existing call sites in fraud.ts and ai-points-engine.ts keep
 * working without changes — they're migrated separately.
 */

import { generateAIText, isAiGatewayAvailable, AI_MODELS } from './ai-gateway';

export function isGrokAvailable(): boolean {
  // Grok via Gateway is available whenever the gateway itself is available.
  return isAiGatewayAvailable();
}

export interface GrokResponse {
  ok: boolean;
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
}

/**
 * Send a prompt to Grok and get a response.
 * Routed through AI Gateway with fallback to Gemini if xAI is unavailable.
 */
export async function callGrok(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  },
): Promise<GrokResponse> {
  if (!isAiGatewayAvailable()) {
    return { ok: false, content: '', model: 'none', error: 'AI Gateway not configured' };
  }

  const result = await generateAIText({
    model: AI_MODELS.GROK,
    system: options?.systemPrompt,
    prompt,
    maxTokens: options?.maxTokens ?? 500,
    temperature: options?.temperature ?? 0.1,
    fallbackModels: [AI_MODELS.GEMINI_FAST, 'google/gemini-2.5-flash'],
    tags: ['feature:grok-reasoning'],
  });

  if (!result.ok) {
    return { ok: false, content: '', model: AI_MODELS.GROK, error: result.error };
  }

  return {
    ok: true,
    content: result.text,
    model: AI_MODELS.GROK,
    usage: result.usage
      ? {
          prompt_tokens: result.usage.input,
          completion_tokens: result.usage.output,
          total_tokens: result.usage.total,
        }
      : undefined,
  };
}

