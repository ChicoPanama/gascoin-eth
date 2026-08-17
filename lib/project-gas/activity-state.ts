import type {
  AssetAmount,
  LiveEvent,
  LiveEventAuthority,
  LiveEventConfirmation,
  LiveEventKind,
  LiveFeedSnapshot,
  LiveIdentity,
} from './live-events';

export type ActivityProjectionStatus = 'ready' | 'stale' | 'degraded' | 'unavailable';

export interface ProjectGasActivitySnapshot extends LiveFeedSnapshot {
  version: 1;
  status: ActivityProjectionStatus;
  authority: 'protocol-indexer' | 'unavailable';
  source?: string;
  message?: string;
}

const EVENT_KINDS = new Set<LiveEventKind>(['game-result', 'trade', 'rebase', 'reserve', 'crew-milestone']);
const AUTHORITIES = new Set<LiveEventAuthority>(['onchain', 'protocol-indexer', 'user-content']);
const CONFIRMATIONS = new Set<LiveEventConfirmation>(['pending', 'confirmed', 'settled', 'failed', 'reconciled']);
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function iso(value: unknown): string | undefined {
  const candidate = nonEmpty(value);
  if (!candidate || Number.isNaN(Date.parse(candidate))) return undefined;
  return new Date(candidate).toISOString();
}

function decimal(value: unknown): string | undefined {
  const candidate = nonEmpty(value);
  return candidate && DECIMAL_PATTERN.test(candidate) ? candidate : undefined;
}

function address(value: unknown): `0x${string}` | undefined {
  const candidate = nonEmpty(value);
  return candidate && /^0x[0-9a-fA-F]+$/.test(candidate) ? candidate as `0x${string}` : undefined;
}

function parseIdentity(raw: unknown): LiveIdentity | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const identity: LiveIdentity = {
    profileId: nonEmpty(record.profileId),
    handle: nonEmpty(record.handle),
    displayName: nonEmpty(record.displayName),
    avatarUrl: nonEmpty(record.avatarUrl),
    wallet: address(record.wallet),
    crewId: nonEmpty(record.crewId),
    crewName: nonEmpty(record.crewName),
  };
  return Object.values(identity).some(Boolean) ? identity : undefined;
}

function parseAmount(raw: unknown): AssetAmount | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const asset = nonEmpty(record.asset);
  const amount = decimal(record.amount);
  if (!asset || !amount) return undefined;

  return {
    asset,
    amount,
    decimals: typeof record.decimals === 'number' && Number.isInteger(record.decimals) ? record.decimals : undefined,
    amountUsd: decimal(record.amountUsd),
  };
}

function parseBase(raw: Record<string, unknown>) {
  const id = nonEmpty(raw.id);
  const kind = nonEmpty(raw.kind) as LiveEventKind | undefined;
  const occurredAt = iso(raw.occurredAt);
  const authority = nonEmpty(raw.authority) as LiveEventAuthority | undefined;
  const confirmation = nonEmpty(raw.confirmation) as LiveEventConfirmation | undefined;

  if (!id || !kind || !EVENT_KINDS.has(kind) || !occurredAt || !authority || !AUTHORITIES.has(authority) || !confirmation || !CONFIRMATIONS.has(confirmation)) {
    return undefined;
  }

  const commentary = raw.commentary && typeof raw.commentary === 'object'
    ? {
        body: nonEmpty((raw.commentary as Record<string, unknown>).body),
        authoredAt: iso((raw.commentary as Record<string, unknown>).authoredAt),
      }
    : undefined;

  return {
    id,
    kind,
    occurredAt,
    authority,
    confirmation,
    identity: parseIdentity(raw.identity),
    commentary: commentary?.body && commentary.authoredAt
      ? { body: commentary.body, authoredAt: commentary.authoredAt }
      : undefined,
    txHash: address(raw.txHash),
    blockNumber: nonEmpty(raw.blockNumber),
  };
}

