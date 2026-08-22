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
  /** GAS sourced/credited by the authoritative entry router for the internal wager. */
  wagerAsset: 'GAS';
  wagerAmount: string;
  /** Quote/credit identity when the entry router exposes one. */
  sourcingQuoteId?: string;
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

const GAME_MODES = new Set(['CRUISE', 'BOOST', 'REDLINE']);
const REJECTED_CODES = new Set<RejectedGameIntent['code']>([
  'validation-failed',
  'authorization-required',
  'authorization-expired',
  'signature-rejected',
  'transaction-failed',
  'intent-expired',
]);
const DELAY_CODES = new Set<FailedGameRound['code']>([
  'rng-delayed',
  'settlement-delayed',
  'network-degraded',
]);

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function nonEmpty(value: unknown, maxLength = 256): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function canonicalId(value: unknown): string | undefined {
  const id = nonEmpty(value, 128);
  return id && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id) ? id : undefined;
}

export function parseGameIntentId(value: unknown): string | undefined {
  return canonicalId(value);
}

function isoTimestamp(value: unknown): string | undefined {
  const timestamp = nonEmpty(value, 64);
  if (!timestamp) return undefined;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString() === timestamp ? timestamp : undefined;
}

function decimal(value: unknown, allowZero = false): string | undefined {
  const amount = nonEmpty(value, 96);
  if (!amount || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)) return undefined;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || (allowZero ? numeric < 0 : numeric <= 0)) return undefined;
  return amount;
}

function txHash(value: unknown): `0x${string}` | undefined {
  const hash = nonEmpty(value, 66);
  return hash && /^0x[0-9a-fA-F]{64}$/.test(hash) ? hash as `0x${string}` : undefined;
}

export function parseCreateGameIntentInput(value: unknown): CreateGameIntentInput | undefined {
  const input = record(value);
  const wager = record(input?.wager);
  const intentId = canonicalId(input?.intentId);
  const createdAt = isoTimestamp(input?.createdAt);
  const expiresAt = input?.expiresAt === undefined ? undefined : isoTimestamp(input.expiresAt);
  const mode = nonEmpty(wager?.mode);
  const entryAmount = decimal(wager?.entryAmount);

  if (!input || !wager || !intentId || !createdAt || !mode || !GAME_MODES.has(mode)
    || wager.entryAsset !== 'USDC' || !entryAmount
    || (input.expiresAt !== undefined && !expiresAt)) return undefined;

  if (expiresAt && Date.parse(expiresAt) <= Date.parse(createdAt)) return undefined;

  return {
    intentId,
    createdAt,
    expiresAt,
    wager: {
      mode: mode as WagerDraft['mode'],
      entryAsset: 'USDC',
      entryAmount,
    },
  };
}

function parseAcceptedIntent(value: unknown, expectedIntentId?: string): AcceptedGameIntent | undefined {
  const input = record(value);
  const intentId = canonicalId(input?.intentId);
  const roundId = canonicalId(input?.roundId);
  const acceptedAt = isoTimestamp(input?.acceptedAt);
  const wagerAmount = decimal(input?.wagerAmount);
  const hash = input?.txHash === undefined ? undefined : txHash(input.txHash);

  if (!input || input.status !== 'accepted' || !intentId || !roundId || !acceptedAt
    || input.wagerAsset !== 'GAS' || !wagerAmount || typeof input.fundsMoved !== 'boolean'
    || (expectedIntentId && intentId !== expectedIntentId)
    || (input.txHash !== undefined && !hash)) return undefined;

  return {
    status: 'accepted',
    intentId,
    roundId,
    acceptedAt,
    wagerAsset: 'GAS',
    wagerAmount,
    sourcingQuoteId: canonicalId(input.sourcingQuoteId),
    fundsMoved: input.fundsMoved,
    txHash: hash,
  };
}

