export type ReferralClaimLifecycle =
  | 'earned'
  | 'pending-clearance'
  | 'cleared'
  | 'claimable'
  | 'converting'
  | 'gas-delivered'
  | 'reconciling'
  | 'still-claimable'
  | 'action-required';

export type ReferralClaimRoute =
  | 'internal-gas-router'
  | 'aerodrome'
  | 'uniswap'
  | 'aggregator'
  | 'unavailable';

export interface ReferralClaimPreflightInput {
  claimId: string;
  lifecycle: ReferralClaimLifecycle;
  liabilityUsdc: string;
  /** Total covered obligations, including this claim, before conversion. */
  outstandingLiabilityUsdc: string;
  referralPoolUsdc: string;
  payoutAsset: 'GAS' | 'USDC';
  fundingSource: 'referral-reward-pool' | 'reserve-vault' | 'game-bankroll' | 'protocol-liquidity';
  route: ReferralClaimRoute;
  priceState: 'ready' | 'stale' | 'divergent' | 'unavailable';
  liquidityState: 'sufficient' | 'insufficient' | 'paused' | 'unknown';
  slippageState: 'within-limit' | 'excessive' | 'unknown';
  feePolicy: 'approved-gas-policy' | 'unapproved' | 'missing';
}

export type ReferralClaimPreflightDecision =
  | 'execute-internal'
  | 'pause-claimable'
  | 'reconcile'
  | 'reject'
  | 'already-delivered';

export interface ReferralClaimPreflightResult {
  claimId: string;
  decision: ReferralClaimPreflightDecision;
  reason: string;
}

const USDC_DECIMALS = 6;
const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;
const CLAIM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function parseUsdc(value: string): bigint | undefined {
  const normalized = value.trim();
  if (!DECIMAL_PATTERN.test(normalized)) return undefined;

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > USDC_DECIMALS) return undefined;

  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS)
    + BigInt(fraction.padEnd(USDC_DECIMALS, '0') || '0');
}

function result(
  input: ReferralClaimPreflightInput,
  decision: ReferralClaimPreflightDecision,
  reason: string,
): ReferralClaimPreflightResult {
  return { claimId: input.claimId.trim(), decision, reason };
}

/**
 * Enforces locked payout and firewall laws before a future authoritative claim
 * adapter may move money. It intentionally does not choose or approve D06/D10
 * pricing, liquidity, slippage, fee, oracle, or inventory parameters.
 */
export function preflightReferralClaim(
  input: ReferralClaimPreflightInput,
): ReferralClaimPreflightResult {
  const claimId = input.claimId.trim();
  const liability = parseUsdc(input.liabilityUsdc);
  const outstandingLiability = parseUsdc(input.outstandingLiabilityUsdc);
  const pool = parseUsdc(input.referralPoolUsdc);

  if (!CLAIM_ID_PATTERN.test(claimId) || liability === undefined || liability <= 0n
    || outstandingLiability === undefined || outstandingLiability <= 0n || pool === undefined) {
    return result(input, 'reject', 'Canonical claim identity and exact non-zero USDC accounting are required.');
  }

  if (input.lifecycle === 'gas-delivered') {
    return result(input, 'already-delivered', 'The stable claimId has already reached GAS_DELIVERED.');
  }

  if (input.lifecycle === 'converting' || input.lifecycle === 'reconciling') {
    return result(input, 'reconcile', 'An interrupted or in-flight conversion must reconcile before retry.');
  }

  if (input.payoutAsset !== 'GAS') {
    return result(input, 'reject', 'Referral delivery is GAS-only; no USDC payout path is permitted.');
  }

  if (input.fundingSource !== 'referral-reward-pool') {
    return result(input, 'reject', 'Referral claims may use only segregated Referral Reward Pool USDC.');
  }

  if (input.route !== 'internal-gas-router') {
    if (input.route === 'unavailable') {
      return result(input, 'pause-claimable', 'The internal GAS route is unavailable; the claim remains claimable.');
    }
    return result(input, 'reject', 'External venues and aggregators are prohibited for referral conversion.');
  }

  if (liability > outstandingLiability) {
    return result(input, 'reject', 'The claim exceeds the authoritative outstanding referral liability.');
  }

  if (pool < outstandingLiability) {
    return result(input, 'pause-claimable', 'Segregated USDC assets do not fully cover all outstanding referral liabilities.');
  }

  if (input.lifecycle !== 'claimable' && input.lifecycle !== 'still-claimable') {
    return result(input, 'pause-claimable', 'The claim has not completed clearance and is not claimable.');
  }

  if (input.priceState !== 'ready') {
    return result(input, 'pause-claimable', 'Pricing is stale, divergent, or unavailable.');
  }

  if (input.liquidityState !== 'sufficient') {
    return result(input, 'pause-claimable', 'Internal GAS liquidity is insufficient, paused, or unknown.');
  }

  if (input.slippageState !== 'within-limit') {
    return result(input, 'pause-claimable', 'The approved slippage guard is not satisfied.');
  }

  if (input.feePolicy !== 'approved-gas-policy') {
    return result(input, 'pause-claimable', 'The approved canonical GAS fee policy is not available.');
  }

  return result(input, 'execute-internal', 'The claim may enter the authoritative internal GAS conversion adapter.');
}
