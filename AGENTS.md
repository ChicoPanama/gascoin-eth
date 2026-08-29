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

## Canonical Phase 1 chain

D01 was explicitly approved on 22 August 2026:

- Base is the fixed Project GAS Phase 1 execution chain;
- Base Sepolia is the public integration testnet;
- Foundry is the canonical Solidity build/test/deploy toolchain;
- Ethereum may later serve a reserve/settlement role but is not the high-frequency game chain;
- Robinhood Chain remains a portability/RWA research target, not a Phase 1 dependency.

Provider URLs, contract addresses, paymasters, onramps, liquidity venues, RNG
providers and downstream economic parameters remain configuration/approval
boundaries. Fixing Base does not authorize a mainnet deployment.

## Canonical GAS Original entry boundary

Source of Truth v1.1 supersedes the older dual-asset player-entry prototype.

Phase 1 player flow is:

```text
USDC entry
-> automatic/invisible GAS sourcing or credit
-> CRUISE / BOOST / REDLINE
-> IGNITION
-> GAS-native wager
-> RNG / settlement
-> GAS payout
```

Do not expose a player-facing GAS/USDC selector or direct GAS entry. Preserve GAS-native wager, bankroll, liability and payout accounting behind the Game Entry Router/adapter boundary. Exact sourcing, netting, slippage and failure policy remain OPEN and must not be invented.

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
- Phase 8 — Desktop adaptation: PASS
- **Phase 9 — Vertical-loop implementation: ACTIVE**
- Phases 10–11 are not active until their gates open.

Pre-work is allowed; gate-skipping is not.

## Source of truth

Read these before making product-level decisions:

- `ux-research/ROADMAP.md`
- **`ux-research/CODEX_RESEARCH_FRONTEND_BACKEND_INTEGRATION_ADDENDUM.md` — mandatory research/integration context**
- `ux-research/phase-0/GAS_UX_FEATURE_FREEZE.md`
- `ux-research/phase-4/REFERENCE_MATRIX.json`
- `ux-research/phase-5/PATTERN_LIBRARY.md`
- `ux-research/phase-6/INFORMATION_ARCHITECTURE.md`
- `ux-research/phase-7/PHASE_7_GATE.md`
- `ux-research/phase-8/PHASE_8_GATE.md`
- `ux-research/phase-8/PHASE_8_RESEARCH_INTEGRATION_REVIEW.md`
- `ux-research/phase-9/PHASE_9_GATE.md`
- GitHub issue #67 for high-level status
- PR #74 for the current integration workbench

The addendum is subordinate to the existing roadmap/gates; it does not create a parallel roadmap. External-product research explains why a law matters. The GAS Reference Matrix and Pattern Library define what GAS owns.

## Mandatory research-first implementation protocol

Before making a substantial UX, frontend, state-model, wallet/account or backend-integration change during Phase 9 or later:

1. read the relevant Phase 1 inventory/compatibility artifacts;
2. read the required Fomo corpus and relevant Phase 3 cross-category research identified in the Codex addendum;
3. read the current Reference Matrix, GAS Pattern Library and Phase 6 information architecture;
4. inspect the current GAS component/API/state surface before deciding to build anything new;
5. internally map `research law -> GAS pattern -> current file/component/API -> gap`;
6. implement inside the existing phase/gate system and prove the behavior with an acceptance test.

Do **not** create a new roadmap document for this mapping. Do **not** copy competitor code, assets, trade dress, vocabulary or framework choices merely because a reference product uses them.

## Locked responsive shell

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

Phase 8 closed on final code-bearing head `6e1f80218570e9bbe1bd95447dec0009c6ca2acc`, Project GAS CI run #414, with Full Dependency Security, Unit Tests, Production Build, Project GAS E2E and Legacy Compatibility E2E all passing.

Approved responsive verification viewports:

- 390×844 mobile regression;
- 768×1024 tablet;
- 1440×900 desktop;
- 1920×1080 wide desktop.

Reserve is one action from Home on mobile and persistent on desktop. Search and Notifications are utilities, not permanent mobile bottom-nav destinations.

The layout may change by surface. Identity, relationships, economic objects and account state must remain canonical across surfaces.

Do not redesign the shell during Phase 9 merely because live adapters are being introduced.

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

Real financial intents need canonical action identity, expiry/idempotency and reconciliation behavior so stale requests cannot unexpectedly execute twice.

The consumer recovery hierarchy is:

1. did money move / financial state;
2. current canonical action state;
3. safe next action;
4. technical detail.

If finality is uncertain, reconcile before retry. Do not surface raw RPC or `execution reverted` text as the primary recovery experience.

## Phase 9 active vertical-loop contract

`ux-research/phase-9/PHASE_9_GATE.md` is the active implementation gate.

Dependency order inside Phase 9:

