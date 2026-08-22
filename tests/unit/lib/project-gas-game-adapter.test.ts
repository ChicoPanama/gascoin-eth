import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseCreateGameIntentInput,
  parseReconcileGameIntentResult,
  parseResolveGameRoundResult,
  parseSubmitGameIntentResult,
} from '@/lib/project-gas/game-adapter';
import { createProjectGasGameHttpAdapter } from '@/lib/project-gas/game-http-adapter';

const intent = {
  intentId: 'gas-intent-1',
  createdAt: '2026-08-22T12:00:00.000Z',
  expiresAt: '2026-08-22T12:01:00.000Z',
  wager: { mode: 'BOOST', entryAsset: 'USDC', entryAmount: '25' },
} as const;

const accepted = {
  status: 'accepted',
  intentId: intent.intentId,
  roundId: 'base-round-1',
  acceptedAt: '2026-08-22T12:00:01.000Z',
  wagerAsset: 'GAS',
  wagerAmount: '24.5',
  fundsMoved: true,
  txHash: `0x${'ab'.repeat(32)}`,
} as const;

afterEach(() => vi.restoreAllMocks());

describe('Project GAS game adapter boundary', () => {
  it('accepts only USDC player entry with a canonical intent and bounded lifetime', () => {
    expect(parseCreateGameIntentInput(intent)).toEqual(intent);
    expect(parseCreateGameIntentInput({ ...intent, wager: { ...intent.wager, entryAsset: 'GAS' } })).toBeUndefined();
    expect(parseCreateGameIntentInput({ ...intent, intentId: '../escape' })).toBeUndefined();
    expect(parseCreateGameIntentInput({ ...intent, expiresAt: intent.createdAt })).toBeUndefined();
    expect(parseCreateGameIntentInput({ ...intent, wager: { ...intent.wager, entryAmount: '1e6' } })).toBeUndefined();
  });

  it('rejects contradictory identity, asset and transaction data from the execution source', () => {
    expect(parseSubmitGameIntentResult(accepted, intent.intentId)).toEqual(accepted);
    expect(parseSubmitGameIntentResult({ ...accepted, intentId: 'different' }, intent.intentId)).toBeUndefined();
    expect(parseSubmitGameIntentResult({ ...accepted, wagerAsset: 'USDC' }, intent.intentId)).toBeUndefined();
    expect(parseSubmitGameIntentResult({ ...accepted, txHash: '0x1234' }, intent.intentId)).toBeUndefined();
    expect(parseSubmitGameIntentResult({
      status: 'rejected',
      intentId: intent.intentId,
      code: 'transaction-failed',
      message: 'Source rejected before execution.',
      retrySafe: true,
      fundsMoved: false,
    }, intent.intentId)).toMatchObject({ status: 'rejected', fundsMoved: false });
  });

  it('requires explicit safe-not-found or accepted state during reconciliation', () => {
    expect(parseReconcileGameIntentResult({
      status: 'not-found',
      intentId: intent.intentId,
      retrySafe: true,
      message: 'No wager exists.',
    }, intent.intentId)).toMatchObject({ status: 'not-found', retrySafe: true });
    expect(parseReconcileGameIntentResult({
      status: 'not-found',
      intentId: intent.intentId,
      retrySafe: false,
      message: 'Maybe missing.',
    }, intent.intentId)).toBeUndefined();
    expect(parseReconcileGameIntentResult({ status: 'accepted', intent: accepted }, intent.intentId))
      .toMatchObject({ status: 'accepted', intent: accepted });
  });

  it('canonicalizes verification links and validates settled GAS output', () => {
    const settled = parseResolveGameRoundResult({
      status: 'settled',
      intentId: intent.intentId,
      roundId: accepted.roundId,
      result: {
        outcome: 'win',
        multiplier: '2',
        payoutAmount: '49',
        payoutAsset: 'GAS',
        settledAt: '2026-08-22T12:00:05.000Z',
        verificationHref: 'https://evil.example/round',
      },
    }, intent.intentId, accepted.roundId);

    expect(settled).toMatchObject({
      status: 'settled',
      result: { payoutAsset: 'GAS', verificationHref: '/round/base-round-1' },
    });
    expect(parseResolveGameRoundResult({
      status: 'settled',
      intentId: intent.intentId,
      roundId: accepted.roundId,
      result: { outcome: 'win', multiplier: '2', payoutAmount: '49', payoutAsset: 'USDC', settledAt: intent.createdAt },
    }, intent.intentId, accepted.roundId)).toBeUndefined();
  });

  it('never turns an ambiguous POST failure into a safe retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    const adapter = createProjectGasGameHttpAdapter(async () => 'privy-token');
    await expect(adapter.submitIntent(intent)).resolves.toEqual({
      status: 'unknown',
      intentId: intent.intentId,
      message: 'The wager response is unknown. Check status before retrying.',
      fundsMoved: 'unknown',
    });
  });

  it('does not call a money route without a verified Privy access token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const adapter = createProjectGasGameHttpAdapter(async () => null);
    const result = await adapter.submitIntent(intent);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'rejected', code: 'authorization-required', fundsMoved: false });
  });
});
