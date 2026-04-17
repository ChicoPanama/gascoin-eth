/**
 * xAI Grok Integration (via Vercel AI Gateway)
 *
 * `callGrok` is a general-purpose text wrapper used by the aggregate-intelligence
 * worker for weekly narrative generation. The fraud cross-validation path
 * (fraud.ts) calls generateAIJson directly for structured JSON output.
 *
 * Routed through the AI Gateway for automatic failover to Gemini on xAI outage
 * and unified cost attribution via tags.
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

