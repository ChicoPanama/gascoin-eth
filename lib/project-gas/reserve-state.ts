export type ReserveReadStatus = 'ready' | 'stale' | 'degraded' | 'unavailable';
export type ReserveAuthority = 'contract' | 'oracle-indexer' | 'attestation' | 'unavailable';
export type ReserveComponentClass = 'liquidity' | 'income' | 'growth' | 'insurance' | 'other';

export interface ReserveComponent {
  id: string;
  symbol: string;
  label: string;
  class: ReserveComponentClass;
  grossUsd: string;
  haircutBps: number;
  adjustedUsd: string;
  countsAsBacking: true;
  source: string;
  sourceAsOf: string;
}

export interface ReserveExclusion {
  id:
    | 'gas'
    | 'wgas'
    | 'self-pol'
    | 'protocol-liquidity'
    | 'game-bankroll'
    | 'referral-reward-pool'
    | 'bracket-collateral'
    | 'other';
  label: string;
  reason: string;
}

export interface RebaseReadState {
  status: 'scheduled' | 'completed' | 'unavailable';
  direction?: 'positive' | 'negative' | 'neutral';
  percent?: string;
  indexBefore?: string;
  indexAfter?: string;
  effectiveAt?: string;
  completedAt?: string;
  rebaseId?: string;
}

export interface ProjectGasReserveSnapshot {
  version: 1;
  status: ReserveReadStatus;
  authority: ReserveAuthority;
  dataAsOf?: string;
  source?: string;
  circulationGas?: string;
  gasIndex?: string;
  adjustedExternalReserveUsd?: string;
  requiredPegReserveUsd?: string;
  insuranceBufferUsd?: string;
  liquidityFloorUsd?: string;
  excessBackingUsd?: string;
  backingRatio?: string;
  components: ReserveComponent[];
  exclusions: ReserveExclusion[];
  rebase: RebaseReadState;
  message?: string;
}

export interface RawReserveComponent {
  id?: unknown;
  symbol?: unknown;
  label?: unknown;
  class?: unknown;
  grossUsd?: unknown;
  haircutBps?: unknown;
  adjustedUsd?: unknown;
  source?: unknown;
  sourceAsOf?: unknown;
}

export interface RawProjectGasReserveSnapshot {
  version?: unknown;
  status?: unknown;
  authority?: unknown;
  dataAsOf?: unknown;
  source?: unknown;
  circulationGas?: unknown;
  gasIndex?: unknown;
  adjustedExternalReserveUsd?: unknown;
  requiredPegReserveUsd?: unknown;
  insuranceBufferUsd?: unknown;
  liquidityFloorUsd?: unknown;
  excessBackingUsd?: unknown;
  backingRatio?: unknown;
  components?: unknown;
  rebase?: unknown;
}

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T/;
const COMPONENT_CLASSES = new Set<ReserveComponentClass>(['liquidity', 'income', 'growth', 'insurance', 'other']);
const AUTHORITIES = new Set<ReserveAuthority>(['contract', 'oracle-indexer', 'attestation']);

export const PROJECT_GAS_RESERVE_EXCLUSIONS: ReserveExclusion[] = [
  {
    id: 'gas',
    label: 'GAS',
    reason: 'The protocol cannot count its own monetary liability as external backing.',
  },
  {
    id: 'wgas',
    label: 'wGAS',
    reason: 'wGAS is a wrapper/share claim on GAS, not an exogenous reserve asset.',
  },
  {
    id: 'self-pol',
    label: 'Self-issued POL value',
    reason: 'The GAS side of protocol-owned liquidity is endogenous and excluded from backing.',
  },
  {
    id: 'protocol-liquidity',
    label: 'Protocol-owned liquidity',
    reason: 'Protocol liquidity is a separate accounting domain; only approved external reserve assets may count as GAS backing.',
  },
  {
    id: 'game-bankroll',
    label: 'GameBankroll',
    reason: 'Game solvency is a separate accounting domain and cannot be presented as monetary backing.',
  },
  {
    id: 'referral-reward-pool',
    label: 'Referral Reward Pool',
    reason: 'USDC encumbered for referral liabilities and GAS held for referral conversion are acquisition capital, not monetary backing.',
  },
  {
    id: 'bracket-collateral',
    label: 'Bracket collateral',
    reason: 'Future Bracket collateral and settlement remain separately solvent and are not GAS reserve backing.',
  },
];

function decimal(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return DECIMAL_PATTERN.test(trimmed) ? trimmed : undefined;
}

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function iso(value: unknown): string | undefined {
  const candidate = nonEmpty(value);
  if (!candidate || !ISO_PATTERN.test(candidate) || Number.isNaN(Date.parse(candidate))) return undefined;
  return new Date(candidate).toISOString();
}

