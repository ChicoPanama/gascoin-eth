# GAS UX — Canonical Execution Roadmap

**Status:** Source of truth for UX execution  
**Version:** 1.3  
**Rule:** There is one numbered UX roadmap. Do not introduce a second phase-numbering system.

## Current program state

- **Phase 0 — GAS feature freeze for UX: PASS / CLOSED.**
- **Phase 1 — Existing repo inventory: PASS / CLOSED.**
- **Phase 2 — Fomo molecular teardown: PASS / CLOSED.**
- **Official current phase: Phase 3 — Specialized cross-category teardowns.**

Some enabling work for later phases has been completed early (reference harvester, benchmark utilities, seed cross-category research, PR #66 implementation prior art). That work is credited to its destination phase, but **pre-work does not skip a phase gate**.

A phase advances only when its explicit exit gate is satisfied.

---

## Phase 0 — GAS feature freeze for UX

### Objective
Normalize every existing Project GAS feature, economic constraint, terminology decision, protocol firewall and user-facing requirement before redesign.

### Core outputs
- decision-state feature inventory;
- GAS / wGAS / reserved GSD semantics;
- CRUISE / BOOST / REDLINE / IGNITION / GAS GAUGE terminology;
- trading-fee vs game-handle economics;
- presale/principal-exit direction;
- monetary reserve / game bankroll / future Bracket firewall;
- account/social/game/trade/monetary capability map;
- UX trust/non-negotiable requirements.

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

### Key result
Every planned GAS capability is mapped to `REUSE`, `REFACTOR`, `EXTEND`, `BUILD`, `RETIRE` or `DEFER_REVIEW`, with dependencies, protocol constraints and later acceptance tests. Prior Project GAS UX work in PR #66 is preserved as phase-appropriate prior art rather than duplicated.

### Exit gate
Every Phase 5–9 GAS capability can be mapped to an existing implementation surface or an explicit new-build requirement.

**Gate status: PASS.** See `ux-research/phase-1/PHASE_1_GATE.md`.

---

## Phase 2 — Fomo molecular teardown

### Objective
Perform the deepest single-product teardown on Fomo because it is the primary SocialFi/application-shell benchmark for GAS.

### Required workstreams
- route/state map;
- feed hierarchy and scan density;
- global/following discovery;
- profiles, follows and leaderboards;
- social object → economic action flow;
- unified balance/account continuity;
- mobile ↔ desktop continuity;
- notification deep links;
- public geometry and interaction behavior where measurable;
- empty/loading/error/recovery states where observable;
- social proof and verified performance context;
- direct mapping against existing GAS leaderboard/community/account bones;
- weaknesses and explicit GAS improvements.

### Outputs
- `ux-research/phase-2/fomo/ROUTE_STATE_MAP.md`
- `ux-research/phase-2/fomo/JOURNEY_MANIFEST.json`
- `ux-research/phase-2/fomo/DOCUMENTED_OBSERVATIONS.json`
- `ux-research/phase-2/fomo/FOMO_TO_GAS_MAP.md`
- `ux-research/phase-2/FOMO_PRODUCT_MODEL.md`
- `ux-research/phase-2/FOMO_EVOLUTION_FINDINGS.md`
- `ux-research/phase-2/FOMO_VISUAL_OBSERVATIONS.md`
- `ux-research/phase-2/FOMO_JOURNEY_MATRIX.json`
- `ux-research/phase-2/PHASE_2_GATE.md`

### Exit gate
Fomo's useful UX laws are captured as evidence-backed observations, measured where public access permits, weaknesses are identified, and the laws are translated into GAS-native requirements without copying proprietary assets/code.

**Gate status: PASS.** See `ux-research/phase-2/PHASE_2_GATE.md`.

---

## Phase 3 — Specialized cross-category teardowns

### Objective
Search broadly for the best solution to each GAS UX problem. Named products are starting references, **not a whitelist**.

### Required research domains
- high-frequency game UX: Stake Originals and any superior games;
- discovery/conversion: Pump and superior launch/trading products;
- prediction markets: Polymarket, Kalshi, Robinhood prediction markets and others;
- social finance: Robinhood Social, OKX Orbit and emerging leaders;
- high-speed execution: Hyperliquid, Axiom and comparable products;
- consumer finance/account abstraction: Robinhood, Coinbase, Cash App, Revolut and others;
- monetary/protocol state: ORE, AMPL and stronger reserve/transparency interfaces;
- swap/trade-state UX: Uniswap and comparable products;
- sportsbook/game products where event discovery, slip construction, risk, settlement or live state is better;
- any product from any category that materially improves a GAS journey.

### Pre-work already available
- generic public URL harvester;
- molecular observation schema;
- standardized viewports;
- open-ended reference registry;
- seed findings for Fomo, Polymarket, Kalshi, Robinhood/OKX and execution products;
- `ux-research/phase-3/PREWORK_2026-08-15.md`.

### Exit gate
Every canonical GAS journey has at least one credible reference benchmark, or an explicit finding that GAS must establish the benchmark itself.

**Gate status: ACTIVE.**

---

## Phase 4 — Reference Matrix

### Objective
Normalize evidence across products and extract cross-product UX laws instead of product-specific imitation instructions.

### Required output per pattern
- reference products;
- observed/documented/measured behavior;
- geometry/timing where available;
- why it works;
- weaknesses/tradeoffs;
- applicable GAS capability;
- strongest credible benchmark;
- evidence confidence.

### Exit gate
The project discusses named UX principles with evidence and numerical targets rather than “copy Fomo/Stake/Pump.”

---

## Phase 5 — GAS Pattern Library

### Objective
Convert validated reference laws into GAS-native reusable UX patterns.

### Initial families
- unified account/balance;
- one-action primary CTA;
- actionable verified social result;
- global/following live feed;
- persistent safe preferences;
- Instant / cinematic / reduced-motion behavior;
- progressive disclosure;
- verified activity/profile context;
- optimistic-but-honest money-state feedback;
- sticky thumb-zone action;
- contextual onboarding;
- rebase event;
- reserve/backing summary;
- result → replay/share/verify;
- human-readable failure/recovery;
- cross-device continuity.

### Exit gate
Every important GAS interaction references a GAS pattern, not an external product name.

---

## Phase 6 — GAS information architecture

### Objective
Lock the whole product structure before final screens are implemented.

### Includes
- primary navigation and mobile bottom navigation;
- Home / Play / Trade / Crews / Reserve / Account hierarchy;
- identity/profile/social graph;
- truthful unified-account semantics;
- live activity/feed architecture;
- permissions/session authorization;
- rebase/reserve hierarchy;
- URL/deep-link/notification model;
- future Bracket compatibility without a second identity/account shell.

### Exit gate
Every canonical journey has a deterministic route/state path and every screen has one defined primary action.

---

## Phase 7 — Mobile GAS prototype

### Objective
Build the first coherent mobile-first prototype using existing GAS visual/React bones.

### Required vertical experience
`SIGN IN → UNIFIED ACCOUNT → PLAY → CRUISE/BOOST/REDLINE → WAGER → IGNITION → RESULT → REPLAY`

### Requirements
- primary Play flow fits approved mobile viewport without required scroll;
- one-handed operation;
- immediate acknowledgement;
- safe preferences retained;
- wallet/chain complexity abstracted where safely possible;
- recovery states designed from the start.

### Exit gate
Core GAS experience works end-to-end on mobile and is ready for benchmark measurement.

---

## Phase 8 — Desktop adaptation

### Objective
Adapt the proven mobile product to desktop without turning GAS into a professional terminal by default.

### Includes
- responsive hierarchy;
- desktop feed/activity density;
- sidebar/top-nav decisions;
- keyboard/hotkey behavior;
- larger-screen social context;
- advanced information through progressive disclosure.

### Exit gate
Mobile and desktop share one product model, identity, balance semantics and interaction logic.

---

## Phase 9 — Vertical-loop implementation

### Objective
Implement complete user loops against real application state, not isolated pages.

### Required loops
1. sign in → balance → Play → IGNITION → result → replay;
2. result → social object → feed → profile → try configuration → explicit wager;
3. buy GAS → balance → Play;
4. rebase → balance change → rebase/feed event;
5. Crew → members → activity → ranking;
6. sell/withdraw → settlement → history;
7. refresh/reconnect/failure → recovered canonical state;
8. future-ready market shell for Bracket positions without redesigning account semantics.

### Exit gate
Core loops function against real state with explicit recovery behavior and tests.

---

## Phase 10 — Automated comparison / benchmarking

### Objective
Turn UX quality into repeatable measurements and release gates.

### Enabling infrastructure already built
- canonical journey definitions;
- Playwright benchmark utilities;
- geometry/state/timing capture;
- weighted 0–100 journey scoring.

### Required measurements
- intentional actions;
- screens/modals/wallet prompts;
- scroll distance;
- perceived acknowledgement;
- ready-for-next-action latency;
- cognitive fields;
- mobile ergonomics;
- error/recovery;
- accessibility/touch/keyboard behavior.

### Exit gate
Approved core journeys meet GAS targets (including >=90/100 where designated) with no critical trust/recovery failure.

---

## Phase 11 — Destroy friction

### Objective
Repeatedly remove unnecessary taps, delays, modals, ambiguity, scrolling, wallet interruption and dead ends until GAS meets or exceeds the strongest credible benchmark.

### Method
For every canonical journey maintain:
- `reference_best`;
- `GAS_current`;
- `GAS_target`.

If GAS is worse and no security/protocol requirement justifies the difference, redesign it.

### Loop
`IMPLEMENT → MEASURE → FIND FRICTION → REDESIGN → RETEST`

Repeat Phases 9–11 as necessary.

### Exit condition
There is no permanent optimization “done.” The product may release when the current gate is satisfied; optimization continues as references and user behavior evolve.

---

# Program rules

1. **No alternate phase numbering.** Sub-work uses bead IDs, not new phase systems.
2. **Pre-work is allowed; gate-skipping is not.** Work completed early is credited when its phase arrives.
3. **Beads is the detailed agent task graph.** Phase epics, subtasks, blockers and discoveries live in `bd` once initialized.
4. **GitHub is code/review/human visibility.** Do not mirror every bead into GitHub Issues.
5. **Every bead requires objective acceptance criteria.**
6. **Discoveries are linked** with `discovered-from`/related dependencies rather than disappearing into chat.
7. **Every phase has an explicit gate.** Task completion alone is insufficient if the phase outcome is not true.
8. **UX evidence is permanent** under `ux-research/`.
9. **GAS identity remains coherent.** References inform behavior; GAS owns implementation, visual language and product logic.
10. **Protocol truth overrides convenience.** UX may abstract complexity but may never misrepresent balances, backing, settlement, permissions or risk.
11. **Prior staging work is harvested, not duplicated.** PR #66 is a prototype/evidence library whose artifacts are revalidated when their canonical phase activates.
