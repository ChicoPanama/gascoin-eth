import { describe, it, expect } from 'vitest';
import { GATES, GATE_CATEGORIES } from '@/lib/gates';

describe('GATES', () => {
  it('has 10 gates', () => { expect(GATES).toHaveLength(10); });
  it('IDs are 1-10', () => { GATES.forEach((g, i) => expect(g.id).toBe(i + 1)); });
  it('gate 10 is only non-blocking', () => {
    const nb = GATES.filter((g) => !g.is_blocking);
    expect(nb).toHaveLength(1);
    expect(nb[0].id).toBe(10);
  });
  it('category counts match', () => {
    expect(GATES.filter((g) => g.category === 'tweet')).toHaveLength(GATE_CATEGORIES.tweet.count);
    expect(GATES.filter((g) => g.category === 'receipt')).toHaveLength(GATE_CATEGORIES.receipt.count);
  });
  it('slugs are unique', () => {
    expect(new Set(GATES.map((g) => g.slug)).size).toBe(GATES.length);
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
