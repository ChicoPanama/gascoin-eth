import { describe, expect, it } from 'vitest';
import {
  recoveryGuidance,
  unavailableMoneyAction,
  type CanonicalMoneyActionState,
} from '../../../lib/project-gas/action-recovery';

function state(overrides: Partial<CanonicalMoneyActionState>): CanonicalMoneyActionState {
  return {
    actionId: 'action-1',
    kind: 'other',
    status: 'not-started',
    moneyMoved: 'no',
    authority: 'backend',
    message: 'No action.',
    retrySafe: false,
    ...overrides,
  };
}

describe('Project GAS money-action recovery hierarchy', () => {
  it('blocks retry while money movement is unknown', () => {
    const guidance = recoveryGuidance(state({
      status: 'unknown',
      moneyMoved: 'unknown',
      retrySafe: false,
    }));

    expect(guidance.headline).toBe('Checking what happened');
    expect(guidance.moneyState).toMatch(/not yet known/i);
    expect(guidance.nextAction).toMatch(/Reconcile/i);
    expect(guidance.retrySafe).toBe(false);
  });

  it('blocks duplicate submission while an action is pending', () => {
    const guidance = recoveryGuidance(state({
      status: 'pending',
      moneyMoved: 'no',
      retrySafe: false,
    }));

    expect(guidance.headline).toBe('Action in progress');
    expect(guidance.nextAction).toMatch(/do not duplicate/i);
    expect(guidance.retrySafe).toBe(false);
  });

  it('allows retry only after a failure confirms no money moved', () => {
    const guidance = recoveryGuidance(state({
      status: 'failed-retry-safe',
      moneyMoved: 'no',
      retrySafe: true,
    }));

    expect(guidance.headline).toBe('Nothing moved');
    expect(guidance.retrySafe).toBe(true);
  });

  it('keeps retry blocked when a failure cannot prove repeat safety', () => {
    const guidance = recoveryGuidance(state({
      status: 'failed-not-retry-safe',
      moneyMoved: 'unknown',
      retrySafe: false,
    }));

    expect(guidance.headline).toBe('Do not retry yet');
    expect(guidance.nextAction).toMatch(/Reconcile/i);
    expect(guidance.retrySafe).toBe(false);
  });

  it('reports settled money movement before any technical detail', () => {
    const guidance = recoveryGuidance(state({
      status: 'settled',
      moneyMoved: 'yes',
      retrySafe: false,
    }));

    expect(guidance.headline).toBe('Complete');
    expect(guidance.moneyState).toMatch(/Money moved/i);
    expect(guidance.retrySafe).toBe(false);
  });

  it('creates a stable unavailable state with no implied financial action', () => {
    const unavailable = unavailableMoneyAction('withdrawal', 'Withdrawal provider is not configured.');
    expect(unavailable).toMatchObject({
      kind: 'withdrawal',
      status: 'not-started',
      moneyMoved: 'no',
      authority: 'unavailable',
      retrySafe: false,
    });
  });
});
