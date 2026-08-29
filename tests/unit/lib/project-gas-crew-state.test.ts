import { describe, expect, it } from 'vitest';
import {
  parseProjectGasCrewSnapshot,
  unavailableCrewSnapshot,
} from '../../../lib/project-gas/crew-state';

const NOW = Date.parse('2026-08-17T13:15:00.000Z');

function canonicalRows() {
  return [
    {
      crewId: 'crew-a',
      slug: 'crew-a',
      name: 'Crew A',
      rank: 1,
      score: '98.5',
      members: 42,
      ignitions: '1200',
      biggestHitGas: '850',
      sourceAsOf: '2026-08-17T13:14:40.000Z',
    },
    {
      crewId: 'crew-b',
      slug: 'crew-b',
      name: 'Crew B',
      rank: 2,
      score: '91.2',
      members: 31,
      ignitions: '900',
      biggestHitGas: '610',
      sourceAsOf: '2026-08-17T13:14:35.000Z',
    },
  ];
}

describe('Project GAS Crew ranking model', () => {
  it('requires source, freshness and ranking formula before becoming live', () => {
    const snapshot = parseProjectGasCrewSnapshot({ rows: canonicalRows() }, NOW);
    expect(snapshot.status).toBe('unavailable');
    expect(snapshot.rows).toEqual([]);
  });

  it('sorts valid canonical Crew rows by rank', () => {
    const rows = canonicalRows().reverse();
    const snapshot = parseProjectGasCrewSnapshot({
      source: 'project-gas-indexer',
      lastIndexedAt: '2026-08-17T13:14:45.000Z',
      rankingFormula: 'verified_volume + verified_activity - sybil_penalty',
      rows,
    }, NOW);

    expect(snapshot.status).toBe('ready');
    expect(snapshot.authority).toBe('protocol-indexer');
    expect(snapshot.rows.map((row) => row.rank)).toEqual([1, 2]);
  });

  it('marks canonical Crew data stale when index freshness expires', () => {
    const snapshot = parseProjectGasCrewSnapshot({
      source: 'project-gas-indexer',
      lastIndexedAt: '2026-08-17T13:00:00.000Z',
      rankingFormula: 'verified activity',
      rows: canonicalRows(),
    }, NOW, 60_000);

    expect(snapshot.status).toBe('stale');
    expect(snapshot.message).toMatch(/freshness window/i);
  });

  it('degrades when an invalid row is mixed into canonical rankings', () => {
    const snapshot = parseProjectGasCrewSnapshot({
      source: 'project-gas-indexer',
      lastIndexedAt: '2026-08-17T13:14:45.000Z',
      rankingFormula: 'verified activity',
      rows: [...canonicalRows(), { crewId: 'bad' }],
    }, NOW);

    expect(snapshot.status).toBe('degraded');
    expect(snapshot.rows).toHaveLength(2);
  });

  it('rejects duplicate canonical ranks instead of displaying contradictory order', () => {
    const rows = canonicalRows();
    rows[1].rank = 1;
    const snapshot = parseProjectGasCrewSnapshot({
      source: 'project-gas-indexer',
      lastIndexedAt: '2026-08-17T13:14:45.000Z',
      rankingFormula: 'verified activity',
      rows,
    }, NOW);

    expect(snapshot.status).toBe('degraded');
    expect(snapshot.rows).toEqual([]);
    expect(snapshot.message).toMatch(/duplicate canonical ranks/i);
  });

  it('has a stable unavailable empty state', () => {
    expect(unavailableCrewSnapshot('No source.')).toEqual({
      version: 1,
      status: 'unavailable',
      authority: 'unavailable',
      rows: [],
      message: 'No source.',
    });
  });
});
