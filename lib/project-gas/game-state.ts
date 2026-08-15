export type GasGameMode = 'CRUISE' | 'BOOST' | 'REDLINE';
export type WagerAsset = 'GAS' | 'USDC';
export type PresentationMode = 'cinematic' | 'instant' | 'reduced-motion';

export type GameFailureCode =
  | 'validation-failed'
  | 'authorization-required'
  | 'authorization-expired'
  | 'signature-rejected'
  | 'transaction-failed'
  | 'intent-expired'
  | 'rng-delayed'
  | 'settlement-delayed'
  | 'network-degraded'
  | 'state-unknown';

export type FundsMovedState = 'no' | 'yes' | 'unknown';

/** Decimal strings only. Atomic-unit conversion belongs in the protocol adapter. */
export interface WagerDraft {
  mode: GasGameMode;
  asset: WagerAsset;
  amount: string;
}

export interface CommittedWager extends WagerDraft {
  requestId: string;
  roundId: string;
  submittedAt: string;
  /** Optional validity boundary for an intent. A stale local UI must never replay it. */
  expiresAt?: string;
  txHash?: `0x${string}`;
}

export interface GameResult {
  outcome: 'win' | 'loss' | 'push';
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
  createdAt: string;
  expiresAt?: string;
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
  /** True means the UI must reconcile that wager instead of submitting a replacement. */
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
      amount: draft?.amount ?? '25',
    },
  };
}

export function canIgnite(state: GasOriginalState): state is ReadyState {
  return state.phase === 'ready' && Number(state.draft.amount) > 0;
}

export function canBlindRetry(state: GasOriginalState): boolean {
  if (state.phase !== 'failed') return false;
  return state.fundsMoved === 'no' && state.wagerCreated === false && state.recoverTo === 'ready';
}

export function isActionPending(state: GasOriginalState): boolean {
  return state.phase === 'validating' || state.phase === 'committing' || state.phase === 'locked' || state.phase === 'resolving';
}

export function beginValidation(state: ReadyState): ValidatingState {
  return { phase: 'validating', draft: { ...state.draft } };
}

export function beginCommit(
  state: ValidatingState,
  requestId: string,
  createdAt: string,
  expiresAt?: string,
): CommittingState {
  if (!requestId.trim()) throw new Error('requestId is required');
  if (!createdAt.trim()) throw new Error('createdAt is required');
  return { phase: 'committing', draft: { ...state.draft }, requestId, createdAt, expiresAt };
}

export function isIntentExpired(state: CommittingState, nowIso: string): boolean {
  if (!state.expiresAt) return false;
  return new Date(nowIso).getTime() >= new Date(state.expiresAt).getTime();
}

export function lockWager(
  state: CommittingState,
  committed: Omit<CommittedWager, keyof WagerDraft | 'requestId' | 'expiresAt'>,
): LockedState {
  return {
    phase: 'locked',
    wager: {
      ...state.draft,
      requestId: state.requestId,
      expiresAt: state.expiresAt,
      ...committed,
    },
  };
}

export function beginResolution(state: LockedState): ResolvingState {
  return { phase: 'resolving', wager: state.wager };
}

export function resolveRound(state: ResolvingState, result: GameResult): ResultState {
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

export function updateReadyDraft(state: ReadyState, patch: Partial<WagerDraft>): ReadyState {
  return {
    ...state,
    draft: { ...state.draft, ...patch },
  };
}

export function failBeforeSubmission(
  draft: WagerDraft,
  code: Extract<GameFailureCode, 'validation-failed' | 'authorization-required' | 'authorization-expired' | 'signature-rejected'>,
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

export function failExpiredIntent(state: CommittingState): FailedState {
  return {
    phase: 'failed',
    code: 'intent-expired',
    message: 'This wager intent expired before it was accepted.',
    fundsMoved: 'no',
    wagerCreated: false,
    requestId: state.requestId,
    recoverTo: 'ready',
    draft: { ...state.draft },
  };
}

export function failUnknownSubmission(state: CommittingState, message: string): FailedState {
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
    recoverTo: code === 'settlement-delayed' ? 'locked' : 'resolving',
    wager: state.wager,
  };
}

export function fundsStateLabel(state: FailedState): string {
  if (state.fundsMoved === 'no' && state.wagerCreated === false) {
    return 'No funds moved and no wager was created. Safe to retry.';
  }
  if (state.wagerCreated === true) {
    return 'Your wager exists. Do not submit a replacement while this round is being reconciled.';
  }
  return 'Wager status is not yet known. Do not retry until authoritative state is recovered.';
}
