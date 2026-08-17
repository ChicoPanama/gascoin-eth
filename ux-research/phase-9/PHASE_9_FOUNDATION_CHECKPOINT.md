# Phase 9 — Verified Foundation Checkpoint

**Status:** VERIFIED CHECKPOINT / PHASE 9 REMAINS ACTIVE  
**Code-bearing head:** `0cc55c8c787bb10af99ef253d5ebc3f5080d103a`  
**CI:** Project GAS CI run #469 — PASS

## CI evidence

Run #469 passed all required lanes:

- Full Dependency Security — PASS
- Unit Tests — PASS
- Production Build — PASS
- Project GAS E2E — PASS
- Legacy Compatibility E2E — PASS

This checkpoint preserves all Phase 7 mobile and Phase 8 responsive regressions while adding the Phase 9 authority/read-model tests through GAS33.

## Implemented and verified

### V1 — Canonical account read model

Implemented:

- `lib/project-gas/asset-config.ts`
- `lib/project-gas/account-state.ts`
- `hooks/useProjectGasAccount.ts`
- `components/gas/GasAccountSummary.tsx`
- Home / Account / GAS Original authority integration
- unit and E2E authority tests

Behavior:

- Privy remains canonical account identity;
- Privy/wagmi relationship exposes the active financial wallet;
- spendable GAS/USDC can become authoritative only from explicitly configured Project GAS contracts;
- legacy GASCOIN token addresses are not reused as Project GAS monetary assets;
- absent contract configuration renders `UNAVAILABLE`, never demo money;
- wrong chain, RPC error, stale data and loading state remain distinct.

### V2 — GAS Original adapter boundary

Implemented architecture only:

- `lib/project-gas/game-adapter.ts`
- canonical `intentId` / `roundId` adapter contract shapes;
- explicit adapter authority descriptor;
- submit/reconcile/resolve result types.

Not implemented at this checkpoint:

- a real-money execution adapter;
- wager locking;
- bankroll mutation;
- live RNG/VRF;
- settlement.

The interactive GAS Original remains explicitly prototype/no-funds/no-live-RNG.

### V3 — RNG / fairness / settlement

**NOT IMPLEMENTED.**

No production claim is made for:

- live RNG/VRF;
- bankroll solvency/settlement;
- real wager execution;
- production provably-fair verification.

The existing round/result UX remains illustrative and labeled accordingly.

### V4 — Reserve / rebase read model

Implemented:

- `lib/project-gas/reserve-state.ts`
- `app/api/project-gas/reserve/route.ts`
- `hooks/useProjectGasReserve.ts`
- `components/gas/GasReserveReadModel.tsx`
- `/reserve` integration
- unit and E2E coverage

Read source configuration:

- `PROJECT_GAS_RESERVE_READ_URL`
- optional `PROJECT_GAS_RESERVE_READ_TOKEN`

Behavior:

- source/freshness/authority required;
- stale/degraded/unavailable states are explicit;
- adjusted external reserve and backing ratio are never inferred when canonical totals are missing;
- reserve component haircuts are source data;
- GAS, wGAS, self-issued POL, GameBankroll and future Bracket collateral are explicit backing exclusions;
- rebase state remains unavailable until canonical rebase data exists.

### V5 — Trade quote/review truth

Implemented **read-only quote truth**, not execution:

- `lib/project-gas/trade-state.ts`
- `app/api/project-gas/trade/quote/route.ts`
- `hooks/useProjectGasTradeQuote.ts`
- `components/gas/GasTradeQuotePreview.tsx`
- `/trade` integration
- unit and E2E coverage

Read source configuration:

- `PROJECT_GAS_TRADE_QUOTE_READ_URL`
- optional `PROJECT_GAS_TRADE_QUOTE_READ_TOKEN`

A canonical quote must include:

- side;
- pay/receive assets and amounts;
- fee amount and bps;
- minimum received;
- price impact;
- quote ID;
- source;
- quoted-at timestamp;
- expiry.

Expired/stale/incomplete quotes cannot masquerade as ready.

**Transaction submission, wallet signing and settlement are not enabled by this surface.**

### V6 — One canonical verified activity projection

Implemented:

- `lib/project-gas/activity-state.ts`
- `app/api/project-gas/activity/route.ts`
- `hooks/useProjectGasActivity.ts`
- `components/gas/GasActivityFeed.tsx`
- `components/gas/GasActivityDetail.tsx`
- `/activity/[id]`
- Home + Account integration
- unit and E2E coverage

Read source configuration:

