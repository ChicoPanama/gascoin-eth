# Project GAS — Work Cloud Handoff

**Date:** 23 August 2026  
**Status:** continuation handoff/index only. This document does **not** replace the canonical roadmap, Phase 9 gate, Source of Truth v1.1, or AGENTS.md.  
**Purpose:** let a fresh ChatGPT Work session continue Project GAS with the newest NetNet/Base/Coinbase/Fomo/holder decisions while remaining compatible with the live `ux-lab` implementation program.

## Authority / precedence

Use this order whenever two artifacts appear to conflict:

1. newest explicit user instruction;
2. Project GAS Source of Truth v1.1;
3. `AGENTS.md`;
4. `ux-research/ROADMAP.md`;
5. `ux-research/phase-9/PHASE_9_GATE.md` and its subordinate decision packet;
6. this handoff;
7. competitive/research artifacts;
8. older chats/prototypes.

Research is evidence, not automatic product authority. In particular, the earlier Base research suggestion that GAS should be primarily experienced as a Base App mini app is superseded by the newer explicit product direction below.

## Bootstrap for Work

1. Repository: `ChicoPanama/gascoin-eth`.
2. Work on `ux-lab`, never `main`.
3. PR #74 remains the draft workbench; issue #67 remains high-level visibility.
4. Refetch `ux-lab` before every write. Never rely on a stale blob SHA.
5. Read at minimum:
   - `AGENTS.md`;
   - `ux-research/ROADMAP.md`;
   - `ux-research/phase-9/PHASE_9_GATE.md`;
   - `ux-research/phase-9/PHASE_9_PROTOCOL_DECISION_DEPENDENCIES.md`;
   - `ux-research/phase-9/PHASE_9_FOUNDATION_CHECKPOINT.md`;
   - `ux-research/CODEX_RESEARCH_FRONTEND_BACKEND_INTEGRATION_ADDENDUM.md`;
   - Phase 0 feature freeze, Phase 1 compatibility artifacts, Phase 4 Reference Matrix, Phase 5 Pattern Library, Phase 6 IA;
   - `ux-research/competitive/NETNET_PROTOCOL_TEARDOWN_2026-08-22.md`;
   - `ux-research/competitive/BASE_COINBASE_ECOSYSTEM_INTEGRATION_RESEARCH_2026-08-23.md`;
   - prior `ux-research/handoffs/PROJECT_GAS_WORK_HANDOFF_2026-08-22.md`.
6. Inspect current code/API/tests before adding any new surface.
7. Verify CI on the exact final head before calling work verified.
8. Keep PR #74 draft unless explicitly authorized otherwise.
9. No merge, mainnet deployment, production financial action, provider/address invention, or phase advancement without explicit authority.

## Canonical roadmap status

- Phases 0–8: PASS / CLOSED.
- **Phase 9 — Vertical-loop implementation: ACTIVE.**
- Phases 10–11: NOT ACTIVE.

Do not create a second numbered roadmap. Pre-work is allowed; gate-skipping is not.

Phase 9 remains a live-adapter implementation phase, not a redesign. The existing responsive shell and `GAS GAUGE -> RISK -> WAGER -> IGNITION` hierarchy stay intact.

## Core GAS product

GAS is a standalone consumer crypto product and reserve-backed elastic monetary system with:

- GAS — primary elastic/rebasing monetary asset;
- wGAS — fixed-share/non-rebasing wrapper;
- GAS Original — signature high-frequency game;
- CRUISE / BOOST / REDLINE modes;
- IGNITION as the primary play action;
- GAS GAUGE as the result/trust instrument;
- one GAS identity/social graph;
- profiles, Crews, rankings, verified activity, referrals and deep links;
- Reserve/rebase transparency;
- future Bracket integration that remains financially separate and not a Phase 1 dependency.

Canonical player flow remains:

`USDC -> automatic/invisible GAS sourcing or credit -> CRUISE/BOOST/REDLINE -> IGNITION -> GAS-native locked wager -> verifiable randomness -> GAS GAUGE -> GAS payout -> replay / hold / trade / share`

Do not expose a direct GAS/USDC player-entry selector in Phase 1.

## Standalone GAS app is canonical

