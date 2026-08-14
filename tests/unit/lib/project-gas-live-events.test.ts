import { describe, expect, it } from 'vitest';
import {
  isEconomicallyVerifiable,
  publicIdentityLabel,
  shouldPauseLiveClaims,
  type GameResultEvent,
  type LiveFeedSnapshot,
} from '@/lib/project-gas/live-events';

describe('Project GAS live-event contract', () => {
  const confirmedResult: GameResultEvent = {
    id: 'evt-1',
    kind: 'game-result',
    occurredAt: '2026-08-14T12:00:00.000Z',
    authority: 'onchain',
    confirmation: 'confirmed',
    txHash: '0x1234',
    roundId: 'round-1',
    identity: { displayName: 'Chico', wallet: '0x1234567890abcdef' },
    game: 'gas-original',
    mode: 'BOOST',
    wager: { asset: 'GAS', amount: '100' },
    payout: { asset: 'GAS', amount: '250' },
    multiplier: '2.5',
    outcome: 'win',
    verificationHref: '/verify/round-1',
  };

  it('treats confirmed economic events as verifiable feed content', () => {
    expect(isEconomicallyVerifiable(confirmedResult)).toBe(true);
    expect(isEconomicallyVerifiable({ ...confirmedResult, confirmation: 'pending' })).toBe(false);
  });

  it('pauses live claims when the feed/indexer is degraded or offline', () => {
    const live: LiveFeedSnapshot = { health: 'live', events: [confirmedResult] };
    const degraded: LiveFeedSnapshot = {
      health: 'degraded',
      events: [confirmedResult],
      reason: 'Indexer is behind chain head',
    };

    expect(shouldPauseLiveClaims(live)).toBe(false);
    expect(shouldPauseLiveClaims(degraded)).toBe(true);
  });

  it('prefers social identity and abbreviates a wallet fallback', () => {
    expect(publicIdentityLabel({ displayName: 'Chico', wallet: '0x1234567890abcdef' })).toBe('Chico');
    expect(publicIdentityLabel({ wallet: '0x1234567890abcdef' })).toBe('0x1234…cdef');
    expect(publicIdentityLabel()).toBe('Anonymous');
  });

  it('keeps exact economic values as strings', () => {
    expect(typeof confirmedResult.wager.amount).toBe('string');
    expect(typeof confirmedResult.payout.amount).toBe('string');
    expect(confirmedResult.multiplier).toBe('2.5');
  });
});
