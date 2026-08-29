import {
  PROJECT_GAS_BOOTSTRAP_FEE_POLICY,
  allocateMarketFee,
  feeAmountMatchesPolicy,
  marketFeeBps,
} from './fee-policy';

export type TradeSide = 'buy' | 'sell';
export type TradeAsset = 'GAS' | 'USDC';
export type TradeQuoteStatus = 'ready' | 'stale' | 'expired' | 'degraded' | 'unavailable';

export interface TradeAmount {
  asset: TradeAsset;
  amount: string;
}
export interface TradeFeeAllocation {
  reserveVault: TradeAmount;
  growthLiquidity: TradeAmount;
  distributionReferralGrowth: TradeAmount;
  teamOperations: TradeAmount;
  defense: TradeAmount;
}

export interface ProjectGasTradeQuote {
  version: 1;
  status: TradeQuoteStatus;
  authority: 'quote-provider' | 'unavailable';
  quoteId?: string;
  side?: TradeSide;
  pay?: TradeAmount;
  receive?: TradeAmount;
  fee?: TradeAmount;
  feeAllocation?: TradeFeeAllocation;
  feeBps?: number;
  feePolicyVersion?: string;
  pressureFeeBps?: number;
  pressureSource?: string;
  pressureObservedAt?: string;
  pressureValidUntil?: string;
  minimumReceived?: TradeAmount;
  priceImpactBps?: number;
  quotedAt?: string;
  expiresAt?: string;
  source?: string;
  message?: string;
}

export interface RawProjectGasTradeQuote {
  version?: unknown;
  quoteId?: unknown;
  side?: unknown;
  pay?: unknown;
  receive?: unknown;
  fee?: unknown;
  feeAllocation?: unknown;
  feeBps?: unknown;
  feePolicyVersion?: unknown;
  pressureFeeBps?: unknown;
  pressureSource?: unknown;
  pressureObservedAt?: unknown;
  pressureValidUntil?: unknown;
  minimumReceived?: unknown;
  priceImpactBps?: unknown;
  quotedAt?: unknown;
  expiresAt?: unknown;
  source?: unknown;
}

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const ASSETS = new Set<TradeAsset>(['GAS', 'USDC']);

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function decimal(value: unknown): string | undefined {
  const candidate = nonEmpty(value);
  return candidate && DECIMAL_PATTERN.test(candidate) ? candidate : undefined;
}

function iso(value: unknown): string | undefined {
  const candidate = nonEmpty(value);
  if (!candidate || Number.isNaN(Date.parse(candidate))) return undefined;
  return new Date(candidate).toISOString();
}

function bps(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000
    ? value
    : undefined;
}

function parseAmount(raw: unknown): TradeAmount | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const asset = nonEmpty(record.asset) as TradeAsset | undefined;
  const amount = decimal(record.amount);
  if (!asset || !ASSETS.has(asset) || !amount) return undefined;
  return { asset, amount };
}

function parseFeeAllocation(raw: unknown, asset: TradeAsset | undefined): TradeFeeAllocation | undefined {
  if (!raw || typeof raw !== 'object' || !asset) return undefined;
  const record = raw as Record<string, unknown>;
  const allocation = {
    reserveVault: parseAmount(record.reserveVault),
    growthLiquidity: parseAmount(record.growthLiquidity),
    distributionReferralGrowth: parseAmount(record.distributionReferralGrowth),
    teamOperations: parseAmount(record.teamOperations),
    defense: parseAmount(record.defense),
  };
  if (Object.values(allocation).some((amount) => !amount || amount.asset !== asset)) return undefined;
  return allocation as TradeFeeAllocation;
}

function decimalSumMatches(values: readonly string[], expected: string): boolean {
  const all = [...values, expected];
  const fractions = all.map((value) => value.split('.')[1]?.length ?? 0);
  const scale = Math.max(...fractions);
  if (scale > 36) return false;
  const units = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
  };
  return values.reduce((sum, value) => sum + units(value), 0n) === units(expected);
}

function allocationMatchesPolicy(
  payAmount: string,
  allocation: TradeFeeAllocation,
  side: TradeSide,
  pressureFeeBps: number,
): boolean {
  const values = [payAmount, ...Object.values(allocation).map((item) => item.amount)];
  const scale = Math.max(...values.map((value) => value.split('.')[1]?.length ?? 0));
  if (scale > 36) return false;
  const units = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
  };
  const expected = allocateMarketFee(units(payAmount), side, pressureFeeBps);
  return Object.entries(expected).every(([bucket, amount]) => units(allocation[bucket as keyof TradeFeeAllocation].amount) === amount);
}

export function unavailableTradeQuote(message: string): ProjectGasTradeQuote {
  return {
    version: 1,
    status: 'unavailable',
    authority: 'unavailable',
    message,
  };
}

