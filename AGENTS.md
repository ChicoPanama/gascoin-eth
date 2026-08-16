# Project GAS — Agent Operating Context

This file is the tool-agnostic starting context for coding/research agents working in this repository.

## Active product

**Project GAS** is the active product. The historical GASCOIN gas-refund application is legacy compatibility surface only and must not be treated as the current product architecture.

Project GAS combines:

1. **GAS** — reserve-backed elastic monetary asset;
2. **wGAS** — fixed-share/non-rebasing integration wrapper;
3. **GAS Original** — high-frequency provably-fair game using CRUISE / BOOST / REDLINE and IGNITION;
4. **SocialFi** — profiles, verified economic activity, Crews and social discovery;
5. **Reserve transparency** — backing and rebase state;
6. **future Bracket integration** — separate collateral/settlement domain and separate solvency.

## Canonical roadmap

`ux-research/ROADMAP.md` is the sole numbered UX roadmap.

Current state:

- Phase 0 — feature freeze: PASS
- Phase 1 — repo inventory: PASS
- Phase 2 — Fomo molecular teardown: PASS
- Phase 3 — cross-category teardowns: PASS
- Phase 4 — Reference Matrix: PASS
- Phase 5 — GAS Pattern Library: PASS
- Phase 6 — GAS information architecture: PASS
- Phase 7 — Mobile GAS prototype: PASS
- **Phase 8 — Desktop adaptation: ACTIVE**
- Phases 9–11 are not active until their gates open.

Pre-work is allowed; gate-skipping is not.

## Source of truth

Read these before making product-level decisions:

- `ux-research/ROADMAP.md`
- **`ux-research/CODEX_RESEARCH_FRONTEND_BACKEND_INTEGRATION_ADDENDUM.md` — mandatory research/integration context**
- `ux-research/phase-0/GAS_UX_FEATURE_FREEZE.md`
- `ux-research/reference-matrix/REFERENCE_MATRIX.md`
- `ux-research/phase-5/GAS_PATTERN_LIBRARY.md`
- `ux-research/phase-6/GAS_INFORMATION_ARCHITECTURE.md`
- `ux-research/phase-7/PHASE_7_GATE.md`
- `ux-research/phase-8/PHASE_8_GATE.md`
- GitHub issue #67 for high-level status
- PR #74 for the current integration workbench

The addendum is subordinate to the existing roadmap/gates; it does not create a parallel roadmap. External-product research explains why a law matters. The GAS Reference Matrix and Pattern Library define what GAS owns.

## Mandatory research-first implementation protocol

Before making a substantial UX, frontend, state-model, wallet/account or backend-integration change during Phase 8 or later:

1. read the relevant Phase 1 inventory/compatibility artifacts;
2. read the required Fomo corpus and relevant Phase 3 cross-category research identified in the Codex addendum;
3. read the current Reference Matrix, GAS Pattern Library and Phase 6 information architecture;
4. inspect the current GAS component/API/state surface before deciding to build anything new;
5. internally map `research law -> GAS pattern -> current file/component/API -> gap`;
6. implement inside the existing phase/gate system and prove the behavior with an acceptance test.

Do **not** create a new roadmap document for this mapping. Do **not** copy competitor code, assets, trade dress, vocabulary or framework choices merely because a reference product uses them.

## Locked UX shell

Primary mobile navigation:

```text
Home | Play | Trade | Crews | Account
```

Desktop product destinations:

```text
Home | Play | Trade | Crews | Reserve
```

Desktop utilities:

```text
Search | Notifications | Account
```

Reserve is one action from Home and persistent on larger desktop layouts. Search and Notifications are utilities, not permanent mobile bottom-nav destinations.

The layout may change by surface. Identity, relationships, economic objects and account state must remain canonical across surfaces.

## Frontend/backend authority law

React components are presentation, not the authoritative financial system.

Target separation:

```text
PRESENTATION
React / Next components
        │
        ▼
FEATURE CONTROLLER / QUERY LAYER
hooks / React Query / local presentation state
        │
        ▼
DOMAIN ADAPTER
account | game | trade | social | reserve/rebase | notifications
        │
        ▼
AUTHORITATIVE SOURCES
backend APIs | indexer | database | oracle | contracts | wallet
```

React Query remains the standard client/server-state boundary where appropriate. Preserve explicit loading/ready/stale/degraded/error semantics and richer money-action states where finality matters.

Important data must preserve authority/provenance class:

- canonical/authoritative;
- backend/indexer-derived;
- user-authored;
- presentation/prototype.

A lower-authority value must never be presented as settled canonical truth. Optimistic UX may acknowledge receipt of an action, but must not claim settlement before settlement is known.

## Canonical account/social laws

- Privy/authenticated GAS user ID is the canonical account identity; wallets are linked financial credentials/asset sources, not the primary social identity.
- Do not silently merge people because wallet relationships change.
- GAS uses one social graph across Play, Trade, Crews, reserve/rebase events and future Bracket surfaces.
- Verified economic activity separates protocol fact, derived performance and user commentary.
- Feed/Profile/Crew/Notifications/Search should reference canonical activity objects rather than duplicating economic truth per surface.
- Notifications and search results should carry typed canonical target identifiers/routes rather than encoding truth only in copy.

## Financial invariants

Never collapse or cross-subsidize these accounting domains:

```text
GAS monetary reserve != GAS game bankroll != future Bracket collateral
```

Additional invariants:

