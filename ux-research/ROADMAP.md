# GAS UX — Canonical Execution Roadmap

**Status:** Source of truth for UX execution  
**Version:** 1.5  
**Rule:** There is one numbered UX roadmap. Do not introduce a second phase-numbering system and do not advance a phase until its gate is explicitly satisfied.

## Current program state

- **Phase 0 — GAS feature freeze for UX: PASS / CLOSED.**
- **Phase 1 — Existing repo inventory: PASS / CLOSED.**
- **Official current phase: Phase 2 — Fomo molecular teardown: ACTIVE.**
- **Phase 3 — Specialized cross-category teardowns: PRE-WORK ONLY / NOT GATED.**
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

### Existing evidence
- `ux-research/phase-2/fomo/ROUTE_STATE_MAP.md`
- `ux-research/phase-2/fomo/JOURNEY_MANIFEST.json`
- `ux-research/phase-2/fomo/DOCUMENTED_OBSERVATIONS.json`
- `ux-research/phase-2/fomo/FOMO_TO_GAS_MAP.md`
- `ux-research/phase-2/fomo/MEASUREMENT_QUEUE.md`
- `ux-research/phase-2/fomo/PHASE_2_STATUS.md`
- `ux-research/phase-2/FOMO_PRODUCT_MODEL.md`
- `ux-research/phase-2/FOMO_EVOLUTION_FINDINGS.md`
- `ux-research/phase-2/FOMO_VISUAL_OBSERVATIONS.md`
- `ux-research/phase-2/FOMO_JOURNEY_MATRIX.json`

### Required remaining work
Phase 2 remains open while direct authenticated measurement is being made possible through the user's local Mac/OpenClaw research node. Before the gate can pass, collect as much legitimate direct evidence as possible for:

1. mobile application shell and persistent navigation;
2. desktop/web shell and responsive transformation;
3. Feed and Friends/following feed hierarchy, card density and insertion behavior;
4. feed -> profile -> follow journey;
5. leaderboard -> profile -> follow journey;
6. social object/thesis/trade -> economic action journey;
7. search -> token/user journey;
8. portfolio/account hierarchy and cash vs position semantics;
9. buy/sell/funding/withdrawal flows up to, but never automatically through, final financial confirmation;
10. notification deep links where accessible;
11. loading, empty, back-navigation, scroll restoration and recovery behavior;
12. exact geometry, typography, spacing, control sizing, timings and animation behavior where directly measurable;
13. mobile/native differences where observable;
14. explicit Fomo weaknesses and independent GAS improvement targets;
15. final mapping to existing GAS React/account/social bones.

### Evidence integrity
Use three evidence levels:
- `documented` — official product material;
- `observed` — direct visible behavior/screenshots;
- `measured` — repeatable instrumented capture.

Never promote a documented or inferred value into `measured`.

### Exit gate
Fomo's useful UX laws are evidence-backed **and the direct authenticated/public measurement queue has been materially exhausted with the tools legitimately available**, including the local OpenClaw/browser runner once configured. Any remaining inaccessible state must be explicitly documented as unavailable after attempted capture. Findings must be translated into GAS-native requirements without copying proprietary assets/code.

**Gate status: ACTIVE / NOT PASSED.**

---

## Phase 3 — Specialized cross-category teardowns

### Objective
Search broadly for the best solution to each GAS UX problem. Named products are starting references, not a whitelist.

### Current status
Research already collected for Stake, Pump, Polymarket, Kalshi, Robinhood, OKX, Base Account, AMPL, Circle and others is **preserved as Phase 3 pre-work only**.

No Phase 3 gate may be declared until Phase 2 passes.

### Exit gate
Every canonical GAS journey has at least one credible reference benchmark, or an explicit finding that GAS must establish the benchmark itself.

**Gate status: NOT ACTIVE.**

---

## Phase 4 — Reference Matrix

### Objective
Normalize evidence across products and extract cross-product UX laws instead of product-specific imitation instructions.

### Current status
`ux-research/phase-4/REFERENCE_MATRIX.json` is an **early seed / pre-work artifact only**. It is not a passed or active phase artifact until Phase 3 is complete and the matrix is revalidated against the completed Phase 2 and Phase 3 evidence corpus.

### Exit gate
The project discusses named UX principles with evidence and numerical/behavioral targets rather than “copy Fomo/Stake/Pump,” and every important GAS journey can point to one or more normalized GAS-ready laws.

**Gate status: NOT ACTIVE.**

---

## Phase 5 — GAS Pattern Library
Convert validated reference laws into GAS-native reusable UX patterns.

**Status: NOT ACTIVE.**

---

## Phase 6 — GAS information architecture
Lock the whole product structure, navigation, identity, account semantics, feed architecture, permissions, rebase/reserve hierarchy and future Bracket compatibility.

**Status: NOT ACTIVE.**

---

## Phase 7 — Mobile GAS prototype
Build the first coherent mobile-first GAS prototype using existing GAS visual/React bones.

Required core loop: `SIGN IN -> UNIFIED ACCOUNT -> PLAY -> CRUISE/BOOST/REDLINE -> WAGER -> IGNITION -> RESULT -> REPLAY`.

**Status: NOT ACTIVE.**

---

## Phase 8 — Desktop adaptation
Adapt the proven mobile product to desktop without turning GAS into a terminal-first product.

**Status: NOT ACTIVE.**

---

## Phase 9 — Vertical-loop implementation
Implement complete user loops against real application state, including recovery behavior.

**Status: NOT ACTIVE.**

---

## Phase 10 — Automated comparison / benchmarking
Turn UX quality into repeatable measurements and release gates using the existing Playwright/harvester infrastructure.

**Status: NOT ACTIVE.**

---

## Phase 11 — Destroy friction
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
12. **Current work must remain inside Phase 2 until the Phase 2 gate explicitly passes.**