export function parseProjectGasTradeQuote(
  raw: RawProjectGasTradeQuote,
  nowMs = Date.now(),
  staleAfterMs = 15_000,
): ProjectGasTradeQuote {
  const quoteId = nonEmpty(raw.quoteId);
  const source = nonEmpty(raw.source);
  const quotedAt = iso(raw.quotedAt);
  const expiresAt = iso(raw.expiresAt);
  const side = nonEmpty(raw.side) as TradeSide | undefined;
  const pay = parseAmount(raw.pay);
  const receive = parseAmount(raw.receive);
  const fee = parseAmount(raw.fee);
  const feeAllocation = parseFeeAllocation(raw.feeAllocation, fee?.asset);
  const minimumReceived = parseAmount(raw.minimumReceived);
  const feeBps = bps(raw.feeBps);
  const feePolicyVersion = nonEmpty(raw.feePolicyVersion);
  const pressureFeeBps = bps(raw.pressureFeeBps);
  const pressureSource = nonEmpty(raw.pressureSource);
  const pressureObservedAt = iso(raw.pressureObservedAt);
  const pressureValidUntil = iso(raw.pressureValidUntil);
  const priceImpactBps = bps(raw.priceImpactBps);

  if (
    !quoteId || !source || !quotedAt || !expiresAt
    || (side !== 'buy' && side !== 'sell')
    || !pay || !receive || !fee || !feeAllocation || !minimumReceived
    || feeBps === undefined || priceImpactBps === undefined
    || feePolicyVersion !== PROJECT_GAS_BOOTSTRAP_FEE_POLICY.version
  ) {
    return unavailableTradeQuote('Canonical trade quote fields are incomplete or invalid.');
  }

  if (pay.asset === receive.asset || minimumReceived.asset !== receive.asset || fee.asset !== pay.asset) {
    return unavailableTradeQuote('Trade quote asset relationships are invalid.');
  }

  const boundPressureFeeBps = side === 'sell' ? (pressureFeeBps ?? -1) : 0;
  if (
    (side === 'buy' && pressureFeeBps !== 0)
    || (side === 'sell' && (
      pressureFeeBps === undefined || !pressureSource || !pressureObservedAt || !pressureValidUntil
      || nowMs < Date.parse(pressureObservedAt) || nowMs - Date.parse(pressureObservedAt) > staleAfterMs
      || nowMs >= Date.parse(pressureValidUntil) || Date.parse(pressureValidUntil) < Date.parse(expiresAt)
    ))
  ) {
    return unavailableTradeQuote('Trade quote pressure evidence is incomplete, expired, or not quote-bound.');
  }
  let expectedFeeBps: number;
  try {
    expectedFeeBps = marketFeeBps(side, boundPressureFeeBps);
  } catch {
    return unavailableTradeQuote('Trade quote fee is outside the canonical bootstrap policy.');
  }
  if (feeBps !== expectedFeeBps) {
    return unavailableTradeQuote('Trade quote fee does not match the canonical bootstrap policy.');
  }
  if (!feeAmountMatchesPolicy(pay.amount, fee.amount, feeBps)) {
    return unavailableTradeQuote('Trade quote fee amount does not match its canonical fee rate.');
  }
  if (!decimalSumMatches(Object.values(feeAllocation).map((item) => item.amount), fee.amount)) {
    return unavailableTradeQuote('Trade quote fee allocation does not conserve the authoritative fee amount.');
  }
  if (!allocationMatchesPolicy(pay.amount, feeAllocation, side, boundPressureFeeBps)) {
    return unavailableTradeQuote('Trade quote fee allocation does not match the canonical reserve-first policy.');
  }

  const expiresAtMs = Date.parse(expiresAt);
  const quotedAtMs = Date.parse(quotedAt);

  if (nowMs >= expiresAtMs) {
    return {
      version: 1,
      status: 'expired',
      authority: 'quote-provider',
      quoteId,
      side,
      pay,
      receive,
      fee,
      feeBps,
      feeAllocation,
      feePolicyVersion,
      pressureFeeBps: boundPressureFeeBps,
      pressureSource,
      pressureObservedAt,
      pressureValidUntil,
      minimumReceived,
      priceImpactBps,
      quotedAt,
      expiresAt,
      source,
      message: 'Quote expired. Request a new quote before any confirmation.',
    };
  }

  const stale = Math.max(0, nowMs - quotedAtMs) > staleAfterMs;
  return {
    version: 1,
    status: stale ? 'stale' : 'ready',
    authority: 'quote-provider',
    quoteId,
    side,
    pay,
    receive,
    fee,
    feeBps,
    feeAllocation,
    feePolicyVersion,
    pressureFeeBps: boundPressureFeeBps,
    pressureSource,
    pressureObservedAt,
    pressureValidUntil,
    minimumReceived,
    priceImpactBps,
    quotedAt,
    expiresAt,
    source,
    message: stale ? 'Quote is older than the preferred freshness window. Refresh before acting.' : undefined,
  };
}

export function validTradeInputAmount(value: string): boolean {
  const amount = decimal(value);
  if (!amount) return false;
  return Number(amount) > 0;
}
