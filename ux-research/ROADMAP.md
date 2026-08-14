# GAS UX — Canonical Execution Roadmap

**Status:** Source of truth for UX execution
**Version:** 1.1
**Rule:** There is one numbered UX roadmap. Do not introduce a second phase-numbering system.

## Current program state

**Phase 0 — GAS feature freeze for UX: PASS / CLOSED.**

**Official current phase: Phase 1 — Existing repo inventory.**

Some enabling work for later phases has already been completed early (reference harvester, benchmark utilities, seed findings, compatibility seed). That work is credited to its destination phase, but **pre-work does not skip a phase gate**.

A phase advances only when its exit gate is satisfied.

---

## Phase 0 — GAS feature freeze for UX

### Objective
Normalize every existing Project GAS feature, economic constraint, terminology decision, protocol firewall and user-facing requirement before the interface is redesigned around them.

### Includes
- canonical feature inventory;
- LOCKED / CURRENT / OPEN / DEFERRED / DEPRECATED status for each feature;
- GAS / wGAS / reserved GSD terminology;
- CRUISE / BOOST / REDLINE / IGNITION / GAS GAUGE terminology;
- GAS trading fee semantics versus game-handle economics;
- simple presale direction and principal-exit requirement;
- monetary reserve / game bankroll / future Bracket collateral firewalls;
- account, social, game, trade, monetary and future Bracket capability map;
- UX non-negotiables and trust constraints.

### Exit gate
A new agent can answer “what must GAS support?” and “what must GAS never imply or combine?” from repository sources without reading chat history.

**Gate status: PASS.** See `ux-research/phase-0/PHASE_0_GATE.md`.

---

## Phase 1 — Existing repo inventory

### Objective
Catalog every reusable route, component, style, state primitive, API and test surface in `gascoin-eth`.

### Includes
- route/navigation inventory;
- React component inventory;
- design tokens, typography and responsive primitives;
- Privy/account/wallet flows;
- wagmi/viem transaction-state surfaces;
- React Query/live-state surfaces;
- community/profile/leaderboard/referral components;
- Framer Motion primitives;
- error/recovery components;
- Playwright/Vitest coverage;
- `reuse / refactor / extend / build / reject` compatibility matrix.

### Active artifacts
- `ux-research/phase-1/REPO_INVENTORY.md`
- `ux-research/phase-1/compatibility-matrix.seed.json`
- `scripts/ux-repo-inventory.mjs`

### Exit gate
Every Phase 5–9 GAS component can be mapped to an existing implementation surface or an explicit new-build requirement.

---

## Phase 2 — Fomo molecular teardown

### Objective
Perform the deepest single-product teardown on Fomo because it is the primary SocialFi/application-shell benchmark for GAS.

### Includes
- feed hierarchy and scan density;
- global/following discovery;
- profiles, follows and leaderboards;
- social object → economic action flow;
- unified balance/account continuity;
- mobile ↔ desktop continuity;
- notification deep links;
- public geometry, interaction timing and state behavior;
- empty/loading/error/recovery states;
- social proof and verified performance context.

### Exit gate
Fomo’s useful UX laws are captured as evidence-backed observations and translated into GAS requirements without copying proprietary assets/code.

---

## Phase 3 — Specialized cross-category teardowns

### Objective
Search broadly for the best solution to each GAS UX problem. The named products are starting references, **not a whitelist**.

### Required research domains
- high-frequency game UX: Stake Originals and any superior games;
- discovery/conversion: Pump and any superior launch/trading product;
- prediction markets: Polymarket, Kalshi, Robinhood prediction markets and others;
- social finance: Robinhood Social, OKX Orbit and emerging leaders;
- high-speed trading: Hyperliquid, Axiom and comparable products;
- consumer finance/account abstraction: Robinhood, Coinbase, Cash App, Revolut and others;
- monetary/protocol state: ORE, AMPL and stronger reserve/transparency interfaces;
- swap/trade-state UX: Uniswap and comparable products;
- sportsbooks/games where risk presentation, slip construction, settlement or live-state UX is superior;
- any product from any category that materially improves a GAS journey.

### Enabling infrastructure already built early
- generic public URL harvester;
- standardized molecular observation schema;
- standardized viewports;
- seed cross-category reference registry.

### Exit gate
For every canonical GAS journey there is at least one credible reference benchmark, or an explicit finding that GAS must establish the benchmark itself.

---

## Phase 4 — Reference Matrix

### Objective
Normalize evidence across products and extract cross-product UX laws.

### Required output
For each important pattern:
- reference products;
- observed behavior;
- measured geometry/timing where available;
- why it works;
- weakness/tradeoff;
- applicable GAS capability;
- strongest known benchmark;
- confidence/evidence level.

### Exit gate
The team no longer discusses “copy Fomo/Stake/Pump.” It discusses named UX principles with evidence and numerical targets.

---

