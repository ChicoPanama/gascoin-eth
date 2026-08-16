# GAS UX — Canonical Execution Roadmap

**Status:** Source of truth for UX execution  
**Version:** 1.8  
**Rule:** There is exactly one numbered UX roadmap. Pre-work may happen early; a phase advances only after its explicit gate passes.

## Current program state

- **Phase 0 — GAS feature freeze for UX: PASS / CLOSED**
- **Phase 1 — Existing repo inventory: PASS / CLOSED**
- **Phase 2 — Fomo molecular teardown: PASS / CLOSED**
- **Phase 3 — Specialized cross-category teardowns: PASS / CLOSED**
- **Phase 4 — Reference Matrix: PASS / CLOSED**
- **Phase 5 — GAS Pattern Library: PASS / CLOSED**
- **Phase 6 — GAS information architecture: PASS / CLOSED**
- **Phase 7 — Mobile GAS prototype: PASS / CLOSED**
- **Official current phase: Phase 8 — Desktop adaptation: ACTIVE**
- **Phases 9–11: NOT ACTIVE**

The corresponding gate files are authoritative evidence for each closed phase. A later-phase artifact by itself never advances the roadmap.

---

## Phase 0 — GAS feature freeze for UX

Normalize Project GAS capabilities, economic constraints, terminology, protocol firewalls and UX non-negotiables.

**Exit gate:** a new agent can determine what GAS must support and what it must never imply/combine without chat history.

**Status:** PASS — `ux-research/phase-0/PHASE_0_GATE.md`.

---

## Phase 1 — Existing repo inventory

Catalog reusable routes, components, design tokens, account/state primitives, APIs, services and tests in `gascoin-eth`.

Canonical outputs include `REPO_INVENTORY.md`, `COMPATIBILITY_MATRIX.json` and `PR66_RECONCILIATION.md`.

**Exit gate:** every later GAS capability maps to an existing implementation surface or explicit new-build requirement.

**Status:** PASS — `ux-research/phase-1/PHASE_1_GATE.md`.

---

## Phase 2 — Fomo molecular teardown

Deepest single-product SocialFi/application-shell study. Public/documented evidence was saturated; direct authenticated/native values unavailable in this environment are explicitly preserved as unavailable rather than estimated.

Key evidence includes product/journey models, visual anatomy, release evolution, account/security, SocialFi, transaction/funding, trust/safety, friction hypotheses, GAS mapping and the M01–M18 capture exhaustion ledger.

**Exit gate:** useful Fomo laws are evidence-backed, weaknesses identified, unavailable measurements documented, and findings translated to GAS-native requirements without copied proprietary implementation.

**Status:** PASS — `ux-research/phase-2/PHASE_2_GATE.md` and `ux-research/phase-2/fomo/FOMO_CAPTURE_EXHAUSTION.md`.

---

## Phase 3 — Specialized cross-category teardowns

Search broadly for the strongest solution to each GAS journey. References are open-ended and include high-frequency games, SocialFi, discovery/conversion, prediction markets, account abstraction, high-speed execution, monetary/rebase/reserve UX and consumer finance.

Current evidence classes include Stake Originals, Fomo, Robinhood Social, OKX Orbit, Pump, Base Account/Coinbase, Hyperliquid, Uniswap, Polymarket, Kalshi, Ampleforth and Circle.

**Exit gate:** J01–J18 each have a credible benchmark reference or an explicit GAS-establishes-benchmark determination with law, tradeoff and GAS position.

**Status:** PASS — `ux-research/phase-3/PHASE_3_GATE.md`, `REFERENCE_COVERAGE.json`, `PHASE_3_REVALIDATION_2026-08-16.md`.

---

## Phase 4 — Reference Matrix

Normalize competitor evidence into GAS-ready laws organized by user problem rather than company.

Canonical laws RM01–RM18 include consumer account entry, bounded sessions, one-action replay, dual-speed presentation, legible risk, verified social objects, one social graph, contextual drilldown, truthful portfolio semantics, progressive depth, probability translation, step-up security, personal rebase, reserve trust, canonical pending state, human recovery, cross-device state and deep-linked notifications.

**Exit gate:** all J01–J18 reference normalized laws with evidence, tradeoffs and independent GAS targets.

**Status:** PASS — `ux-research/phase-4/PHASE_4_GATE.md` and `REFERENCE_MATRIX_REVALIDATION_2026-08-16.md`.

---

## Phase 5 — GAS Pattern Library

Translate Phase 4 laws into GAS-owned implementation contracts.

Canonical artifacts:
- `ux-research/phase-5/PATTERNS.json` — GP01–GP24;
- `ux-research/phase-5/PATTERN_LIBRARY.md`.

Patterns define intent, canonical states, persistence rules, financial-truth constraints, repo mapping and measurable acceptance criteria.

**Exit gate:** important GAS interactions can be specified without referring to external product names.

**Status:** PASS — `ux-research/phase-5/PHASE_5_GATE.md`.

---

## Phase 6 — GAS information architecture

Lock the product shell, routes, truthful account semantics, Play/Social/Trade/Reserve architecture, deep links, permissions and future Bracket compatibility.

### Mobile primary navigation
`Home | Play | Trade | Crews | Account`

### Desktop primary navigation target
`Home | Play | Trade | Crews | Reserve` with `Search | Notifications | Account` utilities.

