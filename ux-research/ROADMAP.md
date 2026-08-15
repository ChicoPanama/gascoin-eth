# GAS UX — Canonical Execution Roadmap

**Status:** Source of truth for UX execution  
**Version:** 1.6  
**Rule:** There is one numbered UX roadmap. Do not introduce a second phase-numbering system and do not advance a phase until its gate is explicitly satisfied.

## Current program state

- **Phase 0 — GAS feature freeze for UX: PASS / CLOSED.**
- **Phase 1 — Existing repo inventory: PASS / CLOSED.**
- **Phase 2 — Fomo molecular teardown: PASS / CLOSED.**
- **Official current phase: Phase 3 — Specialized cross-category teardowns: ACTIVE.**
- **Phase 4 — Reference Matrix: PRE-WORK ONLY / NOT ACTIVE.**
- **Phases 5–11: NOT ACTIVE.**

Some later-phase artifacts were produced early. They are preserved as pre-work/evidence only. **Pre-work never advances the roadmap and never satisfies a later gate by itself.**

---

## Phase 0 — GAS feature freeze for UX

### Objective
Normalize every existing Project GAS feature, economic constraint, terminology decision, protocol firewall and user-facing requirement before redesign.

### Exit gate
A new agent can determine what GAS must support and what it must never imply/combine without reading chat history.

**Gate status: PASS.** See `ux-research/phase-0/PHASE_0_GATE.md`.

---

## Phase 1 — Existing repo inventory

### Objective
Catalog reusable routes, components, styles, state primitives, APIs and tests in `gascoin-eth`.

### Canonical outputs
- `ux-research/phase-1/REPO_INVENTORY.md`
- `ux-research/phase-1/COMPATIBILITY_MATRIX.json`
- `ux-research/phase-1/PR66_RECONCILIATION.md`
- `ux-research/phase-1/PHASE_1_GATE.md`

### Exit gate
Every later GAS capability can be mapped to an existing implementation surface or an explicit new-build requirement.

**Gate status: PASS.**

---

## Phase 2 — Fomo molecular teardown

### Objective
Perform the deepest single-product teardown on Fomo because it is the primary SocialFi/application-shell benchmark for GAS.

### Canonical evidence families
- product/route/journey model;
- official visual anatomy and screen-state catalog;
- release/evolution research;
- account/security model;
- SocialFi system model;
- transaction/funding model;
- mobile/desktop continuity;
- trust/safety and microinteraction catalog;
- friction/external-validation log;
- GAS compatibility handoff;
- direct-capture queue and current-environment exhaustion ledger.

### Exit result
The public/documented Fomo corpus was saturated. Remaining authenticated/native exact measurements were explicitly recorded as unavailable in the current environment rather than invented. Future user-device capture may upgrade evidence without reopening the roadmap.

**Gate status: PASS.** See `ux-research/phase-2/PHASE_2_GATE.md` and `ux-research/phase-2/fomo/FOMO_CAPTURE_EXHAUSTION.md`.

---

## Phase 3 — Specialized cross-category teardowns

### Objective
Search broadly for the best solution to each GAS UX problem. Named products are starting references, **not a whitelist**.

### Active research domains
- high-frequency game UX;
- SocialFi / identity;
- discovery and conversion;
- prediction/event markets;
- consumer account abstraction;
- high-speed trading/execution;
- monetary/rebase/reserve transparency;
- general consumer finance;
- any stronger product discovered.

### Existing pre-work being revalidated
Research already exists for Stake Originals, Pump, Polymarket, Kalshi, Robinhood Social, OKX Orbit, Base Account/Coinbase, Hyperliquid/Axiom-class execution, AMPL, Circle, Uniswap and others.

### Exit gate
Every canonical GAS journey J01–J18 has at least one credible reference benchmark, or an explicit finding that GAS should establish the benchmark itself. Each journey identifies evidence, useful law, weakness/tradeoff and GAS improvement target.

