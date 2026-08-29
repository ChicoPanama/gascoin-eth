import { describe, expect, it } from 'vitest';
import {
  canonicalActivityHref,
  parseLiveEvent,
  parseProjectGasActivitySnapshot,
  unavailableActivitySnapshot,
} from '../../../lib/project-gas/activity-state';

const NOW = Date.parse('2026-08-17T12:45:00.000Z');

function validGameEvent() {
  return {
    id: 'evt-game-1',
    kind: 'game-result',
    occurredAt: '2026-08-17T12:44:45.000Z',
    authority: 'protocol-indexer',
    confirmation: 'settled',
    identity: { profileId: 'profile-1', handle: 'driver01' },
    roundId: 'round-1',
    game: 'gas-original',
    mode: 'BOOST',
    wager: { asset: 'GAS', amount: '25' },
    payout: { asset: 'GAS', amount: '46.25' },
    multiplier: '1.85',
    outcome: 'win',
    verificationHref: '/round/round-1',
  };
}

describe('Project GAS canonical activity projection', () => {
  it('parses an economically verifiable game event with canonical provenance', () => {
    const event = parseLiveEvent(validGameEvent());
    expect(event).toMatchObject({
      id: 'evt-game-1',
      kind: 'game-result',
      authority: 'protocol-indexer',
      confirmation: 'settled',
      roundId: 'round-1',
    });
    expect(event && canonicalActivityHref(event)).toBe('/activity/evt-game-1');
  });

  it('rejects a user-content authority pretending to be an economic game result', () => {
    const event = validGameEvent();
    event.authority = 'user-content';
    expect(parseLiveEvent(event)).toBeUndefined();
  });

  it('rejects malformed decimal values instead of coercing them', () => {
    const event = validGameEvent();
    event.wager.amount = '$25';
    expect(parseLiveEvent(event)).toBeUndefined();
  });

  it('returns ready only with source, index freshness and valid events', () => {
    const snapshot = parseProjectGasActivitySnapshot({
      source: 'project-gas-indexer',
      lastIndexedAt: '2026-08-17T12:44:40.000Z',
      events: [validGameEvent()],
    }, NOW, 60_000);

    expect(snapshot.status).toBe('ready');
    expect(snapshot.authority).toBe('protocol-indexer');
    expect(snapshot.health).toBe('live');
    expect(snapshot.events).toHaveLength(1);
  });

  it('labels an otherwise valid index stale when freshness expires', () => {
    const snapshot = parseProjectGasActivitySnapshot({
      source: 'project-gas-indexer',
      lastIndexedAt: '2026-08-17T12:40:00.000Z',
      events: [validGameEvent()],
    }, NOW, 60_000);

    expect(snapshot.status).toBe('stale');
    expect(snapshot.health).toBe('degraded');
    expect(snapshot.message).toMatch(/freshness window/i);
  });

  it('degrades the feed when invalid events are mixed into otherwise canonical data', () => {
    const snapshot = parseProjectGasActivitySnapshot({
      source: 'project-gas-indexer',
      lastIndexedAt: '2026-08-17T12:44:40.000Z',
      events: [validGameEvent(), { id: 'bad-event' }],
    }, NOW, 60_000);

    expect(snapshot.status).toBe('degraded');
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.message).toMatch(/1 activity event/i);
  });

  it('stays explicitly unavailable without canonical source metadata', () => {
    const snapshot = parseProjectGasActivitySnapshot({ events: [] }, NOW);
    expect(snapshot.status).toBe('unavailable');
    expect(snapshot.events).toEqual([]);
  });

  it('produces a stable empty unavailable snapshot', () => {
    const snapshot = unavailableActivitySnapshot('No source configured.');
    expect(snapshot).toMatchObject({
      version: 1,
      status: 'unavailable',
      authority: 'unavailable',
      health: 'offline',
      events: [],
      message: 'No source configured.',
    });
  });
});
