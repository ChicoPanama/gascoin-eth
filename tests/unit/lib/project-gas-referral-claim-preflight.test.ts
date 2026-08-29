import { describe, expect, it } from 'vitest';
import {
  preflightReferralClaim,
  type ReferralClaimPreflightInput,
} from '../../../lib/project-gas/referral-claim-preflight';

function claim(overrides: Partial<ReferralClaimPreflightInput> = {}): ReferralClaimPreflightInput {
  return {
    claimId: 'claim-001',
    lifecycle: 'claimable',
    liabilityUsdc: '100.000001',
    outstandingLiabilityUsdc: '100.000001',
    referralPoolUsdc: '100.000001',
    payoutAsset: 'GAS',
    fundingSource: 'referral-reward-pool',
    route: 'internal-gas-router',
    priceState: 'ready',
    liquidityState: 'sufficient',
    slippageState: 'within-limit',
    feePolicy: 'approved-gas-policy',
    ...overrides,
  };
}

describe('Project GAS referral claim preflight', () => {
  it('admits only a fully covered GAS claim through the internal route', () => {
    expect(preflightReferralClaim(claim())).toMatchObject({
      claimId: 'claim-001',
      decision: 'execute-internal',
    });
  });

  it('rejects the prohibited USDC payout path', () => {
    expect(preflightReferralClaim(claim({ payoutAsset: 'USDC' })).decision).toBe('reject');
  });

  it.each(['aerodrome', 'uniswap', 'aggregator'] as const)(
    'rejects external referral conversion through %s',
    (route) => {
      expect(preflightReferralClaim(claim({ route })).decision).toBe('reject');
    },
  );

  it.each(['reserve-vault', 'game-bankroll', 'protocol-liquidity'] as const)(
    'rejects the forbidden funding source %s',
    (fundingSource) => {
      expect(preflightReferralClaim(claim({ fundingSource })).decision).toBe('reject');
    },
  );

  it('pauses without external fallback when the internal route is unavailable', () => {
    expect(preflightReferralClaim(claim({ route: 'unavailable' })).decision).toBe('pause-claimable');
  });

  it('pauses when segregated USDC does not cover the exact liability', () => {
    expect(preflightReferralClaim(claim({ referralPoolUsdc: '100.000000' })).decision).toBe('pause-claimable');
  });

  it('requires the pool to cover every outstanding referral liability, not only this claim', () => {
    const result = preflightReferralClaim(claim({
      liabilityUsdc: '25',
      outstandingLiabilityUsdc: '125',
      referralPoolUsdc: '100',
    }));

    expect(result.decision).toBe('pause-claimable');
    expect(result.reason).toMatch(/all outstanding/i);
  });

  it('rejects a claim amount larger than the authoritative outstanding liability', () => {
    expect(preflightReferralClaim(claim({
      liabilityUsdc: '101',
      outstandingLiabilityUsdc: '100',
      referralPoolUsdc: '200',
    })).decision).toBe('reject');
  });

  it('requires a bounded canonical claim id', () => {
    expect(preflightReferralClaim(claim({ claimId: '../claim' })).decision).toBe('reject');
    expect(preflightReferralClaim(claim({ claimId: `c${'x'.repeat(128)}` })).decision).toBe('reject');
  });

  it.each(['stale', 'divergent', 'unavailable'] as const)(
    'pauses when price state is %s',
    (priceState) => {
      expect(preflightReferralClaim(claim({ priceState })).decision).toBe('pause-claimable');
    },
  );

  it.each(['insufficient', 'paused', 'unknown'] as const)(
    'pauses when liquidity is %s',
    (liquidityState) => {
      expect(preflightReferralClaim(claim({ liquidityState })).decision).toBe('pause-claimable');
    },
  );

  it.each(['excessive', 'unknown'] as const)(
    'pauses when slippage is %s',
    (slippageState) => {
      expect(preflightReferralClaim(claim({ slippageState })).decision).toBe('pause-claimable');
    },
  );

  it.each(['unapproved', 'missing'] as const)(
    'pauses when fee policy is %s',
    (feePolicy) => {
      expect(preflightReferralClaim(claim({ feePolicy })).decision).toBe('pause-claimable');
    },
  );

  it('does not execute an already delivered claim twice', () => {
    expect(preflightReferralClaim(claim({ lifecycle: 'gas-delivered' })).decision).toBe('already-delivered');
  });

  it.each(['converting', 'reconciling'] as const)(
    'reconciles an in-flight or interrupted claim in %s',
    (lifecycle) => {
      expect(preflightReferralClaim(claim({ lifecycle })).decision).toBe('reconcile');
    },
  );

  it('compares large decimal liabilities exactly without floating-point coercion', () => {
    expect(preflightReferralClaim(claim({
      liabilityUsdc: '9007199254740993.000001',
      outstandingLiabilityUsdc: '9007199254740993.000001',
      referralPoolUsdc: '9007199254740993.000001',
    })).decision).toBe('execute-internal');
  });

  it('rejects invalid precision rather than rounding money', () => {
    expect(preflightReferralClaim(claim({ liabilityUsdc: '1.0000001' })).decision).toBe('reject');
  });
});
