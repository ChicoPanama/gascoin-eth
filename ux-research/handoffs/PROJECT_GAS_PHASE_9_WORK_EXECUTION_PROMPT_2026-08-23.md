# Project GAS — Phase 9 Work Execution Prompt

**Date:** 23 August 2026  
**Branch:** `ux-lab`  
**Active gate:** Phase 9 — Vertical-loop implementation  
**Purpose:** executable Work prompt for completing the authoritative
`USDC -> PLAY -> SETTLEMENT -> GAS -> HOLDER -> CREW` loop on Base while
preserving the existing GAS application shell and financial firewalls.

This is an execution prompt, not a second roadmap or a new source of truth. It
is subordinate to the newest explicit user instruction, Source of Truth v1.1,
`AGENTS.md`, `ux-research/ROADMAP.md`, the Phase 9 gate and the Phase 9 protocol
decision packet.

---

## Work role

Act as the senior full-stack Web3 engineer responsible for taking Project GAS
from its verified Phase 7/8 application shell and current Phase 9 adapter
foundation to production-authoritative vertical loops.

Do not redesign the product. Implement the existing GAS-owned product laws,
routes, state machines and responsive hierarchy behind controller, query and
adapter boundaries.

## Locked product decisions

1. GAS is a standalone GAS-owned app, brand, identity, social graph, game and
   economy.
2. Base mainnet `8453` is the fixed Phase 1 execution chain.
3. Base Sepolia `84532` is the public integration testnet.
4. Foundry is the canonical Solidity build/test/deploy toolchain.
5. Base App is optional distribution for the same standard GAS web app. Do not
   make Base App, Farcaster or a Coinbase exchange account mandatory.
6. Privy remains the canonical GAS account/authentication orchestration layer.
   Base Account, embedded wallets and EOAs are linked financial credentials.
7. X is first-class public identity/distribution, not custody or canonical
   financial identity.
8. Phase 1 player entry is USDC-only. The Game Entry Router sources or credits
   GAS invisibly; wagers, bankroll liabilities and payouts remain GAS-native.
9. Referral and Partner obligations are denominated and fully reserved in USDC
   inside an isolated Referral Reward Pool, but recipients have **no USDC payout
   option**. Every cleared referral claim settles only in GAS by routing the
   backing USDC through the protocol-controlled internal GAS AMM/router. The
   internal route captures the applicable GAS conversion/trading fee; Aerodrome,
   Uniswap and other external venues are not referral-payout execution routes.
   Referral payouts never draw from ReserveVault or GameBankroll.
10. GAS and wGAS holders receive the same rebase economics through underlying
    shares/GAS-per-wGAS. Holder alignment prefers time-weighted underlying
    shares over balance snapshots.
11. `ReserveVault != GameBankroll != user funds != POL != Referral Reward Pool
    != future Bracket collateral`.
12. No production address, provider, oracle, RNG source, economic parameter,
    governance authority or mainnet deployment may be invented.

## Current Base application model

Treat GAS as a standard responsive web/PWA registered through Base.dev when the
external registration is authorized. Do not build a legacy Farcaster-manifest
mini-app as the canonical Base App integration.

Base-native progressive enhancements belong behind adapters and capability
detection:

- Base Account / Sign in with Base compatibility;
- EIP-5792 `wallet_getCapabilities`, `wallet_sendCalls` and
  `wallet_getCallsStatus`;
- app-specific Sub Accounts;
- bounded Spend Permissions;
- ERC-7677 Paymaster sponsorship with normal user-paid-gas fallback;
- Base Pay and Coinbase Onramp funding adapters with direct Base USDC fallback;
- Base wallet-address notifications with canonical target paths;
- Base.dev metadata and ERC-8021 Builder Code attribution;
- Basename resolution;
- optional Farcaster distribution and XMTP Crew communication;
- Base latency/finality stages without a permanent Flashblocks dependency.

Every advanced feature must degrade to a standard Base/EVM wallet path. The
normal path may say `ADD FUNDS`, `FAST PLAY`, `FREE NETWORK FEE` and
`CHECK STATUS`; provider/SDK jargon belongs in progressive disclosure.

## Web3 contract railways

The production architecture must preserve these rails and their authority
boundaries:

