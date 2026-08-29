import { describe, expect, it } from 'vitest';
import {
  canOfferContextualFinancialAction,
  isEconomicallyVerifiable,
  publicIdentityLabel,
  shouldPauseLiveClaims,
  type GameResultEvent,
  type LiveFeedSnapshot,
} from '@/lib/project-gas/live-events';

describe('Project GAS verified activity contract', () => {
  const settledResult: GameResultEvent = {
    id: 'evt-1',
    kind: 'game-result',
    occurredAt: '2026-08-16T00:00:00.000Z',
    authority: 'onchain',
    confirmation: 'settled',
    txHash: '0x1234',
    roundId: 'round-1',
    identity: { handle: 'chico', displayName: 'Chico', wallet: '0x1234567890abcdef' },
    game: 'gas-original',
    mode: 'BOOST',
    wager: { asset: 'GAS', amount: '100' },
    payout: { asset: 'GAS', amount: '250' },
    multiplier: '2.5',
    outcome: 'win',
    verificationHref: '/round/round-1',
  };

  it('treats confirmed/settled economic events as verifiable feed content', () => {
    expect(isEconomicallyVerifiable(settledResult)).toBe(true);
    expect(isEconomicallyVerifiable({ ...settledResult, confirmation: 'confirmed' })).toBe(true);
    expect(isEconomicallyVerifiable({ ...settledResult, confirmation: 'pending' })).toBe(false);
  });

  it('only offers contextual action for eligible economic object kinds/states', () => {
    expect(canOfferContextualFinancialAction(settledResult)).toBe(true);
    expect(canOfferContextualFinancialAction({ ...settledResult, confirmation: 'failed' })).toBe(false);
  });

  it('pauses live claims when the feed/indexer is degraded or offline', () => {
    const live: LiveFeedSnapshot = { health: 'live', events: [settledResult] };
    const degraded: LiveFeedSnapshot = {
      health: 'degraded',
      events: [settledResult],
      reason: 'Indexer is behind canonical chain state',
    };

    expect(shouldPauseLiveClaims(live)).toBe(false);
    expect(shouldPauseLiveClaims(degraded)).toBe(true);
  });

  it('prefers GAS social identity over wallet fallback', () => {
    expect(publicIdentityLabel({ handle: 'chico', displayName: 'Chico', wallet: '0x1234567890abcdef' })).toBe('@chico');
    expect(publicIdentityLabel({ displayName: 'Chico' })).toBe('Chico');
    expect(publicIdentityLabel({ wallet: '0x1234567890abcdef' })).toBe('0x1234…cdef');
    expect(publicIdentityLabel()).toBe('Anonymous');
  });

  it('keeps exact economic values as strings', () => {
    expect(typeof settledResult.wager.amount).toBe('string');
    expect(typeof settledResult.payout.amount).toBe('string');
    expect(settledResult.multiplier).toBe('2.5');
  });
});
