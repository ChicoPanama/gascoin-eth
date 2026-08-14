export type GasGameMode = 'CRUISE' | 'BOOST' | 'REDLINE';
export type WagerAsset = 'GAS' | 'USDC';

export type GameFailureCode =
  | 'validation-failed'
  | 'signature-rejected'
  | 'transaction-failed'
  | 'rng-delayed'
  | 'settlement-delayed'
  | 'network-degraded'
  | 'state-unknown';

export type FundsMovedState = 'no' | 'yes' | 'unknown';

/**
 * Amounts are decimal strings. Conversion to atomic units belongs in the
 * transaction/domain adapter, never in the presentation state machine.
 */
export interface WagerDraft {
  mode: GasGameMode;
  asset: WagerAsset;
  amount: string;
}

export interface CommittedWager extends WagerDraft {
  requestId: string;
  roundId: string;
  submittedAt: string;
  txHash?: `0x${string}`;
}

export interface GameResult {
  outcome: 'win' | 'loss';
  multiplier: string;
  payoutAmount: string;
  payoutAsset: WagerAsset;
  settledAt: string;
  settlementTxHash?: `0x${string}`;
  verificationHref: string;
}

export interface ReadyState {
  phase: 'ready';
  draft: WagerDraft;
  lastRound?: {
    wager: CommittedWager;
    result: GameResult;
  };
}

export interface ValidatingState {
  phase: 'validating';
  draft: WagerDraft;
}

export interface CommittingState {
  phase: 'committing';
  draft: WagerDraft;
  requestId: string;
}

export interface LockedState {
  phase: 'locked';
  wager: CommittedWager;
}

export interface ResolvingState {
  phase: 'resolving';
  wager: CommittedWager;
}

export interface ResultState {
  phase: 'result';
  wager: CommittedWager;
  result: GameResult;
}

export interface FailedState {
  phase: 'failed';
  code: GameFailureCode;
  message: string;
  fundsMoved: FundsMovedState;
  /**
   * Whether the server/protocol knows a wager was created. When this is
   * true, the UI must not offer an unsafe blind resubmission.
   */
  wagerCreated: boolean | 'unknown';
  roundId?: string;
  requestId?: string;
  recoverTo: 'ready' | 'locked' | 'resolving';
  draft?: WagerDraft;
  wager?: CommittedWager;
}

export type GasOriginalState =
  | ReadyState
  | ValidatingState
  | CommittingState
  | LockedState
  | ResolvingState
  | ResultState
  | FailedState;

export function createReadyState(draft?: Partial<WagerDraft>): ReadyState {
  return {
    phase: 'ready',
    draft: {
      mode: draft?.mode ?? 'BOOST',
      asset: draft?.asset ?? 'GAS',
      amount: draft?.amount ?? '',
    },
  };
}

export function canIgnite(state: GasOriginalState): state is ReadyState {
  return state.phase === 'ready';
}

export function canBlindRetry(state: GasOriginalState): boolean {
  if (state.phase !== 'failed') return false;
  return state.fundsMoved === 'no' && state.wagerCreated === false && state.recoverTo === 'ready';
}

export function beginValidation(state: ReadyState): ValidatingState {
  return { phase: 'validating', draft: { ...state.draft } };
}

export function beginCommit(
  state: ValidatingState,
  requestId: string,
): CommittingState {
  if (!requestId.trim()) throw new Error('requestId is required');
  return { phase: 'committing', draft: { ...state.draft }, requestId };
}

export function lockWager(
  state: CommittingState,
  committed: Omit<CommittedWager, keyof WagerDraft | 'requestId'>,
): LockedState {
  return {
    phase: 'locked',
    wager: {
      ...state.draft,
      requestId: state.requestId,
      ...committed,
    },
  };
}

export function beginResolution(state: LockedState): ResolvingState {
  return { phase: 'resolving', wager: state.wager };
}

export function resolveRound(
  state: ResolvingState,
  result: GameResult,
): ResultState {
  return { phase: 'result', wager: state.wager, result };
}

export function repeatSameConfiguration(state: ResultState): ReadyState {
  return {
    phase: 'ready',
    draft: {
      mode: state.wager.mode,
      asset: state.wager.asset,
      amount: state.wager.amount,
    },
    lastRound: { wager: state.wager, result: state.result },
  };
}

export function failBeforeSubmission(
  draft: WagerDraft,
  code: Extract<GameFailureCode, 'validation-failed' | 'signature-rejected'>,
  message: string,
): FailedState {
  return {
    phase: 'failed',
    code,
    message,
    fundsMoved: 'no',
    wagerCreated: false,
    recoverTo: 'ready',
    draft: { ...draft },
  };
}

export function failUnknownSubmission(
  state: CommittingState,
  message: string,
): FailedState {
  return {
    phase: 'failed',
    code: 'state-unknown',
    message,
    fundsMoved: 'unknown',
    wagerCreated: 'unknown',
    requestId: state.requestId,
    recoverTo: 'locked',
    draft: { ...state.draft },
  };
}

export function failAfterLock(
  state: LockedState | ResolvingState,
  code: Extract<GameFailureCode, 'rng-delayed' | 'settlement-delayed' | 'network-degraded'>,
  message: string,
): FailedState {
  return {
    phase: 'failed',
    code,
    message,
    fundsMoved: 'yes',
    wagerCreated: true,
    roundId: state.wager.roundId,
    requestId: state.wager.requestId,
    recoverTo: code === 'rng-delayed' || code === 'network-degraded' ? 'resolving' : 'locked',
    wager: state.wager,
  };
}

export function fundsStateLabel(state: FailedState): string {
  if (state.fundsMoved === 'no' && state.wagerCreated === false) {
    return 'No funds moved and no wager was created. Safe to retry.';
  }
  if (state.wagerCreated === true) {
    return 'Your wager exists. Do not submit a replacement until this round is reconciled.';
  }
  return 'Wager status is unknown. Do not retry until authoritative state is recovered.';
}