**Gate status: ACTIVE / NOT PASSED.**

---

## Phase 4 — Reference Matrix

### Objective
Normalize completed Phase 2–3 evidence across products and extract cross-product UX laws instead of product-specific imitation instructions.

### Current status
`ux-research/phase-4/REFERENCE_MATRIX.json` is an **early pre-work artifact only** until Phase 3 passes and the matrix is revalidated against the complete evidence corpus.

### Exit gate
Every important GAS journey can point to normalized GAS-ready laws with evidence, tradeoffs and independent numerical/behavioral targets rather than “copy Fomo/Stake/Pump.”

**Gate status: NOT ACTIVE.**

---

## Phase 5 — GAS Pattern Library

### Objective
Convert validated reference laws into GAS-native reusable UX patterns with state, component, accessibility and acceptance contracts.

### Exit gate
Every important GAS interaction references a GAS-owned pattern, not an external product name.

**Status: NOT ACTIVE.**

---

## Phase 6 — GAS information architecture

### Objective
Lock the whole product structure: primary/mobile navigation, identity, truthful account semantics, Play/Trade/Social/Reserve hierarchy, permissions, deep links, rebase/reserve disclosure and future Bracket compatibility.

### Exit gate
Every canonical journey has a deterministic route/state path and every screen has one defined primary action.

**Status: NOT ACTIVE.**

---

## Phase 7 — Mobile GAS prototype

### Objective
Build the first coherent mobile-first GAS prototype using existing GAS visual/React bones.

Required core loop:
`SIGN IN -> UNIFIED ACCOUNT -> PLAY -> CRUISE/BOOST/REDLINE -> WAGER -> IGNITION -> RESULT -> REPLAY`

### Exit gate
Core GAS experience works end-to-end on approved mobile viewport and is ready for benchmark measurement.

**Status: NOT ACTIVE.**

---

## Phase 8 — Desktop adaptation

### Objective
Adapt the proven mobile product to desktop without turning GAS into a terminal-first product.

### Exit gate
Mobile and desktop share one product model, identity, account semantics and interaction logic.

**Status: NOT ACTIVE.**

---

## Phase 9 — Vertical-loop implementation

### Objective
Implement complete user loops against real application state, including recovery behavior.

### Exit gate
Core loops function against real state with explicit recovery behavior and tests.

**Status: NOT ACTIVE.**

---

## Phase 10 — Automated comparison / benchmarking

### Objective
Turn UX quality into repeatable measurements and release gates using the existing Playwright/harvester infrastructure.

### Exit gate
Approved core journeys meet GAS targets with no critical trust/recovery failure.

**Status: NOT ACTIVE.**

---

## Phase 11 — Destroy friction

### Objective
Repeatedly remove unnecessary taps, delays, modals, ambiguity, scrolling, wallet interruption and dead ends until GAS meets or exceeds the strongest credible benchmark.

Repeat Phases 9–11 as necessary.

**Status: NOT ACTIVE.**

---

# Program rules

1. **No alternate phase numbering.** Sub-work uses bead IDs, not new phase systems.
2. **Pre-work is allowed; gate-skipping is not.**
3. **A later-phase artifact does not mean that phase is active or passed.**
4. **Beads is the detailed agent task graph** once initialized.
5. **GitHub is code/review/human visibility.**
6. **Every bead requires objective acceptance criteria.**
7. **Discoveries are linked** rather than disappearing into chat.
8. **Every phase has an explicit gate.**
9. **UX evidence is permanent** under `ux-research/`.
10. **GAS identity remains coherent.** References inform behavior; GAS owns implementation, visual language and product logic.
11. **Protocol truth overrides convenience.** UX may abstract complexity but may never misrepresent balances, backing, settlement, permissions or risk.
12. **Current work remains inside Phase 3 until the Phase 3 gate explicitly passes.**