**Latest explicit product law:** GAS owns the destination, app, brand, UX, identity, social graph, game and economy.

Base/Coinbase are underneath GAS as infrastructure and optional distribution.

Do not make Base App the required shell for GAS.

A user must be able to use GAS through the standalone GAS web/native/PWA experience with a normal compatible wallet and without using Base App or a Coinbase exchange account.

Base App can provide:

- discovery;
- social cards;
- deep links;
- optional embedded/mini-app compatibility;
- Base Account convenience.

But it is a distribution layer into the same GAS product, not a replacement for the GAS app.

Locked shell remains:

- Mobile: `Home | Play | Trade | Crews | Account`
- Desktop: `Home | Play | Trade | Crews | Reserve`
- Desktop utilities: `Search | Notifications | Account`

## Base direction — D01 approved

The user explicitly approved the recommended Base + Foundry posture on
22 August 2026. Work must now treat Base as the fixed Phase 1 chain, not merely
the leading candidate.

Approved posture:

- Base fixed Phase 1 execution target;
- Base Sepolia first public integration testnet;
- Foundry canonical Solidity build/test/deploy toolchain;
- standard EVM Solidity core with portability;
- Ethereum L1 retained as possible reserve/staking settlement domain, not high-frequency game execution;
- Robinhood Chain retained as portability/RWA research candidate, not Phase 1 dependency.

Do not hard-code permanent Flashblocks semantics; Base is moving toward native ~200 ms blocks. Keep latency/finality behind adapters.

## Coinbase/Base integration law

Coinbase/Base integrations are **accelerators, not protocol dependencies**. Every integration must degrade gracefully to a standard Base/EVM path.

Use adapters for:

- Base Account vs normal EOA vs embedded smart wallet;
- CDP Paymaster vs normal user-paid Base gas;
- Coinbase Onramp/Base Pay vs direct USDC funding/future providers;
- Base App/Farcaster distribution vs direct GAS/X/Telegram/Discord links;
- XMTP Crew messaging vs GAS-native notifications;
- Aerodrome/Uniswap/future venues;
- Base MCP/agent features later.

The user-facing product should say things like `FAST PLAY`, `ADD FUNDS`, `FREE NETWORK FEE`, not expose SDK/provider jargon.

## Current account identity compatibility

AGENTS/Phase 9 currently make the authenticated Privy GAS user ID the canonical account identity/orchestration layer, with wallets as linked financial credentials.

Do **not** silently replace Privy during Phase 9.

New direction should extend the model:

`canonical GAS account -> linked X proof + linked Base Account + linked EOA/embedded wallets + Farcaster/Basename/Base Verify proofs`

A later explicit account-architecture decision may change the provider implementation, but today Work must preserve current canonical account semantics and add integrations behind adapters.

## X / Crypto Twitter identity

X is a first-class public identity and distribution signal because Crypto Twitter is central to crypto culture and acquisition.

A user may choose an X handle as their public display identity, but:

- X is not custody;
- X is not the canonical financial account;
- losing/changing X must not destroy GAS identity/history;
- wallets remain separate linked credentials.

Use verified X/Base Verify/social proof for:

- public profile identity;
- anti-Sybil evidence;
- creator/partner eligibility;
- referral eligibility;
- Crew discovery;
- social distribution/reputation.

Never change game odds/RTP based on follower count or social status.

## Wallet/account capability layer

Target pattern:

`presentation -> GAS controller -> Wallet/Account Adapter -> authoritative financial adapter/contracts`

Capability detection can support:

- Base Account app account/subaccount and bounded spend permissions;
- sponsored ERC-4337 UserOperations;
- EOA + Permit/Permit2/session patterns when safe;
- normal signed-transaction fallback.

Normal wallet users must still have a first-class experience.

Any `FAST PLAY` / play-budget permission must visibly expose amount cap, max wager, expiry, allowed action scope and revoke path. No hidden unlimited approvals.

## GAS / wGAS monetary kernel

Working accounting remains:

`walletVisibleGAS = walletShares × globalIndex`

Rebase changes the global index, not every underlying share balance.

wGAS is the fixed-share/non-rebasing representation and must remain exactly share-backed.

**wGAS holders participate fully in GAS rebase economics.**