```text
GAS ACCOUNT / WALLET RAIL
Privy GAS user -> linked Base Account / embedded wallet / EOA
               -> capability detection
               -> bounded permission / revoke / normal-signature fallback

FUNDING RAIL
existing Base USDC | Base Pay | Coinbase Onramp | direct transfer
               -> FundingIntent
               -> pending / reconciled / settled
               -> spendable USDC

GAME ENTRY RAIL
USDC player intent
               -> GameEntryRouter
               -> approved sourcing/netting/slippage policy
               -> GAS-native locked wager

GAME SOLVENCY + SETTLEMENT RAIL
GameBankroll admission/reservation
               -> CRUISE / BOOST / REDLINE payout law
               -> RandomnessAdapter
               -> canonical round
               -> GAS payout / refund / recovery

MONETARY RAIL
GAS shares + global index
               <-> exact-share wGAS wrapper
               -> OracleGuard / RebaseController
               -> ReserveVault / bounded AMO

TRADE + LIQUIDITY RAIL
quote -> review -> TradeIntent -> router/venue
               -> submitted / pending / settled
               -> RevenueRouter / POL accounting

SOCIAL + DISTRIBUTION RAIL
canonical economic event
               -> activity projection
               -> profile / Crew / search / notification / deep link
               -> durable referral attribution

REFERRAL RAIL
eligible realized acquisition revenue
               -> isolated USDC Referral Reward Pool
               -> anti-Sybil clearance
               -> USDC-denominated covered claim
               -> protocol-controlled internal GAS AMM/router
               -> applicable GAS conversion/trading fee captured internally
               -> GAS payout only
               -> hold / wGAS / play / normal GAS sale
```

Referral conversion must not route through Aerodrome, Uniswap or another
external venue. External venues may remain candidates for ordinary user Trade
routing, but not for protocol-controlled referral payout execution.

React components may display these rails but may not become their authority.
The implementation boundary remains:

```text
PRESENTATION -> CONTROLLER/QUERY -> DOMAIN ADAPTER -> AUTHORITATIVE SOURCE
```

## Canonical Base finality rail

Normalize Base transaction truth without equating acknowledgement with
settlement:

```text
CREATED
-> SIGNATURE_REQUIRED
-> SUBMITTED
-> PRECONFIRMED (optional capability)
-> L2_INCLUDED
-> L1_BATCHED
-> FINALIZED
```

Failure/recovery:

```text
UNKNOWN | INTERRUPTED | DROPPED | REORGED
-> RECONCILING
-> SETTLED | FAILED_RETRY_SAFE | FAILED_NOT_RETRY_SAFE | ACTION_REQUIRED
```

The irreversible game payout/funding/trade/referral policy must use the
approved finality threshold for its domain. No view may infer that threshold.

## Required implementation order

Stay within the existing Phase 9 dependency order:

1. V1 canonical account read model and wallet/capability rail.
2. V2 idempotent game intent and Game Entry Router boundary.
3. V3 GameBankroll, RNG, fairness, finality and settlement.
4. V4 reserve/rebase authoritative read model and D02–D04 monetary contracts.
5. V5 Trade quote/intent/submission/settlement.
6. V6 canonical verified activity projection plus durable referral attribution.
7. V7 Crews/rankings from canonical identity/activity plus referral/Partner identity relationships.
8. V8 funding, withdrawal, bounded permissions and recovery, including the isolated Referral Reward Pool claim/reconciliation path.

The internal referral AMM/router belongs under D06/D10 routing/fee design and
must be reconciled with Trade/liquidity architecture without giving it access
to ReserveVault or GameBankroll.

Base account/funding/distribution pre-work is allowed before V8 only when it is
decision-neutral, disabled by default and does not fake live provider state.

## Base-native acceptance matrix

