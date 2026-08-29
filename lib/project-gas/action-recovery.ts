export type MoneyMovement = 'yes' | 'no' | 'unknown';

export type CanonicalMoneyActionStatus =
  | 'not-started'
  | 'acknowledged'
  | 'pending'
  | 'unknown'
  | 'reconciling'
  | 'settled'
  | 'failed-retry-safe'
  | 'failed-not-retry-safe'
  | 'action-required';

export interface CanonicalMoneyActionState {
  actionId: string;
  kind: 'funding' | 'withdrawal' | 'trade' | 'game' | 'other';
  status: CanonicalMoneyActionStatus;
  moneyMoved: MoneyMovement;
  authority: 'backend' | 'indexer' | 'contract' | 'wallet' | 'unavailable';
  message: string;
  updatedAt?: string;
  retrySafe: boolean;
  canonicalReference?: string;
}

export interface RecoveryGuidance {
  headline: string;
  moneyState: string;
  nextAction: string;
  retrySafe: boolean;
  technicalDetailAllowed: boolean;
}

export function recoveryGuidance(state: CanonicalMoneyActionState): RecoveryGuidance {
  if (state.status === 'settled') {
    return {
      headline: 'Complete',
      moneyState: state.moneyMoved === 'yes' ? 'Money moved and the action is settled.' : 'The action settled without moving money.',
      nextAction: 'No retry is needed.',
      retrySafe: false,
      technicalDetailAllowed: true,
    };
  }

  if (state.status === 'reconciling' || state.status === 'unknown') {
    return {
      headline: 'Checking what happened',
      moneyState: 'Whether money moved is not yet known.',
      nextAction: 'Reconcile the canonical action before trying again.',
      retrySafe: false,
      technicalDetailAllowed: true,
    };
  }

  if (state.status === 'pending' || state.status === 'acknowledged') {
    return {
      headline: 'Action in progress',
      moneyState: state.moneyMoved === 'yes'
        ? 'Money movement has been observed, but final state is still pending.'
        : state.moneyMoved === 'no'
          ? 'No money movement has been observed yet.'
          : 'Money movement is not yet known.',
      nextAction: 'Wait for canonical confirmation or reconciliation; do not duplicate the action.',
      retrySafe: false,
      technicalDetailAllowed: true,
    };
  }

  if (state.status === 'failed-retry-safe') {
    return {
      headline: 'Nothing moved',
      moneyState: 'The failed action is confirmed to have moved no money.',
      nextAction: 'Retry is safe after correcting the stated problem.',
      retrySafe: true,
      technicalDetailAllowed: true,
    };
  }

  if (state.status === 'failed-not-retry-safe') {
    return {
      headline: 'Do not retry yet',
      moneyState: state.moneyMoved === 'yes'
        ? 'Money movement occurred before the failure state.'
        : 'The action cannot be proven safe to repeat.',
      nextAction: 'Reconcile or obtain canonical support state before another attempt.',
      retrySafe: false,
      technicalDetailAllowed: true,
    };
  }

  if (state.status === 'action-required') {
    return {
      headline: 'Action required',
      moneyState: state.moneyMoved === 'yes'
        ? 'Money movement is already recorded.'
        : state.moneyMoved === 'no'
          ? 'No money movement is recorded.'
          : 'Money movement is not yet known.',
      nextAction: state.message,
      retrySafe: state.retrySafe,
      technicalDetailAllowed: true,
    };
  }

  return {
    headline: 'No action in progress',
    moneyState: 'No money movement is associated with this action.',
    nextAction: state.message,
    retrySafe: state.retrySafe,
    technicalDetailAllowed: false,
  };
}

export function unavailableMoneyAction(kind: CanonicalMoneyActionState['kind'], message: string): CanonicalMoneyActionState {
  return {
    actionId: `unavailable-${kind}`,
    kind,
    status: 'not-started',
    moneyMoved: 'no',
    authority: 'unavailable',
    message,
    retrySafe: false,
  };
}
