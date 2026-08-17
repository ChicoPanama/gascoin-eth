# Phase 9 Gate — Vertical-Loop Implementation

**Status:** ACTIVE  
**Predecessor:** Phase 8 — PASS / CLOSED  
**Rule:** Replace prototype truth with authoritative adapters one vertical loop at a time. Do not simulate a production protocol behind a production-looking UI.

## Objective

Turn the verified Phase 7/8 product into a real application architecture by replacing prototype-only state behind stable controller/view boundaries with authoritative account, game, trade, reserve/rebase and social adapters.

Phase 9 is not a visual redesign. The responsive product shell and interaction hierarchy are already proven. Phase 9 makes those surfaces consume real state safely.

## Authority architecture

```text
PRESENTATION
React / Next components
        │
        ▼
FEATURE CONTROLLER / QUERY
hooks / React Query / local presentation state
        │
        ▼
DOMAIN ADAPTER
account | game | trade | reserve/rebase | social | notifications
        │
        ▼
AUTHORITATIVE SOURCES
backend APIs | indexer | database | oracle | contracts | wallet
```

Rules:

- presentation may acknowledge an action but may not invent settlement;
- every live financial value carries source/freshness semantics;
- uncertain finality reconciles before retry;
- canonical IDs survive refresh/reconnect;
- unavailable authoritative sources render unavailable/degraded state rather than fake data.

## Financial firewalls

Never collapse:

```text
user spendable GAS/USDC
!= locked wager
!= GameBankroll
!= GAS monetary ReserveVault
!= protocol-owned liquidity
!= future Bracket collateral/settlement
```

Additional invariants:

- GAS/wGAS/self-issued LP value does not count as external GAS backing;
- game liabilities cannot call the monetary reserve for solvency;
- Bracket remains separately solvent and optional;
- marked value/potential payout is not spendable cash;
- wGAS remains exactly share-backed by its canonical GAS/share accounting.

## Phase 9 implementation order

The order below is a dependency order inside Phase 9, not a second roadmap.

### V1 — Canonical account read model

Create the domain contract that the rest of GAS consumes.

Required semantic fields include:
- canonical GAS user/account identity;
- linked wallet relationships;
- spendable GAS;
- spendable USDC;
- locked wager amount;
- pending transaction/intent state;
- source authority;
- freshness / last-updated state;
- degraded/unavailable state.

The UI must stop using demo spendable values when a real adapter is active. Demo/prototype mode must remain explicit when authoritative data is unavailable.

### V2 — GAS Original real adapter boundary

Keep `GasOriginalPrototype` presentation hierarchy stable while replacing prototype orchestration behind a game adapter/controller contract.

Canonical wager lifecycle:

```text
READY
-> INTENT_CREATED
-> LOCKING
-> LOCKED
-> RESOLVING
-> SETTLED
-> RESULT
```

Failure/recovery branches:

```text
UNKNOWN / INTERRUPTED
-> RECONCILING
-> SETTLED | FAILED_RETRY_SAFE | FAILED_NOT_RETRY_SAFE | ACTION_REQUIRED
```

Required IDs:
- `intentId` — idempotent user action identity;
- `roundId` — canonical game-round identity;
- transaction/request IDs where the authoritative execution layer provides them.

A duplicate click/retry must not create a second wager when the prior intent may have executed.

### V3 — RNG / fairness / settlement integration

Production game mode requires:
- a defined RNG/VRF authority;
- immutable or auditable round inputs;
- canonical result derivation;
- bankroll solvency checks;
- settlement accounting;
- user-verifiable round detail;
- explicit degraded/recovery behavior when randomness or settlement is delayed.

Do not label the game live/provably fair until the actual verification path is connected and tested.

### V4 — Reserve / rebase read model

Create canonical read models for:
- GAS circulation / liability basis;
- adjusted external reserves;
- reserve composition;
- valuation/source timestamp;
- backing ratio/status;
- next/completed rebase state;
- personal before/after rebase impact where available;
- explicit exclusion methodology.

Stale/unavailable values remain visibly stale/unavailable.

### V5 — Trade vertical loop

