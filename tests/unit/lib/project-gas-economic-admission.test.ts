import { describe, expect, it } from 'vitest';
import { admitBankrollWager, admitReserveIgnition, admitRouterIntent } from '../../../lib/project-gas/economic-admission';

describe('Project GAS economic admission firewalls', () => {
  const now = 1_000_000;
  it('binds one router fee to one live intent and reconciles uncertain execution', () => {
    const intent = { intentId: 'intent-1', status: 'created' as const, quoteId: 'quote-1', quoteExpiresAtMs: now + 1,
      feePolicyVersion: 'bootstrap-2026-08-26', canonicalFeeAlreadyCharged: false, route: 'internal-amm' as const,
      purpose: 'trade' as const, paused: false };
    expect(admitRouterIntent(intent, now).decision).toBe('admit');
    expect(admitRouterIntent({ ...intent, status: 'unknown' }, now).decision).toBe('reconcile');
    expect(admitRouterIntent({ ...intent, canonicalFeeAlreadyCharged: true }, now).decision).toBe('reject');
    expect(admitRouterIntent(intent, now + 1).decision).toBe('reject');
  });

  it('keeps referral conversion away from every external route', () => {
    const input = { intentId: 'claim-1', status: 'created' as const, quoteId: 'quote-1', quoteExpiresAtMs: now + 1,
      feePolicyVersion: 'bootstrap-2026-08-26', canonicalFeeAlreadyCharged: false, route: 'aerodrome' as const,
      purpose: 'referral-conversion' as const, paused: false };
    expect(admitRouterIntent(input, now).decision).toBe('reject');
  });

  it('admits Reserve Ignition only after atomic consideration and excess demand', () => {
    const ignition = { intentId: 'mint-1', considerationAssetApproved: true, considerationReceivedAtomically: true,
      excessDemandVerified: true, naturalEquivalentLiquidityAvailable: false, oracleHealthy: true, reserveHealthy: true,
      conditionsAsOfMs: now, conditionsValidUntilMs: now + 1, requestedShares: 10n, remainingEpochShares: 10n,
      remainingTotalShares: 100n, paused: false };
    expect(admitReserveIgnition(ignition, now).decision).toBe('admit');
    expect(admitReserveIgnition({ ...ignition, considerationReceivedAtomically: false }, now).decision).toBe('reject');
    expect(admitReserveIgnition({ ...ignition, naturalEquivalentLiquidityAvailable: true }, now).decision).toBe('reject');
    expect(admitReserveIgnition({ ...ignition, requestedShares: 11n }, now).decision).toBe('reject');
  });

  it('reserves worst-case pending and correlated GameBankroll exposure once', () => {
    const wager = { intentId: 'wager-1', availableLiquidGas: 1_000n, existingReservedLiabilityGas: 300n,
      correlatedExposureGas: 200n, wagerWorstCaseLiabilityGas: 400n, approvedLiabilityLimitGas: 900n,
      authoritativeSourcingReady: true, paused: false, intentAlreadyReserved: false };
    expect(admitBankrollWager(wager).decision).toBe('admit');
    expect(admitBankrollWager({ ...wager, wagerWorstCaseLiabilityGas: 401n }).decision).toBe('reject');
    expect(admitBankrollWager({ ...wager, intentAlreadyReserved: true }).decision).toBe('reconcile');
    expect(admitBankrollWager({ ...wager, authoritativeSourcingReady: false }).decision).toBe('reject');
  });
});
