# Project GAS — Work Cloud Handoff

**Date:** 22 August 2026  
**Status:** handoff/index only; subordinate to canonical roadmap, phase gates and Source of Truth v1.1.  
**Purpose:** let a fresh ChatGPT Work cloud chat continue Project GAS without relying on chat history.

## Work role

Act as lead developer/protocol engineer/UX engineer/researcher/release gatekeeper. Do routine GitHub/research/test/debug work directly when tools permit. Do not send the user back to terminal/GitHub for routine work. Ask only for genuine OPEN product/economic/legal decisions.

## Bootstrap

1. Use `ChicoPanama/gascoin-eth`.
2. Work on `ux-lab`, never `main`.
3. Read PR #74 and issue #67.
4. Refetch current `ux-lab` head before every session/write.
5. Read `AGENTS.md`, `ux-research/ROADMAP.md`, `ux-research/phase-9/PHASE_9_GATE.md`, `ux-research/phase-9/PHASE_9_FOUNDATION_CHECKPOINT.md`, `ux-research/CODEX_RESEARCH_FRONTEND_BACKEND_INTEGRATION_ADDENDUM.md`, Phase 0 feature freeze, Phase 1 compatibility artifacts, Phase 4 Reference Matrix, Phase 5 Pattern Library and Phase 6 IA.
6. If available in Project files, read `Project_GAS_Source_of_Truth_v1.1.docx`.
7. Inspect current code/API/tests before building new surfaces.
8. Verify CI on the exact head before calling work verified.
9. Keep PR #74 draft unless explicitly authorized otherwise.
10. No merge/mainnet/production financial action without explicit user approval.

## Source precedence

1. newest explicit user instruction;
2. Project GAS Source of Truth v1.1 for protocol/economic/product decisions;
3. Phase 0 feature freeze for UX constraints except where v1.1 explicitly supersedes it;
4. `ux-research/ROADMAP.md` + active phase gate for sequencing;
5. `AGENTS.md` for engineering/research rules;
6. Reference Matrix / Pattern Library / IA;
7. research evidence;
8. old chats/prototypes only as historical context.

### Known reconciliation issue

Source of Truth v1.1 explicitly supersedes direct GAS game entry for canonical Phase 1. Player-facing game entry is:

`USDC -> automatic/invisible GAS sourcing/credit -> CRUISE/BOOST/REDLINE -> IGNITION -> GAS-native wager -> VRF -> GAS GAUGE -> GAS payout`

Direct player-facing GAS entry is superseded. Some prototype/UX artifacts still expose GAS/USDC because they predate v1.1. Treat this as a divergence to reconcile, not a reopened decision.

## Core product

- GAS = primary reserve-backed elastic asset.
- wGAS = non-rebasing/fixed-share wrapper.
- GSD = OPEN/RESERVED; no second Phase 1 token without explicit approval.
- GAS Original = signature high-frequency game.
- Modes = CRUISE / BOOST / REDLINE.
- Primary action = IGNITION.
- Result instrument = GAS GAUGE.
- First accepted conventional social game = provably-fair roulette.
- SocialFi = one GAS identity/social graph, verified activity, profiles, Crews, rankings, referrals, notifications/deep links.
- Bracket = future economic integration, financially separate and not a Phase 1 dependency.

## Monetary kernel

Working accounting: `walletVisibleGAS = walletShares × globalIndex`.

- Rebase changes global index, not every wallet.
- wGAS remains exactly share-backed.
- Visible daily rebase; approximate $1 visible-GAS reference.
- Exact oracle/deadband/caps/controller/pause law remains OPEN.
- Reserve-assisted elasticity/AMO ideas are preserved research direction, not frozen parameters.

## Reserve firewall

Only approved external assets count as GAS backing. Never count GAS, wGAS, self-issued GAS POL value, GameBankroll or Bracket collateral as monetary backing. Reserve strengthens monetary credibility/liquidity/stabilization; it is not a casino-loss backstop or Bracket guarantee.

RWA direction is accepted; exact issuers/custody/oracles remain OPEN. Preserve later research on Liquidity/Income/Growth/Insurance reserve segmentation and an Excess-Backing-only BLF, but do not prematurely implement it.

## Launch/economics

