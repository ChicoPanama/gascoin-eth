import { describe, expect, it } from 'vitest';
import {
  beginCommit,
  beginResolution,
  beginValidation,
  canBlindRetry,
  canIgnite,
  createReadyState,
  failAfterLock,
  failBeforeSubmission,
  failUnknownSubmission,
  fundsStateLabel,
  lockWager,
  repeatSameConfiguration,
  resolveRound,
} from '@/lib/project-gas/game-state';

describe('Project GAS Original state machine', () => {
  it('defaults to BOOST and only allows ignition from ready', () => {
    const ready = createReadyState({ amount: '100' });
    expect(ready.draft).toEqual({ mode: 'BOOST', asset: 'GAS', amount: '100' });
    expect(canIgnite(ready)).toBe(true);

    const validating = beginValidation(ready);
    expect(canIgnite(validating)).toBe(false);
  });

  it('preserves the explicit wager configuration through commit and resolution', () => {
    const ready = createReadyState({ mode: 'REDLINE', asset: 'USDC', amount: '25' });
    const validating = beginValidation(ready);
    const committing = beginCommit(validating, 'req-1');
    const locked = lockWager(committing, {
      roundId: 'round-42',
      submittedAt: '2026-08-14T12:00:00.000Z',
      txHash: '0x1234',
    });
    const resolving = beginResolution(locked);
    const result = resolveRound(resolving, {
      outcome: 'win',
      multiplier: '4.2',
      payoutAmount: '105',
      payoutAsset: 'USDC',
      settledAt: '2026-08-14T12:00:01.000Z',
      settlementTxHash: '0xabcd',
      verificationHref: '/verify/round-42',
    });

    expect(result.wager.mode).toBe('REDLINE');
    expect(result.wager.asset).toBe('USDC');
    expect(result.wager.amount).toBe('25');
    expect(result.wager.requestId).toBe('req-1');
    expect(result.wager.roundId).toBe('round-42');
  });

  it('returns to ready with the same explicit configuration after a result', () => {
    const ready = createReadyState({ mode: 'CRUISE', asset: 'GAS', amount: '80' });
    const locked = lockWager(beginCommit(beginValidation(ready), 'repeat-1'), {
      roundId: 'r1',
      submittedAt: '2026-08-14T12:00:00.000Z',
    });
    const result = resolveRound(beginResolution(locked), {
      outcome: 'loss',
      multiplier: '0',
      payoutAmount: '0',
      payoutAsset: 'GAS',
      settledAt: '2026-08-14T12:00:01.000Z',
      verificationHref: '/verify/r1',
    });

    const repeated = repeatSameConfiguration(result);
    expect(canIgnite(repeated)).toBe(true);
    expect(repeated.draft).toEqual({ mode: 'CRUISE', asset: 'GAS', amount: '80' });
    expect(repeated.lastRound?.wager.roundId).toBe('r1');
  });

  it('allows a blind retry only when the protocol knows no wager or funds moved', () => {
    const draft = createReadyState({ amount: '10' }).draft;
    const rejected = failBeforeSubmission(draft, 'signature-rejected', 'User rejected signature');

    expect(canBlindRetry(rejected)).toBe(true);
    expect(fundsStateLabel(rejected)).toContain('No funds moved');

    const unknown = failUnknownSubmission(beginCommit(beginValidation(createReadyState({ amount: '10' })), 'req-2'), 'RPC timed out after send');
    expect(canBlindRetry(unknown)).toBe(false);
    expect(fundsStateLabel(unknown)).toContain('status is unknown');
  });

  it('does not allow blind retry after the wager is known to exist', () => {
    const locked = lockWager(
      beginCommit(beginValidation(createReadyState({ amount: '50' })), 'req-3'),
      {
        roundId: 'r3',
        submittedAt: '2026-08-14T12:00:00.000Z',
      },
    );

    const delayed = failAfterLock(locked, 'rng-delayed', 'Randomness provider is delayed');
    expect(canBlindRetry(delayed)).toBe(false);
    expect(delayed.wagerCreated).toBe(true);
    expect(delayed.roundId).toBe('r3');
    expect(fundsStateLabel(delayed)).toContain('Do not submit a replacement');
  });

  it('requires a request id before commit', () => {
    const validating = beginValidation(createReadyState({ amount: '5' }));
    expect(() => beginCommit(validating, '   ')).toThrow('requestId is required');
  });
});