Canonical flow:

```text
AMOUNT
-> QUOTE
-> REVIEW
-> INTENT_CREATED
-> SUBMITTED/PENDING
-> SETTLED | FAILED/RECOVERY
```

Review must expose financially material facts before confirmation:
- source/destination asset;
- amount;
- GAS protocol trade fee where applicable;
- estimated output;
- minimum received / meaningful impact;
- quote expiry;
- source/provider authority.

Quote expiry/stale intent may not silently execute against a materially changed quote.

### V6 — Verified activity / social projection

Create one canonical activity projection that can power:
- Home activity;
- profile activity;
- Crew activity;
- notifications;
- search/deep links.

Every economic activity object separates:
- canonical protocol fact;
- backend/indexer-derived metrics;
- user-authored commentary;
- provenance/status.

Do not create different economic truth per feed.

### V7 — Crews / rankings live read path

Only after canonical identity/activity exists:
- Crew membership derives from one account/social model;
- ranking formulas are explicit;
- ranking inputs are canonical/derived with provenance;
- anti-Sybil/anti-manipulation assumptions are documented;
- empty/degraded state remains truthful.

### V8 — Funding / withdrawal / permissions / recovery

Sensitive account actions require:
- human-readable bounded scopes;
- step-up authentication where consequential;
- explicit transaction/action state;
- canonical reconciliation;
- visible revoke/exit path;
- no raw RPC error as the primary message.

## Implementation constraints

- Reuse mature repo infrastructure from the Phase 1 compatibility matrix before creating substitutes.
- Privy remains account/wallet orchestration unless a later explicit architecture decision changes it.
- wagmi/viem remain EVM read/write/signature primitives where applicable.
- React Query remains the preferred server-state boundary.
- Existing Sentry, health, audit-log, rate-limit, cache, API versioning and webhook infrastructure should be reused when it fits.
- No wholesale CSS or shell redesign during Phase 9.
- Do not delete legacy generic infrastructure merely because its original GASCOIN domain is retiring.
- Contracts/oracles/providers must be configuration-driven; do not hard-code unapproved production addresses.

## Required tests

Phase 9 must extend unit/integration/E2E coverage for at least:

- authoritative vs prototype/unavailable account state;
- canonical intent ID persistence;
- duplicate-submit prevention;
- refresh during pending wager;
- delayed settlement/reconciliation;
- safe retry vs unsafe retry;
- insufficient spendable balance;
- stale/expired trade quote;
- reserve freshness/stale state;
- social object provenance separation;
- mobile and desktop parity for the same canonical state.

Phase 7/8 responsive and legacy compatibility gates remain regressions throughout Phase 9.

## Release truth rule

A surface may call itself live only when its authoritative adapter and failure/recovery path are connected and tested. It is valid for Phase 9 to contain mixed maturity:

- live account + prototype game;
- live account/game + unavailable reserve;
- live reserve read model + prototype social;

Each surface must state its own authority accurately. There is no requirement to fake all domains live simultaneously.

## Exit requirements

Phase 9 passes only when:

1. canonical account read state is authoritative and cross-device consistent;
2. GAS Original uses a real execution/RNG/settlement adapter with idempotent intent and canonical round identity;
3. refresh/reconnect/failure recovery preserves money truth and prevents duplicate wagers;
4. Reserve/rebase uses authoritative, freshness-aware read state with external-backing exclusions enforced;
5. Trade has a real quote/intent/settlement loop with expiry and fee/output disclosure;
6. one canonical verified activity projection powers social surfaces without duplicate truth;
7. Crews/rankings, when live, derive from canonical identity/activity with explicit metrics;
8. funding/withdrawal/permissions use bounded scopes, appropriate step-up security and reconciled action state;
9. Phase 7 mobile and Phase 8 responsive gates remain green;
10. unit, production build, Project GAS E2E and legacy compatibility remain green;
11. no production-looking surface fabricates live activity, reserve, liquidity, RNG, settlement or rankings;
12. frontend/backend authority boundaries remain explicit and testable.

**Do not activate Phase 10 before this gate is PASS.**