export function parseSubmitGameIntentResult(
  value: unknown,
  expectedIntentId: string,
): SubmitGameIntentResult | undefined {
  const accepted = parseAcceptedIntent(value, expectedIntentId);
  if (accepted) return accepted;

  const input = record(value);
  const intentId = canonicalId(input?.intentId);
  const message = nonEmpty(input?.message, 500);
  if (!input || intentId !== expectedIntentId || !message) return undefined;

  if (input.status === 'rejected' && typeof input.code === 'string'
    && REJECTED_CODES.has(input.code as RejectedGameIntent['code'])
    && typeof input.retrySafe === 'boolean' && input.fundsMoved === false) {
    return {
      status: 'rejected',
      intentId,
      code: input.code as RejectedGameIntent['code'],
      message,
      retrySafe: input.retrySafe,
      fundsMoved: false,
    };
  }

  if (input.status === 'unknown' && input.fundsMoved === 'unknown') {
    return { status: 'unknown', intentId, message, fundsMoved: 'unknown' };
  }

  return undefined;
}

export function parseReconcileGameIntentResult(
  value: unknown,
  expectedIntentId: string,
): ReconcileGameIntentResult | undefined {
  const input = record(value);
  if (!input) return undefined;

  if (input.status === 'accepted') {
    const accepted = parseAcceptedIntent(input.intent, expectedIntentId);
    return accepted ? { status: 'accepted', intent: accepted } : undefined;
  }

  const intentId = canonicalId(input.intentId);
  const message = nonEmpty(input.message, 500);
  if (intentId !== expectedIntentId || !message) return undefined;
  if (input.status === 'not-found' && input.retrySafe === true) {
    return { status: 'not-found', intentId, retrySafe: true, message };
  }
  if (input.status === 'unknown' && input.retrySafe === false) {
    return { status: 'unknown', intentId, retrySafe: false, message };
  }
  return undefined;
}

function parseGameResult(value: unknown, roundId: string): GameResult | undefined {
  const input = record(value);
  const outcome = nonEmpty(input?.outcome);
  const multiplier = decimal(input?.multiplier, true);
  const payoutAmount = decimal(input?.payoutAmount, true);
  const settledAt = isoTimestamp(input?.settledAt);
  const settlementHash = input?.settlementTxHash === undefined
    ? undefined
    : txHash(input.settlementTxHash);

  if (!input || (outcome !== 'win' && outcome !== 'loss' && outcome !== 'push')
    || !multiplier || !payoutAmount || input.payoutAsset !== 'GAS' || !settledAt
    || (input.settlementTxHash !== undefined && !settlementHash)) return undefined;

  return {
    outcome,
    multiplier,
    payoutAmount,
    payoutAsset: 'GAS',
    settledAt,
    settlementTxHash: settlementHash,
    verificationHref: `/round/${encodeURIComponent(roundId)}`,
  };
}

export function parseResolveGameRoundResult(
  value: unknown,
  expectedIntentId: string,
  expectedRoundId: string,
): ResolveGameRoundResult | undefined {
  const input = record(value);
  const intentId = canonicalId(input?.intentId);
  const roundId = canonicalId(input?.roundId);
  if (!input || intentId !== expectedIntentId || roundId !== expectedRoundId) return undefined;

  if (input.status === 'settled') {
    const result = parseGameResult(input.result, roundId);
    return result ? { status: 'settled', intentId, roundId, result } : undefined;
  }

  const message = nonEmpty(input.message, 500);
  if (!message) return undefined;
  if (input.status === 'pending' && (input.stage === 'rng' || input.stage === 'settlement')) {
    return { status: 'pending', intentId, roundId, stage: input.stage, message };
  }
  if (input.status === 'failed' && typeof input.code === 'string'
    && DELAY_CODES.has(input.code as FailedGameRound['code'])) {
    return {
      status: 'failed',
      intentId,
      roundId,
      code: input.code as FailedGameRound['code'],
      message,
    };
  }
  return undefined;
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
