import type {
  CommittedWager,
  GameFailureCode,
  GameResult,
  WagerDraft,
} from './game-state';

export type GasGameAdapterAuthority = 'prototype' | 'backend' | 'contract' | 'unavailable';

export interface GasGameAdapterDescriptor {
  authority: GasGameAdapterAuthority;
  label: string;
  movesFunds: boolean;
  liveRng: boolean;
  verification: 'prototype' | 'canonical' | 'unavailable';
}

export interface CreateGameIntentInput {
  intentId: string;
  wager: WagerDraft;
  createdAt: string;
  expiresAt?: string;
}

export interface AcceptedGameIntent {
  status: 'accepted';
  intentId: string;
  roundId: string;
  acceptedAt: string;
  fundsMoved: boolean;
  txHash?: `0x${string}`;
}

export interface RejectedGameIntent {
  status: 'rejected';
  intentId: string;
  code: Extract<
    GameFailureCode,
    | 'validation-failed'
    | 'authorization-required'
    | 'authorization-expired'
    | 'signature-rejected'
    | 'transaction-failed'
    | 'intent-expired'
  >;
  message: string;
  retrySafe: boolean;
  fundsMoved: false;
}

export interface UnknownGameIntent {
  status: 'unknown';
  intentId: string;
  message: string;
  fundsMoved: 'unknown';
}

export type SubmitGameIntentResult = AcceptedGameIntent | RejectedGameIntent | UnknownGameIntent;

export interface PendingGameRound {
  status: 'pending';
  intentId: string;
  roundId: string;
  stage: 'rng' | 'settlement';
  message: string;
}

export interface SettledGameRound {
  status: 'settled';
  intentId: string;
  roundId: string;
  result: GameResult;
}

export interface FailedGameRound {
  status: 'failed';
  intentId: string;
  roundId: string;
  code: Extract<GameFailureCode, 'rng-delayed' | 'settlement-delayed' | 'network-degraded'>;
  message: string;
}

export type ResolveGameRoundResult = PendingGameRound | SettledGameRound | FailedGameRound;

export type ReconcileGameIntentResult =
  | { status: 'not-found'; intentId: string; retrySafe: true; message: string }
  | { status: 'accepted'; intent: AcceptedGameIntent }
  | { status: 'unknown'; intentId: string; retrySafe: false; message: string };

export interface GasOriginalAdapter {
  readonly descriptor: GasGameAdapterDescriptor;
  submitIntent(input: CreateGameIntentInput): Promise<SubmitGameIntentResult>;
  reconcileIntent(intentId: string): Promise<ReconcileGameIntentResult>;
  resolveRound(wager: CommittedWager): Promise<ResolveGameRoundResult>;
}

export function createGameIntentId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `gas-intent-${uuid}`;

  const random = Math.random().toString(36).slice(2);
  return `gas-intent-${Date.now().toString(36)}-${random}`;
}

export function prototypeRoundId(intentId: string): string {
  return `prototype-round-${intentId.replace(/^gas-intent-/, '')}`;
}
