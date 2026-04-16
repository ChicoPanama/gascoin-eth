import { streamText, type ModelMessage } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { getKBEntries } from '../../../lib/knowledge-base';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  let messages: ModelMessage[];
  try {
    ({ messages } = await (req.json() as Promise<{ messages: ModelMessage[] }>));
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const [policy, gateRules] = await Promise.all([
    getKBEntries('policy'),
    getKBEntries('gate_rule'),
  ]);

  const kbContext = [...policy, ...gateRules]
    .map((e) => `## ${e.title}\n${e.content}`)
    .join('\n\n');

  const systemPrompt = `You are the GASCOIN Refund Assistant. Keep replies short (2-4 sentences). Use plain English. If someone seems lost, give them the next single action to take.

CHECKLIST:
1. Connect your Solana wallet (Phantom, Backpack, Solflare)
2. Post proof on X: receipt photo + tag @GasCoinApp + #GasCoinRefund
3. Submit tweet URL + receipt at gascoin.app/submit
4. Wait for AI verification (< 2 minutes)
5. SOL arrives in your wallet

KEY RULES:
- Receipt must show date, amount, gallons/liters
- X account must be at least 30 days old
- One claim per wallet per 7 days (Road Warrior: 3.5d, Fleet: 1.75d)
- Gas purchase must be within last 72 hours
- Gasoline only — no diesel, EV charging, or car wash

KNOWLEDGE BASE:
${kbContext}

If asked something not covered above, suggest gascoin.app/docs.`;

  const result = streamText({
    model: gateway('anthropic/claude-sonnet-4.6'),
    system: systemPrompt,
    messages,
    maxOutputTokens: 300,
    onError: ({ error }) => {
      console.error('[chat] streamText error', error);
    },
  });

  return result.toUIMessageStreamResponse();
}
