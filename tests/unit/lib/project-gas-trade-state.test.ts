import { describe, expect, it } from 'vitest';
import {
  parseProjectGasTradeQuote,
  unavailableTradeQuote,
  validTradeInputAmount,
} from '../../../lib/project-gas/trade-state';

const NOW = Date.parse('2026-08-17T13:00:00.000Z');

function canonicalQuote(quotedAt = '2026-08-17T12:59:55.000Z', expiresAt = '2026-08-17T13:00:20.000Z') {
  return {
    version: 1,
    quoteId: 'quote-1',
    side: 'buy',
    pay: { asset: 'USDC', amount: '100' },
    receive: { asset: 'GAS', amount: '98' },
    fee: { asset: 'USDC', amount: '2' },
    feeBps: 200,
    minimumReceived: { asset: 'GAS', amount: '97.5' },
    priceImpactBps: 25,
    quotedAt,
    expiresAt,
    source: 'project-gas-quote-provider',
  };
}

describe('Project GAS trade quote truth model', () => {
  it('parses a fresh quote with fee, output, minimum received and impact intact', () => {
    const quote = parseProjectGasTradeQuote(canonicalQuote(), NOW);
    expect(quote).toMatchObject({
      status: 'ready',
      authority: 'quote-provider',
      quoteId: 'quote-1',
      side: 'buy',
      pay: { asset: 'USDC', amount: '100' },
      receive: { asset: 'GAS', amount: '98' },
      fee: { asset: 'USDC', amount: '2' },
      feeBps: 200,
      minimumReceived: { asset: 'GAS', amount: '97.5' },
      priceImpactBps: 25,
    });
  });

  it('marks an expired quote expired rather than ready for action', () => {
    const quote = parseProjectGasTradeQuote(
      canonicalQuote('2026-08-17T12:59:40.000Z', '2026-08-17T12:59:59.000Z'),
      NOW,
    );

    expect(quote.status).toBe('expired');
    expect(quote.authority).toBe('quote-provider');
    expect(quote.message).toMatch(/Request a new quote/i);
  });

  it('marks a live but old quote stale', () => {
    const quote = parseProjectGasTradeQuote(
      canonicalQuote('2026-08-17T12:59:20.000Z', '2026-08-17T13:01:00.000Z'),
      NOW,
      15_000,
    );

    expect(quote.status).toBe('stale');
    expect(quote.message).toMatch(/Refresh before acting/i);
  });

  it('rejects incomplete quote truth instead of inventing output or fee', () => {
    const raw = canonicalQuote();
    delete (raw as Record<string, unknown>).minimumReceived;
    const quote = parseProjectGasTradeQuote(raw, NOW);
    expect(quote.status).toBe('unavailable');
    expect(quote.authority).toBe('unavailable');
  });

  it('rejects same-asset pay and receive relationships', () => {
    const raw = canonicalQuote();
    raw.receive = { asset: 'USDC', amount: '98' };
    raw.minimumReceived = { asset: 'USDC', amount: '97.5' };
    const quote = parseProjectGasTradeQuote(raw, NOW);
    expect(quote.status).toBe('unavailable');
    expect(quote.message).toMatch(/asset relationships/i);
  });

  it('validates positive canonical decimal input amounts only', () => {
    expect(validTradeInputAmount('100')).toBe(true);
    expect(validTradeInputAmount('0.25')).toBe(true);
    expect(validTradeInputAmount('0')).toBe(false);
    expect(validTradeInputAmount('-1')).toBe(false);
    expect(validTradeInputAmount('$100')).toBe(false);
    expect(validTradeInputAmount('1e3')).toBe(false);
  });

  it('has a stable unavailable shape for missing providers', () => {
    expect(unavailableTradeQuote('No source.')).toEqual({
      version: 1,
      status: 'unavailable',
      authority: 'unavailable',
      message: 'No source.',
    });
  });
});