Example:

- before +5% rebase: `1 wGAS = 1.00 GAS`;
- after +5% rebase: `1 wGAS = 1.05 GAS`;
- 1,000 wGAS remains 1,000 wGAS but unwraps to/represents 1,050 GAS.

Negative rebases work symmetrically.

Do not add an independent wGAS staking-yield mechanism that double-counts the same rebase value.

Holder systems must normalize both direct GAS and wGAS back to underlying shares so wrapping never destroys tenure, referral alignment, Crew benefits or future governance eligibility.

Exact precision, rounding, wrap/unwrap edge law and controller remain D02/D03 work and must not be guessed.

## Holders are first-class

GAS now explicitly serves four first-class constituencies:

- players;
- traders;
- holders;
- social/distribution users.

The intended crypto journey is:

`discover -> play/buy -> own GAS -> hold -> deepen alignment -> refer/join Crew -> grow with protocol`

Near-term holder value should come from real utility/alignment, not reflexive `stake GAS -> endless GAS` emissions.

Research/implementation candidates:

- time-weighted holder status;
- holder tenure/profile status;
- holder-adjusted fee benefits;
- holder-adjusted USDC referral economics;
- Crew creation/privileges;
- early access/campaign tools;
- future bounded governance.

Direct USDC revenue sharing to holders is a legally sensitive future option and remains explicitly OPEN/gated. Do not implement it without legal/economic approval.

## Holder alignment

Do not use one-block whale snapshots as the primary loyalty mechanism.

Preferred direction for simulation:

`time-weighted underlying GAS shares across direct GAS + wGAS`

Potential additional inputs may include holding duration and verified protocol/Crew contribution.

Do not include X follower count in financial holder alignment.

Exact score, thresholds, tiers and benefits remain OPEN.

## Fomo-style referral/distribution system

Copy the successful **structural distribution laws**, not competitor code/assets/trade dress.

**Latest explicit economic law: referral/partner payouts are USDC, not GAS.**

Rationale:

- no GAS emissions to buy growth;
- no automatic referral-induced GAS sell pressure;
- creator economics are legible;
- payout can be bounded by realized revenue.

Financial firewall becomes:

`GAS Reserve != GameBankroll != Referral Reward Pool != future Bracket collateral`

Referral Reward Pool is funded only from realized protocol revenue allocated to acquisition. It is not monetary backing and cannot draw on ReserveVault or GameBankroll.

Desired mechanics:

- every share/deep link can preserve referral attribution;
- verified round cards, profiles, Crews, Play modes, Trade, Reserve/activity links can be acquisition objects;
- referred users should receive a real benefit/discount/rebate funded from acquisition economics rather than a higher house edge;
- one-level referrals initially; avoid MLM-style multi-level chains;
- approved CT creators/communities can become GAS Partners;
- USDC commissions accrue in a claimable/reconciled ledger and settle efficiently rather than as one transfer per micro-event;
- self-referral/wash/Sybil activity must be cleared before payout becomes claimable.

Exact percentages, attribution windows, partner tiers, discounts and payout thresholds remain OPEN and must be simulated against locked fee economics.

## Holder-adjusted referrals

Holding GAS can improve referral economics while payout stays in USDC.

Conceptual formula:

`eligible realized protocol acquisition revenue -> base USDC referral share -> time-weighted holder/alignment multiplier -> final USDC payout`

This allows ordinary holders and creators to become aligned distributors.

Do not freeze a multiplier or holder threshold without modeling.

## Social distribution laws

Fomo's key law to preserve: social activity becomes distribution inventory.

GAS-specific implementation direction:

- verified game wins -> share cards/deep links;
- Crew milestones/rank changes -> shareable activity;
- verified GAS Trade events -> optional shareable activity;
- Reserve/rebase milestones -> shareable activity;
- X as a primary outbound channel;
- Base/Farcaster as another channel;
- Telegram/Discord/direct links remain supported;
- Base App can surface/share/deep-link GAS but does not own the standalone product.

Every public financial/result claim must resolve to canonical verified activity/round state. Do not rely on screenshots as proof.

## Crews

Crews are GAS-owned entities, not external chat groups.