export function parseLiveEvent(raw: unknown): LiveEvent | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const base = parseBase(record);
  if (!base) return undefined;

  if (base.kind === 'game-result') {
    const wager = parseAmount(record.wager);
    const payout = parseAmount(record.payout);
    const roundId = nonEmpty(record.roundId);
    const game = nonEmpty(record.game);
    const outcome = nonEmpty(record.outcome);
    const multiplier = decimal(record.multiplier);
    const verificationHref = nonEmpty(record.verificationHref);
    if (!wager || !payout || !roundId || (game !== 'gas-original' && game !== 'roulette') || !multiplier || (outcome !== 'win' && outcome !== 'loss' && outcome !== 'push') || !verificationHref) return undefined;
    if (base.authority === 'user-content') return undefined;
    return {
      ...base,
      kind: 'game-result',
      authority: base.authority,
      roundId,
      game,
      mode: record.mode === 'CRUISE' || record.mode === 'BOOST' || record.mode === 'REDLINE' ? record.mode : undefined,
      wager,
      payout,
      multiplier,
      outcome,
      verificationHref,
    };
  }

  if (base.kind === 'trade') {
    const pay = parseAmount(record.pay);
    const receive = parseAmount(record.receive);
    const side = nonEmpty(record.side);
    if (!pay || !receive || (side !== 'buy' && side !== 'sell') || base.authority === 'user-content') return undefined;
    return { ...base, kind: 'trade', authority: base.authority, side, pay, receive, quoteId: nonEmpty(record.quoteId) };
  }

  if (base.kind === 'rebase') {
    const direction = nonEmpty(record.direction);
    const percent = decimal(record.percent);
    const indexBefore = decimal(record.indexBefore);
    const indexAfter = decimal(record.indexAfter);
    if ((direction !== 'positive' && direction !== 'negative' && direction !== 'neutral') || !percent || !indexBefore || !indexAfter || base.authority === 'user-content') return undefined;
    return { ...base, kind: 'rebase', authority: base.authority, direction, percent, indexBefore, indexAfter, backingRatio: decimal(record.backingRatio) };
  }

  if (base.kind === 'reserve') {
    const action = nonEmpty(record.action);
    const asset = parseAmount(record.asset);
    if (!asset || !action || !['deposit', 'withdrawal', 'rebalance', 'valuation-update'].includes(action) || base.authority === 'user-content') return undefined;
    return {
      ...base,
      kind: 'reserve',
      authority: base.authority,
      action: action as 'deposit' | 'withdrawal' | 'rebalance' | 'valuation-update',
      asset,
      adjustedExternalReserveUsd: decimal(record.adjustedExternalReserveUsd),
      backingRatio: decimal(record.backingRatio),
      dataAsOf: iso(record.dataAsOf),
      policyReference: nonEmpty(record.policyReference),
    };
  }

  const crewId = nonEmpty(record.crewId);
  const crewName = nonEmpty(record.crewName);
  const milestone = nonEmpty(record.milestone);
  const value = nonEmpty(record.value);
  if (!crewId || !crewName || !value || !milestone || !['rank-change', 'ignitions', 'biggest-hit', 'streak', 'member-count'].includes(milestone) || base.authority !== 'protocol-indexer') return undefined;
  return {
    ...base,
    kind: 'crew-milestone',
    authority: 'protocol-indexer',
    crewId,
    crewName,
    milestone: milestone as 'rank-change' | 'ignitions' | 'biggest-hit' | 'streak' | 'member-count',
    value,
    previousValue: nonEmpty(record.previousValue),
    supportingRoundId: nonEmpty(record.supportingRoundId),
  };
}

export function unavailableActivitySnapshot(message: string): ProjectGasActivitySnapshot {
  return {
    version: 1,
    status: 'unavailable',
    authority: 'unavailable',
    health: 'offline',
    events: [],
    message,
    reason: message,
  };
}

export function parseProjectGasActivitySnapshot(
  raw: unknown,
  nowMs = Date.now(),
  staleAfterMs = 60_000,
): ProjectGasActivitySnapshot {
  if (!raw || typeof raw !== 'object') return unavailableActivitySnapshot('Canonical activity response is invalid.');
  const record = raw as Record<string, unknown>;
  const source = nonEmpty(record.source);
  const lastIndexedAt = iso(record.lastIndexedAt);
  if (!source || !lastIndexedAt || !Array.isArray(record.events)) {
    return unavailableActivitySnapshot('Canonical activity source metadata is incomplete.');
  }

  const events = record.events.map(parseLiveEvent).filter((event): event is LiveEvent => Boolean(event));
  const rejectedCount = record.events.length - events.length;
  const stale = Math.max(0, nowMs - Date.parse(lastIndexedAt)) > staleAfterMs;

  return {
    version: 1,
    status: rejectedCount > 0 ? 'degraded' : stale ? 'stale' : 'ready',
    authority: 'protocol-indexer',
    source,
    health: rejectedCount > 0 ? 'degraded' : stale ? 'degraded' : 'live',
    events,
    lastIndexedAt,
    message: rejectedCount > 0
      ? `${rejectedCount} activity event(s) were rejected because their canonical shape was invalid.`
      : stale
        ? 'Activity index is outside the approved freshness window.'
        : undefined,
  };
}

export function canonicalActivityHref(event: LiveEvent): string {
  return `/activity/${encodeURIComponent(event.id)}`;
}
