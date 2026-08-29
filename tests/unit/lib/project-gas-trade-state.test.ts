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
    receive: { asset: 'GAS', amount: '96' },
    fee: { asset: 'USDC', amount: '4' },
    feeAllocation: {
      reserveVault: { asset: 'USDC', amount: '2' },
      growthLiquidity: { asset: 'USDC', amount: '0.75' },
      distributionReferralGrowth: { asset: 'USDC', amount: '0.5' },
      teamOperations: { asset: 'USDC', amount: '0.5' },
      defense: { asset: 'USDC', amount: '0.25' },
    },
    feeBps: 400,
    feePolicyVersion: 'bootstrap-2026-08-26',
    pressureFeeBps: 0,
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
      receive: { asset: 'GAS', amount: '96' },
      fee: { asset: 'USDC', amount: '4' },
      feeBps: 400,
      feePolicyVersion: 'bootstrap-2026-08-26',
      pressureFeeBps: 0,
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

  it('rejects superseded or over-cap fees', () => {
    expect(parseProjectGasTradeQuote({ ...canonicalQuote(), feeBps: 200 }, NOW).status).toBe('unavailable');
    expect(parseProjectGasTradeQuote({
      ...canonicalQuote(),
      side: 'sell',
      pay: { asset: 'GAS', amount: '100' },
      receive: { asset: 'USDC', amount: '93' },
      minimumReceived: { asset: 'USDC', amount: '92.5' },
      fee: { asset: 'GAS', amount: '7.01' },
      feeAllocation: {
        reserveVault: { asset: 'GAS', amount: '4.51' },
        growthLiquidity: { asset: 'GAS', amount: '1.2' },
        distributionReferralGrowth: { asset: 'GAS', amount: '0' },
        teamOperations: { asset: 'GAS', amount: '0.5' },
        defense: { asset: 'GAS', amount: '0.8' },
      },
      feeBps: 701,
      pressureFeeBps: 201,
      pressureSource: 'pressure-controller',
      pressureObservedAt: '2026-08-17T12:59:55.000Z',
      pressureValidUntil: '2026-08-17T13:00:20.000Z',
    }, NOW).status).toBe('unavailable');
  });

  it('requires quote-bound live pressure evidence for sell quotes', () => {
    const sell = {
      ...canonicalQuote(),
      side: 'sell',
      pay: { asset: 'GAS', amount: '100' },
      receive: { asset: 'USDC', amount: '94' },
      minimumReceived: { asset: 'USDC', amount: '93.5' },
      fee: { asset: 'GAS', amount: '6' },
      feeAllocation: {
        reserveVault: { asset: 'GAS', amount: '3.75' },
        growthLiquidity: { asset: 'GAS', amount: '1.1' },
        distributionReferralGrowth: { asset: 'GAS', amount: '0' },
        teamOperations: { asset: 'GAS', amount: '0.5' },
        defense: { asset: 'GAS', amount: '0.65' },
      },
      feeBps: 600,
      pressureFeeBps: 100,
      pressureSource: 'pressure-controller',
      pressureObservedAt: '2026-08-17T12:59:55.000Z',
      pressureValidUntil: '2026-08-17T13:00:20.000Z',
    };
    expect(parseProjectGasTradeQuote(sell, NOW).status).toBe('ready');
    expect(parseProjectGasTradeQuote({ ...sell, pressureSource: undefined }, NOW).status).toBe('unavailable');
    expect(parseProjectGasTradeQuote({ ...sell, pressureValidUntil: '2026-08-17T12:59:59.000Z' }, NOW).status).toBe('unavailable');
  });

  it('rejects a quote from an obsolete policy version or fee in the wrong asset', () => {
    expect(parseProjectGasTradeQuote({ ...canonicalQuote(), feePolicyVersion: 'legacy-2-percent' }, NOW).status)
      .toBe('unavailable');
    expect(parseProjectGasTradeQuote({ ...canonicalQuote(), fee: { asset: 'GAS', amount: '4' } }, NOW).status)
      .toBe('unavailable');
  });

  it('rejects a fee amount that disagrees with the authoritative rate', () => {
    expect(parseProjectGasTradeQuote({ ...canonicalQuote(), fee: { asset: 'USDC', amount: '3.99' } }, NOW).status)
      .toBe('unavailable');
  });

  it('rejects fee allocation that does not conserve the authoritative fee', () => {
    const raw = canonicalQuote();
    raw.feeAllocation.reserveVault.amount = '1.99';
    expect(parseProjectGasTradeQuote(raw, NOW).status).toBe('unavailable');
  });

  it('rejects a conserving allocation that redirects reserve funds to team', () => {
    const raw = canonicalQuote();
    raw.feeAllocation.reserveVault.amount = '1.5';
    raw.feeAllocation.teamOperations.amount = '1';
    expect(parseProjectGasTradeQuote(raw, NOW).status).toBe('unavailable');
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
