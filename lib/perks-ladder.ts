/**
 * Perks Ladder — shared band math for the unified /perks surface.
 *
 * Single source of truth for the Composite Influence Score → creator band
 * mapping. The /perks UI, /api/me/ladder response, and Marketplace brief
 * eligibility filter all read from here so a creator sees the same band
 * name everywhere.
 *
 * When PR B adds the Supabase `derive_creator_tier(numeric)` function,
 * its thresholds MUST match the constants below. If you change bands here,
 * update the migration in lockstep.
 */

export type CompositeBand = 'new' | 'rising' | 'established' | 'elite';

export interface BandSpec {
  id: CompositeBand;
  label: string;
  min: number;
  description: string;
}

export const COMPOSITE_BANDS: readonly BandSpec[] = [
  { id: 'new',         label: 'New',         min: 0,  description: 'First posts landing — build consistency to rise.' },
  { id: 'rising',      label: 'Rising',      min: 40, description: 'Momentum in the feed — keep the cadence.' },
  { id: 'established', label: 'Established', min: 70, description: 'Marketplace-eligible. Briefs unlock here.' },
  { id: 'elite',       label: 'Elite',       min: 85, description: 'Top-tier reach. Highest-paying briefs open.' },
] as const;

/**
 * Map a Composite Influence Score (0-100) to its band. Inputs outside the
 * range are clamped: negative → 'new', >100 → 'elite'. NaN → 'new'.
 */
export function mapCompositeToBand(composite: number): CompositeBand {
  if (!Number.isFinite(composite)) return 'new';
  const score = Math.max(0, Math.min(100, composite));
  // Walk bands descending so the highest matching min wins.
  for (let i = COMPOSITE_BANDS.length - 1; i >= 0; i--) {
    if (score >= COMPOSITE_BANDS[i].min) return COMPOSITE_BANDS[i].id;
  }
  return 'new';
}

export function getBandSpec(band: CompositeBand): BandSpec {
  return COMPOSITE_BANDS.find((b) => b.id === band) ?? COMPOSITE_BANDS[0];
}

/**
 * Ordered rank of a band, 0 (lowest) through COMPOSITE_BANDS.length-1.
 * Used to compare "does this creator meet the brief's minimum band?"
 */
export function bandRank(band: CompositeBand): number {
  return COMPOSITE_BANDS.findIndex((b) => b.id === band);
}

export interface BriefLike {
  id: string | number;
  minCreatorTier: string | null;
}

/**
 * Filter an array of briefs to the ones a creator with the given composite
 * score qualifies for. A brief with `minCreatorTier = null` is open to
 * everyone. A brief with a band string gates by `bandRank(creator) >= bandRank(brief)`.
 * Unknown band strings on briefs are treated as no-gate (fail open) — the
 * gate is a hint, not a hard safety boundary.
 */
export function eligibleBriefsForComposite<T extends BriefLike>(
  composite: number,
  briefs: readonly T[],
): T[] {
  const creatorBand = mapCompositeToBand(composite);
  const creatorRank = bandRank(creatorBand);
  return briefs.filter((b) => {
    if (!b.minCreatorTier) return true;
    const min = b.minCreatorTier as CompositeBand;
    const minIdx = bandRank(min);
    if (minIdx < 0) return true;
    return creatorRank >= minIdx;
  });
}

/**
 * Next-band targeting for UI progress bars. Returns null if creator is
 * already elite.
 */
export function nextBand(composite: number): BandSpec | null {
  const current = mapCompositeToBand(composite);
  const idx = bandRank(current);
  if (idx < 0 || idx >= COMPOSITE_BANDS.length - 1) return null;
  return COMPOSITE_BANDS[idx + 1];
}
