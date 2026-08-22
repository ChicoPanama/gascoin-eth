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
  failExpiredIntent,
  failUnknownSubmission,
  fundsStateLabel,
  isActionPending,
  isIntentExpired,
  lockWager,
  repeatSameConfiguration,
  resolveRound,
  updateReadyDraft,
} from '@/lib/project-gas/game-state';

const createdAt = '2026-08-16T00:00:00.000Z';

function commitReady(requestId = 'req-1') {
  return beginCommit(beginValidation(createReadyState({ entryAmount: '25' })), requestId, createdAt);
}

describe('Project GAS Original canonical state model', () => {
  it('defaults to BOOST and only allows ignition from a valid ready state', () => {
    const ready = createReadyState({ entryAmount: '100' });
    expect(ready.draft).toEqual({ mode: 'BOOST', entryAsset: 'USDC', entryAmount: '100' });
    expect(canIgnite(ready)).toBe(true);

    expect(canIgnite(updateReadyDraft(ready, { entryAmount: '0' }))).toBe(false);
    expect(canIgnite(updateReadyDraft(ready, { entryAmount: 'Infinity' }))).toBe(false);
    expect(canIgnite(beginValidation(ready))).toBe(false);
  });

  it('preserves USDC entry separately from the sourced GAS wager through settlement', () => {
    const ready = createReadyState({ mode: 'REDLINE', entryAmount: '25' });
    const committing = beginCommit(beginValidation(ready), 'req-red', createdAt, '2026-08-16T00:00:15.000Z');
    const locked = lockWager(committing, {
      roundId: 'round-42',
      submittedAt: '2026-08-16T00:00:01.000Z',
      wagerAmount: '24.75',
      txHash: '0x1234',
    });
    const result = resolveRound(beginResolution(locked), {
      outcome: 'win',
      multiplier: '4.2',
      payoutAmount: '105',
      payoutAsset: 'GAS',
      settledAt: '2026-08-16T00:00:02.000Z',
      settlementTxHash: '0xabcd',
      verificationHref: '/round/round-42',
    });

    expect(result.wager).toMatchObject({
      mode: 'REDLINE',
      entryAsset: 'USDC',
      entryAmount: '25',
      wagerAsset: 'GAS',
      wagerAmount: '24.75',
      requestId: 'req-red',
      roundId: 'round-42',
      expiresAt: '2026-08-16T00:00:15.000Z',
    });
  });

  it('returns to ready with the same ordinary configuration after a result', () => {
    const ready = createReadyState({ mode: 'CRUISE', entryAmount: '80' });
    const locked = lockWager(beginCommit(beginValidation(ready), 'repeat-1', createdAt), {
      roundId: 'r1',
      submittedAt: '2026-08-16T00:00:01.000Z',
      wagerAmount: '79.2',
    });
    const result = resolveRound(beginResolution(locked), {
      outcome: 'loss',
      multiplier: '0',
      payoutAmount: '0',
      payoutAsset: 'GAS',
      settledAt: '2026-08-16T00:00:02.000Z',
      verificationHref: '/round/r1',
    });

    const repeated = repeatSameConfiguration(result);
    expect(canIgnite(repeated)).toBe(true);
    expect(repeated.draft).toEqual({ mode: 'CRUISE', entryAsset: 'USDC', entryAmount: '80' });
    expect(repeated.lastRound?.wager.roundId).toBe('r1');
  });

  it('marks validating/committing/locked/resolving as pending', () => {
    const validating = beginValidation(createReadyState());
    const committing = beginCommit(validating, 'pending-1', createdAt);
    const locked = lockWager(committing, {
      roundId: 'pending-r',
      submittedAt: createdAt,
      wagerAmount: '25',
    });
    const resolving = beginResolution(locked);

    expect(isActionPending(validating)).toBe(true);
    expect(isActionPending(committing)).toBe(true);
    expect(isActionPending(locked)).toBe(true);
    expect(isActionPending(resolving)).toBe(true);
    expect(isActionPending(createReadyState())).toBe(false);
  });

  it('expires stale intents and makes them safe to rebuild rather than replay', () => {
    const committing = beginCommit(
      beginValidation(createReadyState({ entryAmount: '10' })),
      'stale-1',
      createdAt,
      '2026-08-16T00:00:15.000Z',
    );

    expect(isIntentExpired(committing, '2026-08-16T00:00:14.999Z')).toBe(false);
    expect(isIntentExpired(committing, '2026-08-16T00:00:15.000Z')).toBe(true);

    const expired = failExpiredIntent(committing);
    expect(canBlindRetry(expired)).toBe(true);
    expect(expired.code).toBe('intent-expired');
    expect(expired.wagerCreated).toBe(false);
  });

  it('allows blind retry only when authoritative state says no wager/funds moved', () => {
    const draft = createReadyState({ entryAmount: '10' }).draft;
    const rejected = failBeforeSubmission(draft, 'signature-rejected', 'User rejected signature');
    expect(canBlindRetry(rejected)).toBe(true);
    expect(fundsStateLabel(rejected)).toContain('No funds moved');

    const unknown = failUnknownSubmission(commitReady('unknown-1'), 'RPC timed out after send');
    expect(canBlindRetry(unknown)).toBe(false);
    expect(fundsStateLabel(unknown)).toContain('not yet known');
  });

  it('never offers blind retry after a wager is known to exist', () => {
    const locked = lockWager(commitReady('locked-1'), {
      roundId: 'r3',
      submittedAt: createdAt,
      wagerAmount: '25',
    });
    const delayed = failAfterLock(locked, 'rng-delayed', 'Randomness provider is delayed');

    expect(canBlindRetry(delayed)).toBe(false);
    expect(delayed.wagerCreated).toBe(true);
    expect(fundsStateLabel(delayed)).toContain('Do not submit a replacement');
  });

  it('requires canonical request id and timestamp before commit', () => {
    const validating = beginValidation(createReadyState());
    expect(() => beginCommit(validating, '   ', createdAt)).toThrow('requestId is required');
    expect(() => beginCommit(validating, 'req', '   ')).toThrow('createdAt is required');
  });

  it('rejects a corrupted direct-GAS player entry before intent creation', () => {
    const corrupted = {
      phase: 'ready',
      draft: { mode: 'BOOST', entryAsset: 'GAS', entryAmount: '25' },
    } as unknown as Parameters<typeof beginValidation>[0];

    expect(() => beginValidation(corrupted)).toThrow('player entry must use USDC');
  });

  it('rejects missing internal GAS credit and any non-GAS payout', () => {
    const committing = commitReady('asset-firewall');
    expect(() => lockWager(committing, {
      roundId: 'asset-firewall-round',
      submittedAt: createdAt,
      wagerAmount: '0',
    })).toThrow('GAS wager amount must be greater than zero');
    expect(() => lockWager(committing, {
      roundId: 'asset-firewall-round',
      submittedAt: createdAt,
      wagerAmount: 'Infinity',
    })).toThrow('GAS wager amount must be greater than zero');

    const locked = lockWager(committing, {
      roundId: 'asset-firewall-round',
      submittedAt: createdAt,
      wagerAmount: '25',
    });
    const invalidPayout = {
      outcome: 'win',
      multiplier: '2',
      payoutAmount: '50',
      payoutAsset: 'USDC',
      settledAt: createdAt,
      verificationHref: '/round/asset-firewall-round',
    } as unknown as Parameters<typeof resolveRound>[1];

    expect(() => resolveRound(beginResolution(locked), invalidPayout)).toThrow('payout asset must be GAS');
  });
});
