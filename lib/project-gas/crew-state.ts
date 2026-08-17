export type CrewReadStatus = 'ready' | 'stale' | 'degraded' | 'unavailable';

export interface CrewRankingRow {
  crewId: string;
  slug: string;
  name: string;
  rank: number;
  score: string;
  members: number;
  ignitions?: string;
  biggestHitGas?: string;
  sourceAsOf: string;
}

export interface ProjectGasCrewSnapshot {
  version: 1;
  status: CrewReadStatus;
  authority: 'protocol-indexer' | 'unavailable';
  source?: string;
  lastIndexedAt?: string;
  rows: CrewRankingRow[];
  rankingFormula?: string;
  message?: string;
}

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

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

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function parseRow(raw: unknown): CrewRankingRow | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const crewId = nonEmpty(record.crewId);
  const slug = nonEmpty(record.slug);
  const name = nonEmpty(record.name);
  const rank = positiveInteger(record.rank);
  const score = decimal(record.score);
  const members = nonNegativeInteger(record.members);
  const sourceAsOf = iso(record.sourceAsOf);

  if (!crewId || !slug || !name || !rank || !score || members === undefined || !sourceAsOf) return undefined;

  return {
    crewId,
    slug,
    name,
    rank,
    score,
    members,
    ignitions: decimal(record.ignitions),
    biggestHitGas: decimal(record.biggestHitGas),
    sourceAsOf,
  };
}

export function unavailableCrewSnapshot(message: string): ProjectGasCrewSnapshot {
  return {
    version: 1,
    status: 'unavailable',
    authority: 'unavailable',
    rows: [],
    message,
  };
}

export function parseProjectGasCrewSnapshot(
  raw: unknown,
  nowMs = Date.now(),
  staleAfterMs = 60_000,
): ProjectGasCrewSnapshot {
  if (!raw || typeof raw !== 'object') return unavailableCrewSnapshot('Canonical Crew response is invalid.');
  const record = raw as Record<string, unknown>;
  const source = nonEmpty(record.source);
  const lastIndexedAt = iso(record.lastIndexedAt);
  const rankingFormula = nonEmpty(record.rankingFormula);
  if (!source || !lastIndexedAt || !rankingFormula || !Array.isArray(record.rows)) {
    return unavailableCrewSnapshot('Canonical Crew ranking metadata is incomplete.');
  }

  const rows = record.rows.map(parseRow).filter((row): row is CrewRankingRow => Boolean(row));
  const rejected = record.rows.length - rows.length;
  const stale = Math.max(0, nowMs - Date.parse(lastIndexedAt)) > staleAfterMs;

  const ranks = new Set(rows.map((row) => row.rank));
  if (ranks.size !== rows.length) {
    return {
      version: 1,
      status: 'degraded',
      authority: 'protocol-indexer',
      source,
      lastIndexedAt,
      rows: [],
      rankingFormula,
      message: 'Crew ranking data contains duplicate canonical ranks.',
    };
  }

  return {
    version: 1,
    status: rejected > 0 ? 'degraded' : stale ? 'stale' : 'ready',
    authority: 'protocol-indexer',
    source,
    lastIndexedAt,
    rows: rows.sort((a, b) => a.rank - b.rank),
    rankingFormula,
    message: rejected > 0
      ? `${rejected} Crew row(s) were rejected because their canonical shape was invalid.`
      : stale
        ? 'Crew ranking index is outside the approved freshness window.'
        : undefined,
  };
}