1. canonical account read model;
2. GAS Original real adapter boundary and idempotent intent/round identity;
3. RNG/fairness/bankroll settlement integration;
4. reserve/rebase authoritative read model;
5. Trade quote/intent/settlement loop;
6. one canonical verified activity projection;
7. Crews/rankings live read path;
8. funding/withdrawal/permissions/recovery.

This is dependency ordering within Phase 9, not a competing numbered roadmap.

### Required canonical money-action semantics

Game and Trade adapters must distinguish acknowledgement from settlement.

Game lifecycle target:

```text
READY
-> INTENT_CREATED
-> LOCKING
-> LOCKED
-> RESOLVING
-> SETTLED
-> RESULT
```

Interrupted/unknown flow:

```text
UNKNOWN / INTERRUPTED
-> RECONCILING
-> SETTLED | FAILED_RETRY_SAFE | FAILED_NOT_RETRY_SAFE | ACTION_REQUIRED
```

Every wager must have a stable `intentId`; every resolved game must have a canonical `roundId`. Duplicate click/retry must not create a second wager while a prior intent may have executed.

The adapter must preserve the entry-domain split: player intent is denominated in USDC, while the accepted/locked internal wager and payout are denominated in GAS. React must not fabricate the sourced GAS amount; the authoritative entry adapter/router owns it.

Trade lifecycle target:

```text
AMOUNT
-> QUOTE
-> REVIEW
-> INTENT_CREATED
-> SUBMITTED/PENDING
-> SETTLED | FAILED/RECOVERY
```

Quotes must expose expiry and financially material fee/output information before confirmation.

## Prototype/live truth boundary during Phase 9

Phase 9 may contain mixed maturity. That is acceptable when each surface states its authority accurately.

Examples:

- real account + prototype game;
- real account/game + unavailable reserve;
- live reserve read model + unavailable social activity.

Until an authoritative adapter is connected and tested, preserve the explicit Phase 7/8 prototype/unavailable behavior:

- no claim that funds moved when they did not;
- no claim of live RNG/VRF without the real verification path;
- illustrative results remain labeled;
- no fabricated reserve/rebase/social values;
- no fabricated live player counts, bankroll or rankings.

The Phase 7 controller/view separation and Phase 8 responsive shell are intentional. Phase 9 replaces prototype data/state **behind** those boundaries rather than rewriting the view around a single contract call.

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
- Keep view components separate from protocol/adapter/state orchestration.
- Reuse/evaluate mature generic infrastructure before replacing it: auth, health, `/me`/public-data patterns, RPC abstraction, API versioning, webhooks, Sentry, rate limits, audit logs, caching, Supabase/storage and test infrastructure.
- Retire refund-specific claims/receipt/refund/gates/standing semantics only after generic utilities are extracted or proven unused.
- Money-moving flows must use explicit states and reconciliation before retry when finality is uncertain.
- Avoid `networkidle` as an E2E readiness primitive on apps with polling/live connections; assert deterministic UI readiness instead.
- No hidden wallet/RPC/network jargon in normal consumer flows.
- Minimum primary mobile touch target: 44px.
- Core Play action/replay must remain reachable above the fixed nav at 390×844.
- Phase 9 must preserve the Phase 8 responsive routes, identity/account semantics, state semantics and primary action model rather than introducing a live terminal-only second product.
- Advanced depth belongs behind progressive disclosure; it may expand on desktop but may not displace GAS Gauge -> risk -> wager -> IGNITION.
- Do not fabricate social activity, liquidity, reserve values, rankings or cryptographic proof to make an unwired surface appear alive.
- New GAS feature styles should prefer scoped GAS modules/tokens and incremental migration rather than a wholesale `globals.css` rewrite.
- Contracts/oracles/providers must be configuration-driven; never hard-code an unapproved production address simply to make a vertical loop appear complete.

## Test commands

```bash
npm run test
npm run test:e2e:gas
npm run test:e2e:legacy
npm run build
```

`Project GAS CI` separates Full Dependency Security, Unit Tests, Production Build, Project GAS E2E and Legacy Compatibility E2E.

## Task/control model

- **Roadmap** = sequencing and phase gates.
- **Codex research/integration addendum** = mandatory research-to-implementation and frontend/backend authority law.
- **Phase 9 gate** = current vertical-loop implementation contract.
- **Beads** = detailed dependency-aware agent work graph when available.
- **GitHub issue #67** = high-level human-visible status.
- **PR #74 / ux-lab** = current code/research workbench.
- **Tests/benchmarks** = objective acceptance.

Do not create a competing roadmap or source-of-truth document.

## Merge discipline

`ux-lab` is intentionally exploratory and may contain many small commits. When the canonical integration is approved, prefer **squash merge** into `main` so main receives one intentional Project GAS change set rather than research/workbench history.