function parseComponent(raw: RawReserveComponent): ReserveComponent | undefined {
  const id = nonEmpty(raw.id);
  const symbol = nonEmpty(raw.symbol);
  const label = nonEmpty(raw.label);
  const className = nonEmpty(raw.class) as ReserveComponentClass | undefined;
  const grossUsd = decimal(raw.grossUsd);
  const adjustedUsd = decimal(raw.adjustedUsd);
  const source = nonEmpty(raw.source);
  const sourceAsOf = iso(raw.sourceAsOf);
  const haircutBps = typeof raw.haircutBps === 'number' && Number.isInteger(raw.haircutBps)
    ? raw.haircutBps
    : undefined;

  if (
    !id || !symbol || !label || !className || !COMPONENT_CLASSES.has(className)
    || !grossUsd || !adjustedUsd || !source || !sourceAsOf
    || haircutBps === undefined || haircutBps < 0 || haircutBps > 10_000
  ) {
    return undefined;
  }

  return {
    id,
    symbol,
    label,
    class: className,
    grossUsd,
    haircutBps,
    adjustedUsd,
    countsAsBacking: true,
    source,
    sourceAsOf,
  };
}

function parseRebase(raw: unknown): RebaseReadState {
  if (!raw || typeof raw !== 'object') return { status: 'unavailable' };
  const record = raw as Record<string, unknown>;
  const status = nonEmpty(record.status);
  if (status !== 'scheduled' && status !== 'completed') return { status: 'unavailable' };

  const direction = nonEmpty(record.direction);
  const validDirection = direction === 'positive' || direction === 'negative' || direction === 'neutral'
    ? direction
    : undefined;

  return {
    status,
    direction: validDirection,
    percent: decimal(record.percent),
    indexBefore: decimal(record.indexBefore),
    indexAfter: decimal(record.indexAfter),
    effectiveAt: iso(record.effectiveAt),
    completedAt: iso(record.completedAt),
    rebaseId: nonEmpty(record.rebaseId),
  };
}

export function unavailableReserveSnapshot(message: string): ProjectGasReserveSnapshot {
  return {
    version: 1,
    status: 'unavailable',
    authority: 'unavailable',
    components: [],
    exclusions: PROJECT_GAS_RESERVE_EXCLUSIONS,
    rebase: { status: 'unavailable' },
    message,
  };
}

export function parseProjectGasReserveSnapshot(
  raw: RawProjectGasReserveSnapshot,
  nowMs = Date.now(),
  staleAfterMs = 60_000,
): ProjectGasReserveSnapshot {
  const authority = nonEmpty(raw.authority) as ReserveAuthority | undefined;
  const dataAsOf = iso(raw.dataAsOf);
  const source = nonEmpty(raw.source);
  const components = Array.isArray(raw.components)
    ? raw.components.map((component) => parseComponent(component as RawReserveComponent)).filter((component): component is ReserveComponent => Boolean(component))
    : [];

  if (!authority || !AUTHORITIES.has(authority) || !dataAsOf || !source) {
    return unavailableReserveSnapshot('Canonical reserve authority/source metadata is incomplete.');
  }

  const adjustedExternalReserveUsd = decimal(raw.adjustedExternalReserveUsd);
  const requiredPegReserveUsd = decimal(raw.requiredPegReserveUsd);
  const backingRatio = decimal(raw.backingRatio);

  if (!adjustedExternalReserveUsd || !requiredPegReserveUsd || !backingRatio) {
    return {
      ...unavailableReserveSnapshot('Canonical reserve totals are incomplete.'),
      status: 'degraded',
      authority,
      dataAsOf,
      source,
      components,
    };
  }

  const ageMs = Math.max(0, nowMs - Date.parse(dataAsOf));
  const stale = ageMs > staleAfterMs;

  return {
    version: 1,
    status: stale ? 'stale' : 'ready',
    authority,
    dataAsOf,
    source,
    circulationGas: decimal(raw.circulationGas),
    gasIndex: decimal(raw.gasIndex),
    adjustedExternalReserveUsd,
    requiredPegReserveUsd,
    insuranceBufferUsd: decimal(raw.insuranceBufferUsd),
    liquidityFloorUsd: decimal(raw.liquidityFloorUsd),
    excessBackingUsd: decimal(raw.excessBackingUsd),
    backingRatio,
    components,
    exclusions: PROJECT_GAS_RESERVE_EXCLUSIONS,
    rebase: parseRebase(raw.rebase),
    message: stale ? 'Reserve data is older than the approved freshness window.' : undefined,
  };
}

export function reserveCoverageLabel(snapshot: ProjectGasReserveSnapshot): string {
  if ((snapshot.status !== 'ready' && snapshot.status !== 'stale') || !snapshot.backingRatio) return '—';
  return `${snapshot.backingRatio}×`;
}