- Launch direction = simple presale, not CCA.
- CCA/SEAL/CRACK deprecated.
- Team principal-exit requirement retained; exact mechanics OPEN.
- GAS buy/sell fee LOCKED: 2.00% = 1.50% protocol + 0.50% team.
- Protocol 1.50% internal allocation remains OPEN.
- Trading volume, game handle, reserve yield and future Bracket revenue are separate bases; never double count.

Game handle economics LOCKED:

| Period | RTP | GAS protocol | Team |
|---|---:|---:|---:|
| Days 1–14 | 90% | 7% | 3% |
| Days 15–28 | 92% | 6% | 2% |
| Days 29–42 | 93% | 5% | 2% |
| Day 43+ | 95% | 4% | 1% |

Exact CRUISE/BOOST/REDLINE probability/payout tables remain OPEN and must mathematically reproduce the active epoch expected RTP.

## Financial firewalls

`GAS monetary Reserve != GameBankroll != future Bracket collateral`

Also distinguish user spendable GAS/USDC, locked wagers, pending intents, marked future positions and potential payouts.

GameBankroll owns game inventory/liability, performs risk checks and settles payouts. It may source GAS through game-domain inventory and/or approved external liquidity. It may never pull ReserveVault assets to cover game losses.

## Bracket

Economically interconnected, financially separable. GAS is not mandatory Bracket collateral at launch; GAS Phase 1 must work without Bracket. Optional later utility can include shared identity, rebates, staking/liquidity incentives and an Excess-Backing-only liquidity facility. Bracket collateral cannot count as GAS backing and GAS reserve cannot guarantee Bracket outcomes.

## Chain

Final deployment chain remains OPEN. EVM/Base ancestry exists; Robinhood Chain/RWA distribution was explored. Keep Phase 1 EVM-modular. Do not silently make Base or Robinhood Chain canonical.

## Roadmap

Phases 0–8 PASS/CLOSED.  
**Phase 9 — Vertical-loop implementation: ACTIVE.**  
Phases 10–11 NOT ACTIVE.

Do not create another numbered roadmap. Do not activate Phase 10 until the Phase 9 gate explicitly passes.

## Responsive shell — already built, do not redesign

Mobile: `Home | Play | Trade | Crews | Account`  
Desktop: `Home | Play | Trade | Crews | Reserve`  
Desktop utilities: `Search | Notifications | Account`

Verified viewports: 390×844, 768×1024, 1440×900, 1920×1080.

GAS Original hierarchy remains `GAS GAUGE -> RISK -> WAGER -> IGNITION`; result -> replay is one action.

Phase 8 code-bearing close: `6e1f80218570e9bbe1bd95447dec0009c6ca2acc`, CI #414 PASS.

## Current Phase 9 implementation

Verified code-bearing foundation: `0cc55c8c787bb10af99ef253d5ebc3f5080d103a`, CI #469 full PASS.

Current status head before this handoff commit: `316986efd81d38271689262f9114e6967d327c37`, CI #470 PASS.

Implemented:

- canonical account read model with explicit Project GAS asset config and no legacy GASCOIN fallback;
- game adapter interface / `intentId` / `roundId` architecture only;
- reserve/rebase read model with source/freshness/exclusions;
- read-only Trade quote truth with amount/fee/output/minimum-received/impact/source/expiry;
- one canonical verified activity projection powering Home/Account/deep links;
- Crew/ranking read path with source/freshness/formula requirements;
- shared recovery law: DID MONEY MOVE? -> canonical state -> safe next action -> technical detail.

Still NOT IMPLEMENTED/LIVE:

- real wager execution/locking;
- GameBankroll mutation/solvency integration;
- live RNG/VRF and production round verification;
- real wager refresh/reconnect/reconciliation;
- Trade signing/submission/settlement;
- live funding/withdrawal providers;
- production bounded permission/revoke flow;
- approved production asset/read-source configuration.

## Authority/configuration

Public asset config:

- `NEXT_PUBLIC_PROJECT_GAS_CHAIN_ID`
- `NEXT_PUBLIC_PROJECT_GAS_TOKEN_ADDRESS`
- `NEXT_PUBLIC_PROJECT_GAS_USDC_ADDRESS`

Server read sources:

- `PROJECT_GAS_RESERVE_READ_URL`
- `PROJECT_GAS_ACTIVITY_READ_URL`
- `PROJECT_GAS_TRADE_QUOTE_READ_URL`
- `PROJECT_GAS_CREWS_READ_URL`

Matching optional `*_READ_TOKEN` secrets are supported. Missing/unapproved config stays explicitly unavailable; never invent addresses/endpoints/data.