## Phase 5 — GAS Pattern Library

### Objective
Convert reference findings into GAS-native reusable UX primitives.

### Initial pattern families
- unified account/balance;
- one-action primary CTA;
- actionable social result;
- live activity tape;
- persistent safe preferences;
- Instant versus cinematic mode;
- progressive disclosure;
- verified activity/profile context;
- optimistic money-state feedback;
- sticky mobile thumb-zone actions;
- contextual onboarding;
- rebase event;
- reserve/backing summary;
- result → replay/share/verify;
- human-readable failure/recovery;
- cross-device continuity.

### Exit gate
Every important interaction planned for GAS references a GAS pattern rather than an external product name.

---

## Phase 6 — GAS information architecture

### Objective
Lock how the whole product fits together before final screens are implemented.

### Includes
- primary navigation;
- Home / Play / Trade / Crews / Reserve / Wallet architecture;
- mobile bottom navigation;
- desktop navigation;
- identity/profile/social graph model;
- unified-account semantics without falsely merging cash, GAS, game funds, reserve or future Bracket positions;
- live activity/feed architecture;
- account permissions/session authorization;
- rebase/reserve information hierarchy;
- future Bracket compatibility;
- URL/deep-link model;
- notification model.

### Exit gate
Every canonical journey has a deterministic route/state path and every screen has a defined primary action.

---

## Phase 7 — Mobile GAS prototype

### Objective
Build the first coherent mobile-first prototype using the existing GAS visual identity and React bones.

### First required vertical experience
`SIGN IN → UNIFIED ACCOUNT → PLAY → CRUISE/BOOST/REDLINE → WAGER → IGNITION → RESULT → REPLAY`

### Requirements
- primary Play flow fits the target mobile viewport without required scroll;
- one-handed operation;
- immediate acknowledgement;
- safe preferences retained;
- wallet/chain complexity abstracted wherever architecture permits;
- recovery states designed from the start.

### Exit gate
The core GAS experience can be used end-to-end on mobile and is ready for benchmark measurement.

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
- advanced information revealed without degrading the simple path.

### Exit gate
Mobile and desktop share one product model, identity, balance semantics and interaction logic.

---

## Phase 9 — Vertical-loop implementation

### Objective
Implement complete user loops, not isolated pages.

### Required loops
1. sign in → balance → Play → IGNITION → result → replay;
2. result → social post → feed → profile → try configuration;
3. buy GAS → balance → Play;
4. rebase → balance change → rebase event → feed event;
5. Crew → members → activity → ranking;
6. sell/withdraw → settlement → history;
7. refresh/reconnect/failure → recovered canonical state;
8. future-ready market shell that can later accept Bracket positions without redesigning account semantics.

### Exit gate
Core loops function against real application state with explicit recovery behavior and tests.

---

## Phase 10 — Automated comparison / benchmarking

### Objective
Turn UX quality into a repeatable test and release gate.

### Enabling infrastructure already built early
- canonical journey definitions;
- Playwright benchmark utilities;
- geometry/state/timing capture;
- 0–100 weighted journey scoring model.

### Required measurements
- intentional actions;
- screens;
- modals;
- wallet prompts;
- scroll distance;
- perceived acknowledgement;
- ready-for-next-action latency;
- cognitive fields;
- mobile ergonomics;
- error/recovery performance;
- accessibility/touch/keyboard behavior.

### Release gate
Core journeys meet the approved GAS targets, including >=90/100 on designated core journeys with no critical trust/recovery failure.

---

## Phase 11 — Destroy friction

### Objective
Repeatedly remove every unnecessary tap, delay, modal, ambiguity, scroll, wallet interruption and dead end until GAS meets or exceeds the strongest credible benchmark.

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
There is no permanent “done.” The product may release when the current gate is satisfied; optimization continues as references and user behavior evolve.

---

# Program rules

1. **No alternate phase numbering.** Sub-work uses bead IDs, not new phase systems.
2. **Pre-work is allowed; gate-skipping is not.** Work completed early is credited when its phase is reached.
3. **Beads is the agent task graph.** Phase epics, subtasks, blockers and discoveries live in `bd` once initialized.
4. **GitHub is the code/review surface.** Pull requests and milestone-level summaries may reference beads, but do not duplicate the entire task graph as GitHub issues.
5. **Every bead needs acceptance criteria.** No placeholder tasks.
6. **Every discovery is linked.** New work discovered during execution uses `discovered-from` relationships.
7. **Every phase has an explicit gate.** Closing individual tasks is not sufficient if the phase outcome is not met.
8. **UX evidence is permanent.** Reference captures and findings are stored under `ux-research/`.
9. **GAS identity stays coherent.** References inform behavior; GAS owns the implementation, visual language and product logic.
10. **Protocol truth overrides convenience.** UX may abstract complexity but may not misrepresent balances, backing, settlement, permissions or risk.
