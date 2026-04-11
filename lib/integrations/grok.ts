/**
 * xAI Grok Integration
 *
 * Direct connection to xAI's API for Grok models.
 * Used for fraud analysis, receipt verification, and cross-signal reasoning.
 * The xAI API is OpenAI-compatible (same request/response format).
 */

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

function getConfig() {
  const apiKey = process.env.XAI_API_KEY || '';
  const model = process.env.XAI_MODEL || 'grok-4-1-fast-reasoning';
  return { apiKey, model };
}

export function isGrokAvailable(): boolean {
  return !!process.env.XAI_API_KEY;
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
 * Uses the OpenAI-compatible xAI API.
 */
export async function callGrok(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}): Promise<GrokResponse> {
  const { apiKey, model } = getConfig();
  if (!apiKey) {
    return { ok: false, content: '', model: 'none', error: 'XAI_API_KEY not configured' };
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const res = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 500,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, content: '', model, error: `Grok API ${res.status}: ${errText.slice(0, 200)}` };
    }

    const json = await res.json() as any;
    const content = json?.choices?.[0]?.message?.content || '';

    return {
      ok: true,
      content,
      model: json?.model || model,
      usage: json?.usage,
    };
  } catch (err) {
    return { ok: false, content: '', model, error: `Grok API error: ${(err as Error).message}` };
  }
}

/**
 * Send a vision prompt to Grok with an image.
 * Used for receipt analysis and fraud detection.
 */
export async function callGrokVision(prompt: string, imageBase64: string, mimeType: string = 'image/jpeg'): Promise<GrokResponse> {
  const { apiKey, model } = getConfig();
  if (!apiKey) {
    return { ok: false, content: '', model: 'none', error: 'XAI_API_KEY not configured' };
  }

  try {
    const res = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 500,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, content: '', model, error: `Grok Vision ${res.status}: ${errText.slice(0, 200)}` };
    }

    const json = await res.json() as any;
    return {
      ok: true,
      content: json?.choices?.[0]?.message?.content || '',
      model: json?.model || model,
      usage: json?.usage,
    };
  } catch (err) {
    return { ok: false, content: '', model, error: `Grok Vision error: ${(err as Error).message}` };
  }
}