- external assets only count as GAS reserve backing;
- GAS/wGAS/self-issued LP value cannot back GAS;
- game losses cannot call ReserveVault;
- wGAS must remain exactly share-backed;
- future Bracket must function without GAS and cannot create circular solvency;
- financial state shown to users must distinguish spendable cash, locked wagers, marked positions, potential payout and protocol reserves.

## Money-action state/recovery law

Real financial intents must eventually have canonical action identity, expiry/idempotency and reconciliation behavior so stale requests cannot unexpectedly execute twice.

The consumer recovery hierarchy is:

1. did money move / financial state;
2. current canonical action state;
3. safe next action;
4. technical detail.

If finality is uncertain, reconcile before retry. Do not surface raw RPC or `execution reverted` text as the primary recovery experience.

## Current prototype truth boundary

The verified Phase 7 GAS Original implementation remains an interaction prototype while Phase 8 adapts the same product model to desktop:

- no funds move;
- no live RNG/VRF;
- illustrative results are labeled;
- no fabricated reserve/rebase/social data;
- real settlement, bankroll, oracle and RNG adapters enter later.

Do not convert illustrative prototype data into claims of live protocol behavior.

The Phase 7 controller/view separation is intentional. Phase 9+ should replace prototype adapters behind the controller boundary rather than rewriting the view around a single contract call.

## Deprecated concepts

Do not reintroduce without an explicit new decision:

- old receipt/gas-refund GASCOIN product as the primary application;
- CORE/pressure user-facing branding;
- CALM/LIVE/WILD or STABLE/SURGE/BREACH mode naming;
- Index-Settled CCA, SEAL, CRACK;
- reserve-backed gambling liabilities;
- mandatory Bracket dependency in Phase 1;
- mandatory GAS Bracket collateral;
- literal competitor code/assets/trade-dress copying.

## Research policy

Public products may be studied for observable UX behavior, information architecture, interaction patterns, state machines and measurable journeys. Normalize useful behavior into GAS-owned patterns before implementation.

Never fabricate measurements that were not directly observed. Mark inaccessible/native/authenticated measurements unavailable when necessary.

Research-derived implementation must be traceable as:

```text
USER PROBLEM
-> REFERENCE LAW
-> GAS PATTERN
-> EXISTING REPO SURFACE
-> IMPLEMENTATION
-> ACCEPTANCE TEST
```

## Engineering conventions

- Next.js App Router / React / TypeScript.
- Prefer GAS-native feature modules under `components/gas/` and protocol/state contracts under `lib/project-gas/`.
- Keep view components separate from protocol/adapter/state orchestration where practical.
- Reuse/evaluate mature generic infrastructure before replacing it: auth, health, `/me`/public-data patterns, RPC abstraction, API versioning, webhooks, Sentry, rate limits, audit logs, caching, Supabase/storage and test infrastructure.
- Retire refund-specific claims/receipt/refund/gates/standing semantics only after generic utilities are extracted or proven unused.
- Money-moving flows must use explicit states and reconciliation before retry when finality is uncertain.
- Avoid `networkidle` as an E2E readiness primitive on apps with polling/live connections; assert deterministic UI readiness instead.
- No hidden wallet/RPC/network jargon in normal consumer flows.
- Minimum primary mobile touch target: 44px.
- Core Play action/replay must remain reachable above the fixed nav at 390×844.
- Phase 8 must preserve the same routes, identity/account semantics, state semantics and primary action model on desktop rather than inventing a terminal-only second product.
- Advanced depth belongs behind progressive disclosure; it may expand on desktop but may not displace GAS Gauge -> risk -> wager -> IGNITION.
- Do not fabricate social activity, liquidity, reserve values, rankings or cryptographic proof to make a prototype appear alive.
- New GAS feature styles should prefer scoped GAS modules/tokens and incremental migration rather than a wholesale `globals.css` rewrite.

## Test commands

```bash
npm run test
npm run test:e2e:gas
npm run test:e2e:legacy
npm run build
```

`Project GAS CI` separates Unit, Production Build, Project GAS E2E and Legacy Compatibility E2E.

## Phase 8 research-integration gate

Before Phase 8 can pass, explicitly review the implementation against:

- `ux-research/phase-2/fomo/FOMO_DESKTOP_MOBILE_PARITY.md`;
- `ux-research/phase-2/fomo/FOMO_TO_GAS_MAP.md`;
- `ux-research/phase-3/CROSS_CATEGORY_FINDINGS.md`;
- `ux-research/phase-3/PHASE_3_REVALIDATION_2026-08-16.md`;
- `ux-research/reference-matrix/REFERENCE_MATRIX.md`;
- `ux-research/phase-5/GAS_PATTERN_LIBRARY.md`;
- `ux-research/phase-1/COMPATIBILITY_MATRIX.json`;
- `ux-research/phase-6/GAS_INFORMATION_ARCHITECTURE.md`.

Confirm desktop/mobile ontology parity, canonical social/account state, Play action dominance, progressive advanced depth, truthful financial semantics/provenance, no fake activity, and no return of the legacy refund ontology.

## Task/control model

- **Roadmap** = sequencing and phase gates.
- **Codex research/integration addendum** = mandatory research-to-implementation and frontend/backend authority law.
- **Beads** = detailed dependency-aware agent work graph when available.
- **GitHub issue #67** = high-level human-visible status.
- **PR #74 / ux-lab** = current code/research workbench.
- **Tests/benchmarks** = objective acceptance.

Do not create a competing roadmap or source-of-truth document.

## Merge discipline

`ux-lab` is intentionally exploratory and may contain many small commits. When the canonical integration is approved, prefer **squash merge** into `main` so main receives one intentional Project GAS change set rather than research/workbench history.
