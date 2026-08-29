import { describe, expect, it } from 'vitest';
import {
  PROJECT_GAS_BOOTSTRAP_FEE_POLICY,
  allocateMarketFee,
  calculateMarketFee,
  feeAmountMatchesPolicy,
  isMarketFeeExempt,
  marketFeeBps,
  validateSellPressureSnapshot,
} from '../../../lib/project-gas/fee-policy';

describe('Project GAS canonical bootstrap fee policy', () => {
  it('locks 4% buys and bounded 5% to 7% sells', () => {
    expect(calculateMarketFee(10_000n, 'buy')).toBe(400n);
    expect(calculateMarketFee(10_000n, 'sell')).toBe(500n);
    expect(calculateMarketFee(10_000n, 'sell', 100)).toBe(600n);
    expect(calculateMarketFee(10_000n, 'sell', 200)).toBe(700n);
    expect(() => marketFeeBps('sell', 201)).toThrow(/cap/i);
    expect(PROJECT_GAS_BOOTSTRAP_FEE_POLICY.routineBuyBurnBps).toBe(0);
  });

  it('routes a normal sell reserve-first', () => {
    expect(allocateMarketFee(10_000n, 'sell')).toEqual({
      reserveVault: 300n,
      growthLiquidity: 100n,
      distributionReferralGrowth: 0n,
      teamOperations: 50n,
      defense: 50n,
    });
  });

  it('routes pressure only to reserve, defense, and liquidity', () => {
    expect(allocateMarketFee(10_000n, 'sell', 200)).toEqual({
      reserveVault: 450n,
      growthLiquidity: 120n,
      distributionReferralGrowth: 0n,
      teamOperations: 50n,
      defense: 80n,
    });
  });

  it('routes the buy fee without routine burn', () => {
    expect(allocateMarketFee(10_000n, 'buy')).toEqual({
      reserveVault: 200n,
      growthLiquidity: 75n,
      distributionReferralGrowth: 50n,
      teamOperations: 50n,
      defense: 25n,
    });
  });

  it('validates decimal fee disclosures without floating-point coercion', () => {
    expect(feeAmountMatchesPolicy('100', '4', 400)).toBe(true);
    expect(feeAmountMatchesPolicy('0.000001', '0', 400)).toBe(true);
    expect(feeAmountMatchesPolicy('9007199254740993.000001', '360287970189639.720000', 400)).toBe(true);
    expect(feeAmountMatchesPolicy('100', '3.99', 400)).toBe(false);
    expect(feeAmountMatchesPolicy('1e3', '40', 400)).toBe(false);
  });

  it('conserves fees across tiny and very large integer amounts', () => {
    for (const amount of [0n, 1n, 99n, 10_000n, 10n ** 30n]) {
      for (const pressure of [0, 50, 100, 150, 200]) {
        const allocation = allocateMarketFee(amount, 'sell', pressure);
        expect(Object.values(allocation).reduce((sum, value) => sum + value, 0n))
          .toBe(calculateMarketFee(amount, 'sell', pressure));
        expect(allocation.teamOperations).toBe((amount * 50n) / 10_000n);
      }
    }
  });

  it('fails closed on stale, unhealthy, spoofed, or under-evidenced pressure', () => {
    const now = Date.parse('2026-08-26T12:00:00Z');
    const snapshot = {
      source: 'approved-controller',
      observedAtMs: now - 1_000,
      validUntilMs: now + 10_000,
      pressureFeeBps: 100,
      oracleHealthy: true,
      reserveHealthy: true,
      signals: ['sustained-net-sell-flow', 'twap-premium', 'liquidity-depth'] as const,
    };
    const authority = { approvedSource: 'approved-controller', minimumSignalCount: 3, maximumAgeMs: 5_000 };
    expect(validateSellPressureSnapshot(snapshot, authority, now)).toBe(100);
    expect(() => validateSellPressureSnapshot({ ...snapshot, source: 'frontend' }, authority, now)).toThrow();
    expect(() => validateSellPressureSnapshot({ ...snapshot, pressureFeeBps: 201 }, authority, now)).toThrow();
    expect(() => validateSellPressureSnapshot({ ...snapshot, oracleHealthy: false }, authority, now)).toThrow();
    expect(() => validateSellPressureSnapshot({ ...snapshot, observedAtMs: now - 5_001 }, authority, now)).toThrow();
    expect(() => validateSellPressureSnapshot({ ...snapshot, signals: ['twap-premium'] }, authority, now)).toThrow();
  });

  it('does not tax non-market movements', () => {
    expect(isMarketFeeExempt('wallet-transfer')).toBe(true);
    expect(isMarketFeeExempt('gas-wrap')).toBe(true);
    expect(isMarketFeeExempt('gas-unwrap')).toBe(true);
    expect(isMarketFeeExempt('internal-accounting')).toBe(true);
    expect(isMarketFeeExempt('wager-lock')).toBe(true);
    expect(isMarketFeeExempt('protocol-settlement')).toBe(true);
  });

  it('stress-checks every approved volume, flow mix, and pressure tier', () => {
    const monthlyVolumes = [1, 5, 10, 25, 50, 100, 250].map((millions) => BigInt(millions) * 100_000_000n);
    const sellMixPercent = [20n, 40n, 50n, 60n, 80n];
    const pressureTiers = [0, 50, 100, 150, 200];

    for (const volume of monthlyVolumes) {
      for (const sellPercent of sellMixPercent) {
        const sellVolume = (volume * sellPercent) / 100n;
        const buyVolume = volume - sellVolume;
        const buy = allocateMarketFee(buyVolume, 'buy');
        for (const pressure of pressureTiers) {
          const sell = allocateMarketFee(sellVolume, 'sell', pressure);
          const captured = Object.values(buy).reduce((sum, value) => sum + value, 0n)
            + Object.values(sell).reduce((sum, value) => sum + value, 0n);
          expect(captured).toBe(
            calculateMarketFee(buyVolume, 'buy') + calculateMarketFee(sellVolume, 'sell', pressure),
          );
          expect(sell.teamOperations).toBe((sellVolume * 50n) / 10_000n);
          expect(buy.reserveVault + sell.reserveVault).toBeGreaterThanOrEqual(0n);
        }
      }
    }
  });
});