Crew membership, rank, verified activity and economics remain canonical GAS state. XMTP/Discord/Telegram may be communication adapters only.

Crew/referral economics and anti-Sybil rules remain OPEN.

## NetNet findings to preserve

NetNet is useful as a strategic/economic comp, not a template.

Adapt:

- capture excess speculative demand into external reserve assets;
- reserve haircuts and quality tiers;
- permissionless maintenance with bounded invariant checks;
- simple/atomic genesis with pull refunds and pre-flight gates;
- protocol-owned liquidity as infrastructure;
- fully admitted/reserved game liabilities before risk acceptance;
- generated/not-manually-typed reserve reporting;
- provider-neutral verifiable randomness;
- conservative future wGAS collateral valuation.

Reject/import-never by default:

- 5% fee-on-transfer token mechanics;
- counting self-issued GAS/POL as backing;
- 1-of-1 privileged authority;
- Phase-1 OHM bond-desk complexity;
- RWA features that displace GAS as the center of the product.

## Reserve / backing invariant

**GAS cannot back GAS.**

Never count as GAS monetary backing:

- GAS;
- wGAS;
- self-issued GAS/POL value;
- GameBankroll;
- Referral Reward Pool;
- future Bracket collateral/liquidity;
- protocol IOUs/self-issued assets.

Potential approved external backing categories remain subject to D04/legal/provider approval:

- USDC/cash-like assets;
- short-duration T-bill/RWA assets;
- ETH;
- wstETH/approved ETH staking positions;
- approved RWA/equity assets with custody/oracle/legal haircuts.

Reserve reporting should distinguish:

- liquid defensive backing;
- adjusted monetary backing;
- total strategic reserve assets;
- excluded POL;
- excluded GameBankroll;
- excluded referral liabilities/capital;
- excluded Bracket assets.

## ETH / wstETH / RWA direction

If Base is approved, Base may hold/use wstETH and Base-native assets while Ethereum can remain a deeper reserve/staking domain where appropriate.

Do not force all treasury assets onto Base.

Long-term optional research includes:

- Base/Ethereum wstETH;
- native ETH reserve;
- GAS-owned Ethereum validators after operational maturity;
- tokenized equity/RWA exposure such as NVDA/MSFT/SPCX-type assets through approved providers;
- later RWA jackpots/seasons while GAS remains primary wager/settlement asset.

Exact issuers, custody, eligibility, haircuts, oracles and legal treatment remain OPEN.

## Reserve-assisted elasticity / AMO

NetNet research strengthened the existing Reserve-Assisted Elasticity direction.

Preferred conceptual monetary response stack:

1. normal market liquidity;
2. bounded Reserve AMO;
3. visible GAS rebase/index response.

Above target/persistent excess demand, a bounded AMO may release/mint GAS into real demand and acquire external reserves.

Below target, approved external reserves may buy/retire GAS before or alongside approved negative elasticity.

Do not reduce the controller to price-only logic. D03 simulation should consider market/reference deviation, adjusted backing, reserve liquidity, oracle confidence, volatility, AMO utilization, epoch expansion already consumed and policy caps.

Exact controller remains OPEN.

## GAS Original / GameBankroll

GameBankroll remains financially separate from the monetary Reserve.

Before accepting a wager, solvency admission should account for at least:

- current locked liabilities;
- worst-case payout of the new wager;
- pending unsettled liabilities;
- mode/round correlated exposure;
- liquid GAS inventory;
- required sourcing/slippage;
- safety margin.

No wager should proceed to randomness if the liability has not passed admission.

Locked handle economics remain:

| Period | RTP | GAS protocol | Team |
|---|---:|---:|---:|
| Days 1–14 | 90% | 7% | 3% |
| Days 15–28 | 92% | 6% | 2% |
| Days 29–42 | 93% | 5% | 2% |
| Day 43+ | 95% | 4% | 1% |

Exact CRUISE/BOOST/REDLINE probabilities/multipliers remain OPEN and must mathematically reproduce the active epoch RTP.

## Randomness

Preserve a provider-neutral `RandomnessAdapter` design.

Do not bind GAS permanently to one VRF/drand source.

