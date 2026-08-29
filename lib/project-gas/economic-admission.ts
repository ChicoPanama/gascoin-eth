import { PROJECT_GAS_BOOTSTRAP_FEE_POLICY } from './fee-policy';

export type AdmissionDecision = 'admit' | 'reconcile' | 'pause' | 'reject';
export interface AdmissionResult { decision: AdmissionDecision; reason: string }

export interface RouterIntentAdmission {
  intentId: string;
  status: 'created' | 'executing' | 'unknown' | 'reconciling' | 'settled' | 'failed-retry-safe';
  quoteId: string;
  quoteExpiresAtMs: number;
  feePolicyVersion: string;
  canonicalFeeAlreadyCharged: boolean;
  route: 'opposing-flow' | 'internal-amm' | 'protocol-inventory' | 'reserve-ignition' | 'aerodrome';
  purpose: 'trade' | 'game-entry' | 'referral-conversion' | 'holder-purchase' | 'reserve-ignition';
  paused: boolean;
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function admitRouterIntent(input: RouterIntentAdmission, nowMs = Date.now()): AdmissionResult {
  if (!ID.test(input.intentId) || !ID.test(input.quoteId)) return { decision: 'reject', reason: 'Stable intent and quote identity are required.' };
  if (input.status === 'settled') return { decision: 'reject', reason: 'A settled intent cannot execute twice.' };
  if (input.status === 'executing' || input.status === 'unknown' || input.status === 'reconciling') {
    return { decision: 'reconcile', reason: 'Potential prior execution must reconcile before retry.' };
  }
  if (input.paused) return { decision: 'pause', reason: 'Router execution is paused.' };
  if (nowMs >= input.quoteExpiresAtMs) return { decision: 'reject', reason: 'The bound quote has expired.' };
  if (input.feePolicyVersion !== PROJECT_GAS_BOOTSTRAP_FEE_POLICY.version) {
    return { decision: 'reject', reason: 'The intent is not bound to the current canonical fee policy.' };
  }
  if (input.canonicalFeeAlreadyCharged) return { decision: 'reject', reason: 'The canonical fee was already charged.' };
  if (input.purpose === 'referral-conversion' && input.route !== 'internal-amm' && input.route !== 'protocol-inventory') {
    return { decision: 'reject', reason: 'Referral conversion is internal-only.' };
  }
  return { decision: 'admit', reason: 'Intent may enter the authoritative router executor exactly once.' };
}

export interface ReserveIgnitionAdmission {
  intentId: string;
  considerationAssetApproved: boolean;
  considerationReceivedAtomically: boolean;
  excessDemandVerified: boolean;
  naturalEquivalentLiquidityAvailable: boolean;
  oracleHealthy: boolean;
  reserveHealthy: boolean;
  conditionsAsOfMs: number;
  conditionsValidUntilMs: number;
  requestedShares: bigint;
  remainingEpochShares: bigint;
  remainingTotalShares: bigint;
  paused: boolean;
}

export function admitReserveIgnition(input: ReserveIgnitionAdmission, nowMs = Date.now()): AdmissionResult {
  if (!ID.test(input.intentId) || input.requestedShares <= 0n) return { decision: 'reject', reason: 'A stable intent and positive issuance are required.' };
  if (input.paused) return { decision: 'pause', reason: 'Reserve Ignition is paused.' };
  if (input.conditionsAsOfMs > nowMs || nowMs >= input.conditionsValidUntilMs) return { decision: 'reject', reason: 'Reserve Ignition conditions are stale.' };
  if (!input.oracleHealthy || !input.reserveHealthy) return { decision: 'reject', reason: 'Oracle and reserve health are required.' };
  if (!input.considerationAssetApproved || !input.considerationReceivedAtomically) return { decision: 'reject', reason: 'Approved external consideration must be received atomically.' };
  if (!input.excessDemandVerified || input.naturalEquivalentLiquidityAvailable) return { decision: 'reject', reason: 'Reserve Mint is limited to verified excess demand after equivalent natural liquidity.' };
  if (input.requestedShares > input.remainingEpochShares || input.requestedShares > input.remainingTotalShares) {
    return { decision: 'reject', reason: 'Reserve Ignition issuance cap exceeded.' };
  }
  return { decision: 'admit', reason: 'Bounded reserve issuance may settle atomically.' };
}

export interface BankrollAdmission {
  intentId: string;
  availableLiquidGas: bigint;
  existingReservedLiabilityGas: bigint;
  correlatedExposureGas: bigint;
  wagerWorstCaseLiabilityGas: bigint;
  approvedLiabilityLimitGas: bigint;
  authoritativeSourcingReady: boolean;
  paused: boolean;
  intentAlreadyReserved: boolean;
}

export function admitBankrollWager(input: BankrollAdmission): AdmissionResult {
  if (!ID.test(input.intentId) || input.wagerWorstCaseLiabilityGas <= 0n) return { decision: 'reject', reason: 'Stable intent and positive worst-case liability are required.' };
  if (input.intentAlreadyReserved) return { decision: 'reconcile', reason: 'This intent may already reserve liability.' };
  if (input.paused) return { decision: 'pause', reason: 'GameBankroll admission is paused.' };
  const values = [input.availableLiquidGas, input.existingReservedLiabilityGas, input.correlatedExposureGas, input.approvedLiabilityLimitGas];
  if (values.some((value) => value < 0n) || !input.authoritativeSourcingReady) return { decision: 'reject', reason: 'Authoritative non-negative bankroll and sourcing state are required.' };
  const totalLiability = input.existingReservedLiabilityGas + input.correlatedExposureGas + input.wagerWorstCaseLiabilityGas;
  if (totalLiability > input.availableLiquidGas || totalLiability > input.approvedLiabilityLimitGas) {
    return { decision: 'reject', reason: 'Worst-case pending and correlated liability exceeds the approved bankroll boundary.' };
  }
  return { decision: 'admit', reason: 'Worst-case wager liability may be reserved once.' };
}