## Architecture law

`PRESENTATION -> CONTROLLER/QUERY -> DOMAIN ADAPTER -> AUTHORITATIVE SOURCE`

React is never settled financial truth. Optimistic acknowledgement is allowed; optimistic settlement is not. Unknown finality reconciles before retry.

## Engineering conventions

Next.js App Router / React / TypeScript; Privy; wagmi/viem; React Query; Vitest; Playwright. Prefer `components/gas/`, `lib/project-gas/`, `hooks/`, `app/api/project-gas/`. Reuse mature auth/RPC/health/Sentry/rate-limit/audit/cache/Supabase/API/webhook/test infrastructure. No wholesale framework/CSS/auth rewrite. Do not delete generic legacy infrastructure without proving it unused.

## CI discipline

Run/verify:

```bash
npm run test
npm run build
npm run test:e2e:gas
npm run test:e2e:legacy
```

Project GAS CI lanes: Full Dependency Security, Unit Tests, Production Build, Project GAS E2E, Legacy Compatibility E2E.

Never use a previous SHA's green CI after the branch moves. Fix root cause of failures; only update stale tests when canonical truth changed. Refetch file/blob SHA before connector writes; never write the same file concurrently.

## Open decisions — do not guess

Still OPEN: rebase controller/oracles/deadband/caps; reserve minimums/whitelist/RWA custody/oracles/haircuts; presale terms; team principal exit; allocation of protocol trading/game buckets; game payout tables; Game Entry Router sourcing/netting/slippage/failure policy; RNG/VRF/fallback; GameBankroll risk limits; Crew/referral economics/anti-Sybil; governance/roles/pause/upgrade; final chain/liquidity venue; funding/withdrawal providers; bounded permissions; legal/regulatory structure; future GAS-vs-GSD split; optional future Bracket collateral criteria.

When implementation needs an OPEN choice, prepare a decision packet with recommendation, alternatives, failure modes and exact parameters requiring approval. Ask the user only for the real decision.

## Immediate path forward

1. Reconcile USDC-only canonical game entry across Phase 0 docs/prototype/game UI/types/tests without damaging useful internal GAS accounting abstractions. Run full CI.
2. Create a Phase-9-subordinate protocol decision dependency packet, not a new roadmap. Recommended order: chain/tooling -> share/index/wGAS -> rebase law -> reserve policy -> bankroll solvency -> Game Entry Router -> mode math -> RNG/failure recovery -> presale/principal exit -> fee routing -> governance -> account rails -> legal.
3. Build simulations/tests before freezing economics: rebase shock simulations, no-self-backing reserve math, exact epoch RTP, bankroll max-liability, router inventory/slippage, idempotency/retry, fee accounting, wGAS share backing.
4. Implement authoritative modules behind existing adapters; do not bind React directly to single contract methods.
5. Testnet before production; require deploy reproducibility, role wiring, fuzz/invariants, failure recovery, stale-data behavior, account reconnect, mobile/desktop regression and audit plan.
6. Close Phase 9 only when real authoritative vertical loops and recovery satisfy its gate and exact-head CI is green.
7. Then Phase 10 benchmarking, followed by Phase 11 friction destruction.

## Release failsafes

No mainnet without explicit approval. No invented token/oracle/provider. No fake activity/reserve/settlement/RNG. No blind financial retry. No reserve-to-game bailout. No Bracket circular collateral. No `npm audit fix --force` without dependency analysis. No weakening security/economic tests to make CI green. No merge merely because GitHub says mergeable.

If platform policy prevents a real-money wager execution/RNG/bankroll-settlement component, preserve the adapter boundary, continue all permitted architecture/testing work and state the blocker clearly; never bypass policy or fake completion.

## Communication

Do the work when tools allow. Do not ask questions already answered in repo/project context. Give concise progress during long tasks. When blocked by an OPEN decision, recommend one path and ask only for that decision. On completion report exact branch/commit, tests/CI, what remains and whether phase status changed.

## No-fail checklist

Before calling work complete, answer: canonical authorization? owning phase? existing surface? financial domain? authority source? unavailable behavior? stale/pending/recovery? duplicate protection? happy-path test? failure test? mobile regression? desktop regression? legacy regression? invariant change? authority overclaim? OPEN parameter? exact-head CI green? durable GitHub status synchronized? merge/deploy authorization present?

If any answer is unknown, the work is not finished.