- `PROJECT_GAS_ACTIVITY_READ_URL`
- optional `PROJECT_GAS_ACTIVITY_READ_TOKEN`

Behavior:

- one event schema powers multiple surfaces;
- economic events require protocol/on-chain authority rather than user-content authority;
- protocol fact, confirmation, identity, commentary and provenance remain separated;
- malformed economic events are rejected/degrade the projection;
- no source means `NO LIVE ACTIVITY`, never synthetic players/wins/trades.

### V7 — Crews / rankings read path

Implemented read path:

- `lib/project-gas/crew-state.ts`
- `app/api/project-gas/crews/route.ts`
- `hooks/useProjectGasCrews.ts`
- `components/gas/GasCrewRankings.tsx`
- `components/gas/GasCrewDetail.tsx`
- `/crews` + `/crews/[slug]`
- unit and E2E coverage

Read source configuration:

- `PROJECT_GAS_CREWS_READ_URL`
- optional `PROJECT_GAS_CREWS_READ_TOKEN`

Behavior:

- source, freshness and ranking formula are mandatory for a live ranking;
- duplicate canonical rank is a degraded condition;
- malformed rows are rejected;
- no source means `NO LIVE RANKINGS`, never demo leaders.

### V8 — Funding / withdrawal / permissions / recovery foundation

Implemented recovery/state foundation:

- `lib/project-gas/action-recovery.ts`
- `components/gas/GasAccountOperationsStatus.tsx`
- Account integration
- unit and E2E coverage

Canonical recovery order:

1. did money move?;
2. what is the canonical action state?;
3. what is the safe next action?;
4. only then expose technical detail.

Unknown/pending state is explicitly **not retry-safe**. Retry becomes safe only after canonical state proves no money moved.

Funding, withdrawal and bounded permission execution remain unavailable until approved providers/security/reconciliation are connected.

## Current authority/source configuration

The repository is configuration-driven and intentionally refuses to use invented production addresses/endpoints.

Public asset configuration:

- `NEXT_PUBLIC_PROJECT_GAS_CHAIN_ID`
- `NEXT_PUBLIC_PROJECT_GAS_TOKEN_ADDRESS`
- `NEXT_PUBLIC_PROJECT_GAS_USDC_ADDRESS`

Server read sources:

- `PROJECT_GAS_RESERVE_READ_URL`
- `PROJECT_GAS_ACTIVITY_READ_URL`
- `PROJECT_GAS_TRADE_QUOTE_READ_URL`
- `PROJECT_GAS_CREWS_READ_URL`

Optional read-source bearer secrets:

- `PROJECT_GAS_RESERVE_READ_TOKEN`
- `PROJECT_GAS_ACTIVITY_READ_TOKEN`
- `PROJECT_GAS_TRADE_QUOTE_READ_TOKEN`
- `PROJECT_GAS_CREWS_READ_TOKEN`

If these are absent or invalid, the corresponding surface remains explicitly unavailable.

## Phase 9 status against exit gate

1. Canonical account read architecture — **FOUNDATION PASS**, live GAS/USDC values depend on approved asset configuration.
2. Real GAS Original execution/RNG/settlement — **NOT IMPLEMENTED**.
3. Real wager refresh/reconnect/duplicate-submit recovery — **ARCHITECTURE ONLY / NOT LIVE**.
4. Reserve/rebase authoritative read model — **READ MODEL PASS**, live values depend on approved source.
5. Trade quote/intent/settlement — **QUOTE TRUTH PASS; EXECUTION/SETTLEMENT NOT IMPLEMENTED**.
6. Canonical verified activity projection — **READ MODEL PASS**, live events depend on approved source.
7. Crews/rankings live read path — **READ MODEL PASS**, live rankings depend on approved source.
8. Funding/withdrawal/permissions — **RECOVERY/BOUNDARY FOUNDATION PASS; EXECUTION NOT IMPLEMENTED**.
9. Phase 7/8 regressions — **PASS on CI #469**.
10. Build/unit/Project GAS/legacy CI — **PASS on CI #469**.
11. No fabricated live state — **PASS at checkpoint**.
12. Frontend/backend authority boundaries — **PASS at checkpoint**.

## Gate result

**Phase 9 remains ACTIVE.**

This checkpoint deliberately does not mark Phase 9 complete. The remaining work requires approved authoritative execution/providers/contracts for domains that move money, plus production game RNG/settlement and end-to-end recovery verification. Until those exist, the UI continues to expose mixed maturity honestly rather than simulating a live protocol.
