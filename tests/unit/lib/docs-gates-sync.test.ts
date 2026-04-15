/**
 * Drift guard: the docs verification category must always render exactly one
 * section per gate in the engine.
 *
 * Background: for weeks, lib/docs-content.ts had 10 hand-written "gate-X"
 * sections describing fictional gates that did not exist in lib/policy.ts's
 * GATE_DEFS. The engine had 15 real gates with zero documentation. Nothing
 * caught it because Build Check was silently red behind a billing hold.
 *
 * PR #40 replaced the hand-written sections with a module-level generator
 * that reads from lib/gates.ts (itself pinned to lib/policy.ts::GATE_DEFS).
 * This test guards the wiring so future drift is impossible.
 *
 * If this test fails, the fix is in lib/docs-content.ts — check that:
 *   1. GATES, GATE_COUNT are imported from lib/gates.ts / lib/policy.ts
 *   2. GATE_DOC_SECTIONS is spread into the verification category
 *   3. Nobody added hand-written gate-N DocSection entries alongside it
 */
import { describe, it, expect } from 'vitest';
import { DOC_CATEGORIES } from '@/lib/docs-content';
import { GATE_COUNT, GATE_DEFS } from '@/lib/policy';
import { GATES } from '@/lib/gates';

describe('docs ↔ gates drift guard', () => {
  const verification = DOC_CATEGORIES.find((c) => c.slug === 'verification');

  it('verification category exists', () => {
    expect(verification).toBeDefined();
  });

  it('verification category has the intro + one section per engine gate', () => {
    // 1 intro (`verification-gates-reference`) + GATE_COUNT gate detail sections
    expect(verification!.sections.length).toBe(1 + GATE_COUNT);
  });

  it('every gate in GATE_DEFS has a matching doc section', () => {
    const titles = verification!.sections.map((s) => s.title);
    for (const gate of GATES) {
      const match = titles.find((t) => t.includes(gate.name));
      expect(match, `missing doc section for gate "${gate.name}" (policyGate=${gate.policyGate})`).toBeDefined();
    }
  });

  it('every gate doc section points to a real policy gate id', () => {
    const validPolicyIds = new Set(GATE_DEFS.map((g) => g.id));
    const gateSections = verification!.sections.filter((s) =>
      s.slug.startsWith('gate-')
    );
    for (const section of gateSections) {
      // Every generated gate section content must mention its policy id in
      // the <code>...</code> "Policy engine id" line from buildGateContent.
      const hasValidPolicyRef = Array.from(validPolicyIds).some((id) =>
        section.content.includes(`<code>${id}</code>`)
      );
      expect(
        hasValidPolicyRef,
        `gate section "${section.title}" does not reference a real GATE_DEFS policy id`
      ).toBe(true);
    }
  });

  it('no hand-written stale gate sections remain in the category', () => {
    // The PR #40 post-mortem: ensure nobody adds hand-written gate-N sections
    // alongside the generator. Every gate section must be generated — which
    // means its slug follows the `gate-\d{2}-<slug>` pattern from the
    // generator and its title starts with "Gate N — <name>".
    const gateSections = verification!.sections.filter((s) =>
      s.slug.startsWith('gate-')
    );
    for (const section of gateSections) {
      expect(
        section.slug,
        `gate section slug "${section.slug}" is not in the generated form "gate-NN-<slug>"`
      ).toMatch(/^gate-\d{2}-[a-z0-9-]+$/);
    }
  });

  it('the category count equals GATE_COUNT (single source of truth)', () => {
    // Sanity: GATE_COUNT is derived from GATE_DEFS.length, and the generator
    // maps GATES (which throws on import if it drifts from GATE_DEFS). So the
    // full chain must be: policy.GATE_DEFS.length === gates.GATES.length ===
    // (verification section count - 1 intro).
    expect(GATE_COUNT).toBe(GATE_DEFS.length);
    expect(GATES.length).toBe(GATE_COUNT);
    expect(verification!.sections.length - 1).toBe(GATE_COUNT);
  });
});
