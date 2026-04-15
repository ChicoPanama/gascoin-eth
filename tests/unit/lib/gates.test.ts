import { describe, it, expect } from 'vitest';
import { GATES, GATE_CATEGORIES } from '@/lib/gates';
import { GATE_COUNT } from '@/lib/policy';

describe('GATES', () => {
  it(`has ${GATE_COUNT} gates`, () => { expect(GATES).toHaveLength(GATE_COUNT); });
  it(`IDs are sequential 1..${GATE_COUNT}`, () => {
    GATES.forEach((g, i) => expect(g.id).toBe(i + 1));
  });
  it('gascoin_min_hold is the only non-blocking gate (Season 1 dry-run)', () => {
    const nb = GATES.filter((g) => !g.is_blocking);
    expect(nb).toHaveLength(1);
    expect(nb[0].policyGate).toBe('gascoin_min_hold');
  });
  it('category counts match GATE_CATEGORIES', () => {
    expect(GATES.filter((g) => g.category === 'identity')).toHaveLength(GATE_CATEGORIES.identity.count);
    expect(GATES.filter((g) => g.category === 'tweet')).toHaveLength(GATE_CATEGORIES.tweet.count);
    expect(GATES.filter((g) => g.category === 'receipt')).toHaveLength(GATE_CATEGORIES.receipt.count);
    expect(GATES.filter((g) => g.category === 'wallet')).toHaveLength(GATE_CATEGORIES.wallet.count);
  });
  it('slugs are unique', () => {
    expect(new Set(GATES.map((g) => g.slug)).size).toBe(GATES.length);
  });
  it('policyGates are unique', () => {
    expect(new Set(GATES.map((g) => g.policyGate)).size).toBe(GATES.length);
  });
  it('every gate has a policyGate', () => {
    GATES.forEach((g) => expect(g.policyGate, `Gate ${g.id} missing policyGate`).toBeTruthy());
  });
  it('all have required fields', () => {
    GATES.forEach((g) => {
      expect(g.name).toBeTruthy();
      expect(g.description).toBeTruthy();
      expect(g.common_failures.length).toBeGreaterThan(0);
      expect(g.checklist_label).toBeTruthy();
    });
  });
});
