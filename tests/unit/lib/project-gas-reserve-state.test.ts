import { describe, expect, it } from 'vitest';
import {
  parseProjectGasReserveSnapshot,
  PROJECT_GAS_RESERVE_EXCLUSIONS,
  reserveCoverageLabel,
  unavailableReserveSnapshot,
} from '../../../lib/project-gas/reserve-state';

const NOW = Date.parse('2026-08-17T12:30:00.000Z');

function canonicalRaw(dataAsOf = '2026-08-17T12:29:30.000Z') {
  return {
    version: 1,
    authority: 'oracle-indexer',
    source: 'project-gas-reserve-indexer',
    dataAsOf,
    circulationGas: '1000000',
    gasIndex: '1.0025',
    adjustedExternalReserveUsd: '1125000',
    requiredPegReserveUsd: '1000000',
    insuranceBufferUsd: '50000',
    liquidityFloorUsd: '75000',
    excessBackingUsd: '0',
    backingRatio: '1.125',
    components: [
      {
        id: 'usdc-liquidity',
        symbol: 'USDC',
        label: 'Liquidity Reserve',
        class: 'liquidity',
        grossUsd: '500000',
        haircutBps: 0,
        adjustedUsd: '500000',
        source: 'wallet+oracle',
        sourceAsOf: '2026-08-17T12:29:25.000Z',
      },
      {
        id: 'tbill-income',
        symbol: 'TBILL',
        label: 'Income Reserve',
        class: 'income',
        grossUsd: '650000',
        haircutBps: 385,
        adjustedUsd: '625000',
        source: 'custodian+oracle',
        sourceAsOf: '2026-08-17T12:29:20.000Z',
      },
    ],
    rebase: {
      status: 'scheduled',
      direction: 'positive',
      percent: '0.25',
      effectiveAt: '2026-08-18T00:00:00.000Z',
      rebaseId: 'rebase-2026-08-18',
    },
  };
}

describe('Project GAS reserve read model', () => {
  it('requires canonical authority, source and timestamp metadata', () => {
    const state = parseProjectGasReserveSnapshot({
      adjustedExternalReserveUsd: '100',
      requiredPegReserveUsd: '100',
      backingRatio: '1',
    }, NOW);

    expect(state.status).toBe('unavailable');
    expect(state.authority).toBe('unavailable');
    expect(reserveCoverageLabel(state)).toBe('—');
  });

  it('parses a fresh authoritative reserve snapshot without counting endogenous assets', () => {
    const state = parseProjectGasReserveSnapshot(canonicalRaw(), NOW);

    expect(state.status).toBe('ready');
    expect(state.authority).toBe('oracle-indexer');
    expect(state.adjustedExternalReserveUsd).toBe('1125000');
    expect(state.backingRatio).toBe('1.125');
    expect(reserveCoverageLabel(state)).toBe('1.125×');
    expect(state.components).toHaveLength(2);
    expect(state.components.every((component) => component.countsAsBacking)).toBe(true);
    expect(state.exclusions.map((item) => item.id)).toEqual([
      'gas',
      'wgas',
      'self-pol',
      'game-bankroll',
      'bracket-collateral',
    ]);
    expect(state.rebase).toMatchObject({
      status: 'scheduled',
      direction: 'positive',
      percent: '0.25',
      rebaseId: 'rebase-2026-08-18',
    });
  });

  it('labels an otherwise authoritative snapshot stale when freshness expires', () => {
    const state = parseProjectGasReserveSnapshot(
      canonicalRaw('2026-08-17T12:20:00.000Z'),
      NOW,
      60_000,
    );

    expect(state.status).toBe('stale');
    expect(state.message).toMatch(/older than/i);
    expect(reserveCoverageLabel(state)).toBe('1.125×');
  });

  it('degrades instead of inventing a ratio when required totals are incomplete', () => {
    const raw = canonicalRaw();
    delete (raw as Record<string, unknown>).backingRatio;

    const state = parseProjectGasReserveSnapshot(raw, NOW);
    expect(state.status).toBe('degraded');
    expect(state.authority).toBe('oracle-indexer');
    expect(reserveCoverageLabel(state)).toBe('—');
  });

  it('rejects malformed reserve components instead of coercing values', () => {
    const raw = canonicalRaw();
    raw.components.push({
      id: 'bad',
      symbol: 'BAD',
      label: 'Bad component',
      class: 'growth',
      grossUsd: 'not-money',
      haircutBps: 20000,
      adjustedUsd: '5',
      source: 'bad',
      sourceAsOf: 'not-a-date',
    });

    const state = parseProjectGasReserveSnapshot(raw, NOW);
    expect(state.status).toBe('ready');
    expect(state.components).toHaveLength(2);
  });

  it('has a stable exclusion policy even when the read source is unavailable', () => {
    const state = unavailableReserveSnapshot('No reserve adapter configured.');
    expect(state.exclusions).toEqual(PROJECT_GAS_RESERVE_EXCLUSIONS);
    expect(state.rebase.status).toBe('unavailable');
  });
});