| Surface | Required behavior | Fallback | Proof |
|---|---|---|---|
| Chain | Base/Base Sepolia only for Project GAS actions | unavailable on wrong chain | unit + Foundry chain tests |
| Account | Privy GAS identity with linked-wallet relationships | email/X + embedded/standard EVM wallet | account unit/E2E |
| Capabilities | detect atomic calls, paymaster and attribution per account/chain | standard signed transaction | parser + wallet capability tests |
| Funding | existing USDC, direct transfer, Base Pay/Onramp only when configured | actionable unavailable state | intent/reconcile/failure tests |
| Fast Play | bounded asset/amount/period/scope/expiry and revoke | confirmation per action | permission expiry/revoke E2E |
| Fees | sponsored status only when approved policy accepts action | user pays Base network fee | sponsorship policy tests |
| Finality | accepted/preconfirmed/included/batched/finalized remain distinct | reconcile through standard Base RPC | reorg/drop/timeout tests |
| USDC | official chain/address/decimals/code verification | unavailable, never legacy token | config/readback tests |
| Game | stable intent/round IDs and authoritative sourcing/settlement | no-funds or reconcile state | duplicate/refresh/delay E2E |
| Trade | quote expiry, fee, output, impact and settlement | alternate approved venue/unavailable | stale quote + recovery tests |
| Holder | GAS/wGAS underlying-share equivalence and personal rebase impact | unavailable until D02 source | invariant + UI tests |
| Referral | USDC-covered liability; no USDC claim; internal AMM GAS-only payout; internal fee capture; no external DEX route | unavailable until internal route is approved/liquid | coverage + route + fee + duplicate-claim tests |
| Distribution | absolute verified links with referral attribution | ordinary web/X/direct link | deep-link durability tests |
| Base App | standard web app, Base.dev metadata/Builder Code/notifications | standalone GAS PWA | metadata + target-path tests |
| Crews | GAS-owned membership/activity/economics | native GAS notifications | provenance/anti-Sybil tests |

## Referral payout invariants

The referral path is protocol-controlled because GAS controls the reward payout.
It must therefore optimize for GAS alignment and protocol fee capture without
creating circular backing or hidden insolvency.

Required invariants:

- `outstandingReferralLiabilityUSDC <= segregatedReferralPoolUSDC` before a claim can execute;
- Referral Reward Pool USDC is encumbered and excluded from monetary backing;
- a claim has one stable `claimId` and cannot settle twice;
- the claim amount is denominated in USDC until execution so GAS price movement does not change the dollar liability;
- at execution, the internal AMM/router produces the GAS output from the covered USDC under approved oracle/price/slippage bounds;
- the internal route applies the approved GAS conversion/trading fee policy and records the fee destination explicitly;
- Aerodrome/Uniswap/external routers are invalid referral claim destinations;
- insufficient internal AMM liquidity or stale pricing yields a reconciled unavailable/pending state, not an external-route fallback;
- delivered referral GAS is ordinary GAS with normal rebase, wrap, play and sell semantics;
- no ReserveVault or GameBankroll liquidity may be silently borrowed to complete a referral claim.

Exact internal AMM curve, inventory source, liquidity floor, pricing source,
slippage cap and fee implementation must be specified under D06/D10 before the
route can be production-live.

## Immediate executable slice

Before selecting OPEN D02–D13 economics/providers:

1. Correct stale Base App mini-app research to the current standard-web-app
   model.
2. Add a provider-neutral Project GAS Web3 rail read model for:
   - fixed Base chain posture;
   - wallet/account kind;
   - EIP-5792 capability detection;
   - sponsorship/configuration truth;
   - funding-provider truth;
   - Builder Code/attribution configuration;
   - explicit unavailable/degraded states.
3. Expose that model in the existing Account surface using consumer language.
4. Add official Base/Base Sepolia USDC allowlist validation without silently
   enabling or inventing a production GAS deployment.
5. Add unit/E2E coverage for Base capability parsing, wrong-chain behavior,
   normal-wallet fallback and truthful unavailable provider states.
6. Preserve the shell and all mobile/desktop regressions.
7. Add the referral internal-AMM requirement to the D06/D10 decision work and
   model USDC liability coverage, GAS output, internal fee capture, liquidity
   exhaustion and duplicate-claim/reconciliation failure cases before writing a
   live claim path.

## Completion rules

- Use `apply_patch` for authored file changes.
- Do not overwrite unrelated user work.
- Keep provider endpoints and secrets server-side.
- Do not expose a paymaster URL or Onramp secret to the client.
- Do not claim Base App registration, provider readiness, internal referral-AMM readiness or production settlement without verified external/onchain state.
- Run targeted tests, complete unit tests, production build, Project GAS E2E,
  legacy E2E and Foundry tests relevant to the change.
- Run the React quality review after editing multiple TSX components.
- Keep PR #74 draft and do not merge or deploy.
- Commit only after the exact working tree has passed the relevant checks.
- Report: files, behavior, tests, remaining OPEN decisions and exact head.

