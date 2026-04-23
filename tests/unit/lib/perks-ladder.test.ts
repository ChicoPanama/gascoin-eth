import { describe, it, expect } from 'vitest';
import {
  mapCompositeToBand,
  getBandSpec,
  bandRank,
  nextBand,
  eligibleBriefsForComposite,
  COMPOSITE_BANDS,
} from '../../../lib/perks-ladder';

describe('perks-ladder · mapCompositeToBand', () => {
  it('maps 0-39 to new', () => {
    expect(mapCompositeToBand(0)).toBe('new');
    expect(mapCompositeToBand(20)).toBe('new');
    expect(mapCompositeToBand(39.99)).toBe('new');
  });

  it('maps 40-69 to rising', () => {
    expect(mapCompositeToBand(40)).toBe('rising');
    expect(mapCompositeToBand(55)).toBe('rising');
    expect(mapCompositeToBand(69.99)).toBe('rising');
  });

  it('maps 70-84 to established', () => {
    expect(mapCompositeToBand(70)).toBe('established');
    expect(mapCompositeToBand(80)).toBe('established');
    expect(mapCompositeToBand(84.99)).toBe('established');
  });

  it('maps 85-100 to elite', () => {
    expect(mapCompositeToBand(85)).toBe('elite');
    expect(mapCompositeToBand(100)).toBe('elite');
  });

  it('clamps out-of-range values', () => {
    expect(mapCompositeToBand(-50)).toBe('new');
    expect(mapCompositeToBand(150)).toBe('elite');
  });

  it('treats non-finite as new (documented contract)', () => {
    expect(mapCompositeToBand(Number.NaN)).toBe('new');
    expect(mapCompositeToBand(Number.POSITIVE_INFINITY)).toBe('new');
    expect(mapCompositeToBand(Number.NEGATIVE_INFINITY)).toBe('new');
  });
});

describe('perks-ladder · bandRank + nextBand', () => {
  it('ranks bands in ascending order', () => {
    expect(bandRank('new')).toBe(0);
    expect(bandRank('rising')).toBe(1);
    expect(bandRank('established')).toBe(2);
    expect(bandRank('elite')).toBe(3);
  });

  it('returns the next higher band', () => {
    expect(nextBand(0)?.id).toBe('rising');
    expect(nextBand(50)?.id).toBe('established');
    expect(nextBand(75)?.id).toBe('elite');
  });

  it('returns null at the top band', () => {
    expect(nextBand(90)).toBeNull();
    expect(nextBand(100)).toBeNull();
  });
});

describe('perks-ladder · getBandSpec', () => {
  it('returns the spec for each band', () => {
    for (const b of COMPOSITE_BANDS) {
      expect(getBandSpec(b.id).id).toBe(b.id);
    }
  });
});

describe('perks-ladder · eligibleBriefsForComposite', () => {
  const briefs = [
    { id: 'open',        minCreatorTier: null },
    { id: 'rising',      minCreatorTier: 'rising' },
    { id: 'established', minCreatorTier: 'established' },
    { id: 'elite',       minCreatorTier: 'elite' },
    { id: 'garbage',     minCreatorTier: 'not-a-band' },
  ];

  it('includes null-gated briefs always', () => {
    const result = eligibleBriefsForComposite(0, briefs);
    expect(result.some((b) => b.id === 'open')).toBe(true);
  });

  it('treats unknown band strings as open (fail-open)', () => {
    const result = eligibleBriefsForComposite(0, briefs);
    expect(result.some((b) => b.id === 'garbage')).toBe(true);
  });

  it('gates rising-minimum briefs by band rank', () => {
    const newUser = eligibleBriefsForComposite(20, briefs).map((b) => b.id);
    expect(newUser).not.toContain('rising');
    expect(newUser).not.toContain('established');
    expect(newUser).not.toContain('elite');

    const rising = eligibleBriefsForComposite(50, briefs).map((b) => b.id);
    expect(rising).toContain('rising');
    expect(rising).not.toContain('established');

    const established = eligibleBriefsForComposite(75, briefs).map((b) => b.id);
    expect(established).toContain('rising');
    expect(established).toContain('established');
    expect(established).not.toContain('elite');

    const elite = eligibleBriefsForComposite(95, briefs).map((b) => b.id);
    expect(elite).toContain('rising');
    expect(elite).toContain('established');
    expect(elite).toContain('elite');
  });
});
