/**
 * Canonical Project GAS bootstrap market-routing policy.
 *
 * Percentages use basis points (10_000 = 100%). This policy applies at the
 * router boundary only. It is deliberately not an ERC-20 transfer tax.
 */
export const PROJECT_GAS_BOOTSTRAP_FEE_POLICY = Object.freeze({
  version: 'bootstrap-2026-08-26',
  buyBaseFeeBps: 400,
  sellBaseFeeBps: 500,
  maxSellPressureFeeBps: 200,
  maxSellFeeBps: 700,
  routineBuyBurnBps: 0,
} as const);

export type FeeBucket =
  | 'reserveVault'
  | 'growthLiquidity'
  | 'distributionReferralGrowth'
  | 'teamOperations'
  | 'defense';

export type FeeAllocation = Readonly<Record<FeeBucket, bigint>>;

export interface SellPressureSnapshot {
  source: string;
  observedAtMs: number;
  validUntilMs: number;
  pressureFeeBps: number;
  oracleHealthy: boolean;
  reserveHealthy: boolean;
  /** Controller evidence categories, never raw frontend calculations. */
  signals: readonly (
    | 'sustained-net-sell-flow'
    | 'twap-premium'
    | 'liquidity-depth'
    | 'volume-quality'
    | 'persistence'
    | 'volatility'
    | 'concentration'
  )[];
}

export interface AuthoritativePressurePolicy {
  approvedSource: string;
  minimumSignalCount: number;
  maximumAgeMs: number;
}

function assertAmount(amount: bigint): void {
  if (amount < 0n) throw new RangeError('Fee amount cannot be negative.');
}

function fee(amount: bigint, bps: number): bigint {
  assertAmount(amount);
  return (amount * BigInt(bps)) / 10_000n;
}

export function validateSellPressureSnapshot(
  snapshot: SellPressureSnapshot,
  authority: AuthoritativePressurePolicy,
  nowMs = Date.now(),
): number {
  const uniqueSignals = new Set(snapshot.signals);
  if (
    snapshot.source !== authority.approvedSource
    || !snapshot.oracleHealthy
    || !snapshot.reserveHealthy
    || snapshot.pressureFeeBps < 0
    || snapshot.pressureFeeBps > PROJECT_GAS_BOOTSTRAP_FEE_POLICY.maxSellPressureFeeBps
    || snapshot.observedAtMs > nowMs
    || nowMs - snapshot.observedAtMs > authority.maximumAgeMs
    || nowMs >= snapshot.validUntilMs
    || uniqueSignals.size < authority.minimumSignalCount
  ) {
    throw new Error('Sell-pressure authority is stale, unhealthy, unapproved, or out of bounds.');
  }
  return snapshot.pressureFeeBps;
}

export function marketFeeBps(side: 'buy' | 'sell', pressureFeeBps = 0): number {
  if (!Number.isInteger(pressureFeeBps) || pressureFeeBps < 0) {
    throw new RangeError('Pressure fee must be a non-negative integer.');
  }
  if (side === 'buy') {
    if (pressureFeeBps !== 0) throw new RangeError('Buy routes cannot carry sell pressure.');
    return PROJECT_GAS_BOOTSTRAP_FEE_POLICY.buyBaseFeeBps;
  }
  if (pressureFeeBps > PROJECT_GAS_BOOTSTRAP_FEE_POLICY.maxSellPressureFeeBps) {
    throw new RangeError('Sell-pressure fee exceeds the bootstrap cap.');
  }
  return PROJECT_GAS_BOOTSTRAP_FEE_POLICY.sellBaseFeeBps + pressureFeeBps;
}

export function calculateMarketFee(amount: bigint, side: 'buy' | 'sell', pressureFeeBps = 0): bigint {
  return fee(amount, marketFeeBps(side, pressureFeeBps));
}

const UNSIGNED_DECIMAL = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/;

/** Validates a displayed fee using the fee amount's own precision and floor rounding. */
export function feeAmountMatchesPolicy(payAmount: string, feeAmount: string, feeBps: number): boolean {
  const payMatch = UNSIGNED_DECIMAL.exec(payAmount);
  const feeMatch = UNSIGNED_DECIMAL.exec(feeAmount);
  if (!payMatch || !feeMatch || !Number.isInteger(feeBps) || feeBps < 0) return false;
  const scale = Math.max(payMatch[1]?.length ?? 0, feeMatch[1]?.length ?? 0);
  if (scale > 36) return false;
  const toUnits = (value: string): bigint => {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
  };
  return toUnits(feeAmount) === (toUnits(payAmount) * BigInt(feeBps)) / 10_000n;
}

function emptyAllocation(): Record<FeeBucket, bigint> {
  return {
    reserveVault: 0n,
    growthLiquidity: 0n,
    distributionReferralGrowth: 0n,
    teamOperations: 0n,
    defense: 0n,
  };
}

/**
 * Allocates the already-calculated fee exactly once. Integer dust is assigned
 * to ReserveVault, preserving both conservation and the reserve-first policy.
 */
export function allocateMarketFee(
  amount: bigint,
  side: 'buy' | 'sell',
  pressureFeeBps = 0,
): FeeAllocation {
  const total = calculateMarketFee(amount, side, pressureFeeBps);
  const result = emptyAllocation();

  if (side === 'buy') {
    result.reserveVault = fee(amount, 200);
    result.growthLiquidity = fee(amount, 75);
    result.distributionReferralGrowth = fee(amount, 50);
    result.teamOperations = fee(amount, 50);
    result.defense = fee(amount, 25);
  } else {
    const pressureFee = fee(amount, pressureFeeBps);
    result.reserveVault = fee(amount, 300) + (pressureFee * 75n) / 100n;
    result.growthLiquidity = fee(amount, 100) + (pressureFee * 10n) / 100n;
    result.teamOperations = fee(amount, 50);
    result.defense = fee(amount, 50) + (pressureFee * 15n) / 100n;
  }

  const allocated = Object.values(result).reduce((sum, value) => sum + value, 0n);
  result.reserveVault += total - allocated;
  return Object.freeze(result);
}

export type FeeExemptMovement =
  | 'wallet-transfer'
  | 'gas-wrap'
  | 'gas-unwrap'
  | 'internal-accounting'
  | 'wager-lock'
  | 'protocol-settlement';

export function isMarketFeeExempt(_movement: FeeExemptMovement): true {
  return true;
}
