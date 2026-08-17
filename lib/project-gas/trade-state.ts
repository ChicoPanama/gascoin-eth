export type TradeSide = 'buy' | 'sell';
export type TradeAsset = 'GAS' | 'USDC';
export type TradeQuoteStatus = 'ready' | 'stale' | 'expired' | 'degraded' | 'unavailable';

export interface TradeAmount {
  asset: TradeAsset;
  amount: string;
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
  feeBps?: number;
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
  feeBps?: unknown;
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
  const minimumReceived = parseAmount(raw.minimumReceived);
  const feeBps = bps(raw.feeBps);
  const priceImpactBps = bps(raw.priceImpactBps);

  if (
    !quoteId || !source || !quotedAt || !expiresAt
    || (side !== 'buy' && side !== 'sell')
    || !pay || !receive || !fee || !minimumReceived
    || feeBps === undefined || priceImpactBps === undefined
  ) {
    return unavailableTradeQuote('Canonical trade quote fields are incomplete or invalid.');
  }

  if (pay.asset === receive.asset || minimumReceived.asset !== receive.asset) {
    return unavailableTradeQuote('Trade quote asset relationships are invalid.');
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
