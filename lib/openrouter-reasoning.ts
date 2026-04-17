/**
 * OpenRouter reasoning bridge for AI SDK.
 *
 * Problem: @ai-sdk/openai's chat chunk schema strips delta.reasoning
 * from the SSE stream (zod strips unknown keys). Nemotron sends reasoning
 * in delta.reasoning, separate from delta.content.
 *
 * Solution: custom fetch that rewrites the SSE stream — moves
 * delta.reasoning into delta.content wrapped in <think> tags.
 * Pair with extractReasoningMiddleware({ tagName: 'think' }) to
 * emit proper reasoning-start/delta/end events downstream.
 *
 * Flow:
 *   OpenRouter SSE: { delta: { content: "", reasoning: "thinking..." } }
 *   ↓ withReasoningFetch
 *   Rewritten SSE:  { delta: { content: "<think>thinking...</think>" } }
 *   ↓ @ai-sdk/openai chat model (reads delta.content only)
 *   ↓ extractReasoningMiddleware({ tagName: 'think' })
 *   AI SDK events:  reasoning-start → reasoning-delta → reasoning-end → text-start → text-delta
 */

/**
 * Wraps fetch to rewrite OpenRouter SSE streams, injecting delta.reasoning
 * into delta.content as <think> tags.
 *
 * Non-SSE responses pass through unchanged.
 */
export function withReasoningFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const res = await baseFetch(input, init);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/event-stream') || !res.body) return res;

    let buffer = '';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        // SSE events are separated by double newlines
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // keep incomplete tail

        for (const event of events) {
          const rewritten = event.split('\n').map(line => {
            if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') return line;
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta;
              if (delta && typeof delta.reasoning === 'string' && delta.reasoning) {
                // Inject reasoning into content as <think> block
                delta.content = `<think>${delta.reasoning}</think>${delta.content || ''}`;
                delete delta.reasoning;
                delete delta.reasoning_details;
                return 'data: ' + JSON.stringify(data);
              }
            } catch {
              // not JSON or malformed — pass through
            }
            return line;
          }).join('\n');

          controller.enqueue(encoder.encode(rewritten + '\n\n'));
        }
      },
      flush(controller) {
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(buffer));
        }
      },
    });

    return new Response(res.body.pipeThrough(transform), {
      status: res.status,
      headers: res.headers,
    });
  };
}