### Canonical consumer routes
`/`, `/play`, `/play/gas`, `/play/roulette`, `/trade`, `/crews`, `/crews/[slug]`, `/profile/[handle]`, `/account`, `/reserve`, `/search`, `/notifications`, `/activity/[id]`, `/round/[id]`, `/transaction/[id]`, `/rebase/[id]` where applicable.

Financial semantics remain explicit:
`spendable GAS/USDC != locked wagers != marked future Bracket positions != potential payout != ReserveVault != GameBankroll != Bracket collateral`.

**Exit gate:** J01–J18 each have a deterministic route/state path and one primary action per state.

**Status:** PASS — `ux-research/phase-6/PHASE_6_GATE.md`, `INFORMATION_ARCHITECTURE.md`, `JOURNEY_ROUTE_MAP.json`.

---

## Phase 7 — Mobile GAS prototype

Build and verify the first coherent mobile-first GAS experience using existing GAS visual/React bones and the Phase 5/6 contracts.

Required core loop:

`SIGN IN -> TRUTHFUL ACCOUNT -> PLAY -> CRUISE/BOOST/REDLINE -> WAGER -> IGNITION -> CANONICAL ACTION STATE -> RESULT -> REPLAY`

### Verified implementation scope

- semantic Project GAS token layer;
- consumer-first Privy entry path while preserving transition compatibility;
- five-destination GAS shell;
- Project GAS Home;
- `/play` and interactive `/play/gas`;
- GAS Gauge;
- Risk selector / Wager composer / IGNITION;
- Cinematic / Instant / Reduced presentation modes;
- canonical request/round state with stale-intent/retry protections;
- result/replay/verification path;
- Trade/Crews/Account/Reserve/Search/Notifications prototype shells;
- canonical round detail;
- unit and Playwright prototype tests;
- explicit prototype/no-funds/no-live-RNG labels; no fabricated reserve/social activity;
- deterministic, separated Project GAS and legacy CI lanes;
- controller/view separation for GAS Original so real adapters can replace prototype state later.

### Phase 7 gate evidence

Final code-bearing head `ec86665cec3fdd2cbb3b498e9a28709f263ede70`, GitHub Actions run #306:

- Unit Tests — PASS
- Production Build — PASS
- Project GAS E2E — PASS
- Legacy Compatibility E2E — PASS

Dedicated mobile assertions include 390×844 no-scroll action/replay reachability and 44px minimum primary touch targets.

**Status:** PASS / CLOSED — `ux-research/phase-7/PHASE_7_GATE.md`.

---

## Phase 8 — Desktop adaptation

**ACTIVE PHASE.**

Adapt the verified mobile product to desktop without creating a terminal-first second product model. Increase simultaneous context while retaining routes, identity, account semantics, canonical interaction states and the same primary actions.

### Phase 8 working rules

- mobile remains the behavioral source of truth;
- desktop adds context, not a different product ontology;
- the desktop shell exposes Home / Play / Trade / Crews / Reserve persistently, with Search / Notifications / Account as utilities;
- GAS Original retains the same CRUISE / BOOST / REDLINE → wager → IGNITION → result → replay state machine;
- additional width may expose live/history/trust/social context simultaneously, but cannot hide or duplicate the primary action;
- responsive behavior must be deterministic between mobile, tablet and desktop breakpoints;
- legacy GASCOIN desktop navigation must not re-enter Project GAS routes.

**Exit gate:** mobile and desktop share one product model and critical journeys work at approved desktop viewports with no state/financial-truth divergence.

**Status:** ACTIVE — `ux-research/phase-8/PHASE_8_GATE.md`.

---

## Phase 9 — Vertical-loop implementation

Replace prototype state with real application/protocol adapters and complete end-to-end loops: account/funding, Play/settlement/replay, verified social activity, rebase/reserve, Crews, withdrawal, recovery and future-ready Bracket shell.

**Exit gate:** core loops function against authoritative real state with explicit recovery behavior and tests.

**Status:** NOT ACTIVE.

---

## Phase 10 — Automated comparison / benchmarking

Use the existing Playwright/UX benchmark infrastructure to measure actions, screens, scroll, acknowledgement, next-ready latency, cognitive fields, mobile ergonomics, recovery and accessibility against `reference_best`, `GAS_current`, `GAS_target`.

**Exit gate:** approved core journeys meet GAS targets with no critical trust/recovery failure.

**Status:** NOT ACTIVE.

---

## Phase 11 — Destroy friction

Repeatedly remove unnecessary taps, delays, modals, ambiguity, scrolling, wallet interruption and dead ends.

Loop:
`IMPLEMENT -> MEASURE -> FIND FRICTION -> REDESIGN -> RETEST`

Repeat Phases 9–11 until GAS meets or exceeds the strongest credible benchmark unless a protocol/security constraint justifies the difference.

**Status:** NOT ACTIVE.

---

# Program rules

1. No alternate phase numbering.
2. Pre-work is allowed; gate-skipping is not.
3. A later-phase artifact does not make that phase active or passed.
4. Beads is the detailed agent task graph once initialized.
5. GitHub is code/review/CI/human visibility.
6. Every task requires objective acceptance criteria.
7. Discoveries are linked rather than disappearing into chat.
8. Every phase has an explicit gate.
9. UX evidence is permanent under `ux-research/`.
10. GAS owns the implementation, visual language and product logic.
11. Protocol truth overrides convenience.
12. No fake activity, reserve state, payouts or settlement.
13. Unknown measurements remain unknown until measured.
14. **Current work stays inside Phase 8 until the Phase 8 gate explicitly passes.**