A canonical round should preserve `intentId`, `roundId`, wager/mode, randomness provider/request reference, proof/entropy/hash reference, mapping version, outcome, payout and settlement/finality evidence.

Share cards should resolve to canonical round verification pages.

## Trade / liquidity

Locked GAS buy/sell fee remains 2.00% = 1.50% protocol + 0.50% team.

Do not introduce fee-on-transfer GAS or wGAS.

Aerodrome + Uniswap remain leading venue candidates behind Trade/liquidity adapters. Exact venue configuration remains OPEN.

## Launch

Launch direction remains a simple presale, not CCA. CCA/SEAL/CRACK remain deprecated.

Useful NetNet launch laws to adapt:

- fixed/simple terms;
- minimum/maximum raise;
- pull refunds on failed raise;
- permissionless finalization after conditions;
- atomic activation;
- non-blocking founder credential;
- pre-flight gates.

Potential `GenesisCoordinator` should fail atomically if critical oracle/config/role/liquidity prerequisites are not satisfied.

Presale terms and team-principal exit mechanics remain OPEN.

## Revenue accounting

Never double count bases. Keep separate:

- GAS trading fees;
- GAS Original game handle/house edge;
- reserve yield;
- referral/acquisition spend;
- future Bracket revenue.

Referral payments are expenses/liabilities of the acquisition program, not reserve backing.

Potential destinations include reserve growth, POL, acquisition, gas sponsorship, buy/burn/retirement and other approved buckets. Internal allocation percentages remain OPEN except where already locked.

## Bracket

Bracket remains future, optional to Phase 1, economically connected but financially separate.

GAS Reserve cannot guarantee Bracket outcomes. Bracket collateral cannot count as GAS backing. Only approved Excess Backing could ever fund a future Bracket liquidity facility.

Do not make Bracket a Phase 9 dependency.

## Current Phase 9 implementation truth

Current implementation now includes:

- canonical account read model;
- D01-hard-coded Base (`8453`) / Base Sepolia (`84532`) application config and
  Foundry workspace, with no mainnet deployment manifest;
- strict game intent/round parsers, authenticated/idempotent server action
  routes, provider-neutral authoritative source transport and a client HTTP
  adapter;
- a disabled-by-default live game controller that persists an intent before
  submit, reconciles unknown POST finality before retry, restores accepted
  wagers after refresh and polls canonical round settlement;
- reserve/rebase read model and backing exclusions;
- read-only Trade quote truth;
- one canonical verified activity projection;
- Crew/ranking read path;
- shared financial recovery law: `DID MONEY MOVE? -> canonical state -> safe next action`;
- a test-only D02 share/index/wGAS Foundry candidate scaffold. Its `1e27`
  precision and rounding/wrapper semantics are evidence inputs, not approved
  production economics.

The game live path is gated by
`NEXT_PUBLIC_PROJECT_GAS_GAME_LIVE_ENABLED=false` and server-only
`PROJECT_GAS_GAME_EXECUTION_URL` / `PROJECT_GAS_GAME_EXECUTION_TOKEN`. Absence
of approved configuration remains a confirmed no-funds-moved rejection. A POST
that may have reached the source but loses its response becomes `unknown` and
must reconcile; it never becomes a blind retry.

Still not production-live:

- an approved execution source that performs real Base wager locking;
- GameBankroll mutation/solvency integration;
- live RNG/VRF and verifiable round authority;
- end-to-end wager reconnect/reconciliation against that approved source;
- Trade signing/submission/settlement;
- live funding/withdrawal providers;
- production bounded permissions/revoke flow;
- approved production asset/read-source configuration.

Do not describe research decisions as implemented code.

## Immediate Work priority order

Stay inside the existing Phase 9 dependency program.

1. Reconcile any remaining player-facing direct-GAS entry divergence to canonical USDC-only entry. **Implemented in the current shell/controller boundary.**
2. Update/extend the existing Phase 9 decision packet rather than creating a new roadmap.
3. Implement the approved D01 Base/Base Sepolia + Foundry baseline without implying mainnet deployment approval. **Implemented; no deployment is authorized or recorded.**
4. D02: freeze and test share/index/wGAS exact semantics. **Test-only candidate scaffold exists; exact semantics remain OPEN pending explicit approval.**
5. D03: simulate oracle/rebase/AMO controller and failure cases.
6. D04: define external-only Reserve policy, haircuts, strategy adapter/cap model.
7. D05: define GameBankroll solvency/admission and invariants.
8. D06: define Game Entry Router sourcing/netting/slippage/idempotency/recovery.
9. D07: solve exact CRUISE/BOOST/REDLINE math to locked RTP epochs.
10. D08: select/provider-neutral RNG/finality/failure recovery.
11. D09–D13 thereafter: genesis, fee routing, roles/governance, account rails/permissions/funding, legal/release.
12. Fold the new X/referral/holder/Base distribution requirements into the relevant existing decision packets and adapters; do not create parallel architecture.

## Required tests/simulations for new decisions

At minimum preserve/add coverage for:

- share/index conservation;
- exact wGAS share backing;
- GAS vs wGAS positive/negative rebase economic equivalence;
- no-self-backing reserve math;
- reserve haircuts/exposure caps;
- AMO expansion/contraction shock scenarios;
- stale/manipulated oracle fail-closed behavior;
- exact epoch RTP;
- GameBankroll maximum-liability admission;
- Game Entry Router inventory/slippage/reconciliation;
- duplicate intent/randomness/settlement prevention;
- referral attribution durability;
- self-referral/Sybil rejection;
- Referral Reward Pool isolation from Reserve/GameBankroll;
- time-weighted holder alignment resistant to snapshot gaming;
- permission expiry/revoke/recovery;
- mobile/desktop/legacy regression.

## Architecture law

Keep:

`PRESENTATION -> CONTROLLER/QUERY -> DOMAIN ADAPTER -> AUTHORITATIVE SOURCE`

React is never settled financial truth.

Optimistic acknowledgement is permitted; optimistic financial settlement is not.

Unknown finality reconciles before retry.

All new Coinbase/Base/X/referral/holder features must enter through existing domain boundaries/adapters rather than becoming new sources of economic truth.

## Hard firewalls

Maintain:

`user spendable GAS/USDC != locked wager != GameBankroll != GAS ReserveVault != protocol-owned liquidity != Referral Reward Pool != future Bracket collateral/settlement`

No Reserve-to-game bailout. No referral payment from Reserve. No Bracket circular backing. No self-issued backing.

## OPEN decisions — do not guess

Still OPEN unless explicitly approved later:

- exact share precision/rounding/wrap edge law;
- oracle set/deadband/caps/rebase/AMO controller;
- Reserve minimums/assets/haircuts/custody/oracles/strategy caps;
- ETH/wstETH/RWA allocation and providers;
- GameBankroll capital/exposure limits;
- Game Entry Router venue/inventory/netting/slippage/failure policy;
- exact CRUISE/BOOST/REDLINE tables;
- RNG provider/fallback/finality;
- presale terms/team principal exit;
- internal protocol fee allocations;
- governance/roles/pause/upgrade;
- funding/withdrawal/onramp/paymaster/permission provider details;
- X/Base Verify integration implementation;
- referral percentages, discount, attribution window, partner tiers, anti-Sybil thresholds;
- holder alignment formula/thresholds;
- direct holder revenue-sharing legality/structure;
- Crew/referral economics;
- final RWA providers/legal eligibility;
- future GAS/GSD split;
- future Bracket collateral criteria.

When code needs an OPEN choice, prepare a decision packet with recommendation, alternatives, failure modes, simulations and exact parameters requiring approval.

## CI / release discipline

Run/verify on the exact final head:

```bash
npm run test
npm run build
npm run test:e2e:gas
npm run test:e2e:legacy
```

When the Foundry workspace is approved/created, also require its build/unit/fuzz/invariant/static-analysis lanes defined by the D01 packet.

No fake activity/reserve/RNG/settlement/rankings. No invented production address/provider. No weakening economic/security tests to make CI pass. No mainnet broadcast without explicit approval.

## Work completion report

On every substantial completion report:

- exact branch and commit;
- tests/CI on that exact head;
- what was implemented vs research-only;
- what remains OPEN;
- whether any phase/gate changed (normally no unless the gate explicitly passes);
- whether merge/deploy authorization exists.
