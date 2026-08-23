# Project GAS Phase 9 — Protocol Decision Dependencies

**Date:** 2026-08-22  
**Status:** Phase 9 subordinate decision packet / recommendations only  
**Authority:** subordinate to newest explicit instruction, Source of Truth v1.1, `AGENTS.md`, `ux-research/ROADMAP.md`, and `ux-research/phase-9/PHASE_9_GATE.md`  
**Decision state:** D01 Base + Foundry chain/tooling was APPROVED by the user on 22 August 2026. Nothing in this document authorizes a production deployment, live address, D02+ economic parameter, provider, oracle, RNG source, upgrade design, or move to Phase 10.

## Purpose

This packet turns the handoff's OPEN protocol list into one dependency order inside Phase 9. It is **not** a second roadmap.

The first decision is isolated because contract simulations and invariant scaffolding need a reproducible EVM/tooling baseline, while chain-specific USDC, oracle, account-abstraction, finality and liquidity integrations must not be guessed.

## Locked inputs this packet does not reopen

- Phase 1 GAS Original player entry is USDC-only.
- GAS sourcing/credit is automatic and invisible at the player boundary.
- Wagers, GameBankroll liabilities and payouts are GAS-native.
- GAS uses the share/index model; wGAS is fixed-balance and exactly share-backed.
- GAS, wGAS, self-issued POL, GameBankroll and Bracket collateral do not count as monetary backing.
- Protocol-owned liquidity and Referral Reward Pool assets do not count as monetary backing.
- ReserveVault cannot bail out GameBankroll.
- Referral liabilities are USDC-denominated, fully covered by segregated USDC, and delivered only in GAS through the approved internal GAS router/AMM; there is no USDC or external-DEX payout path.
- Bracket is financially separate and not a Phase 1 dependency.
- The buy/sell fee is 2%; a fee-on-transfer token tax is rejected.
- Privy remains canonical account identity/orchestration for Phase 9; wagmi/viem remain the EVM application read/write/signature layer unless an explicit later decision changes them.
- No mainnet deployment occurs without explicit approval after testnet, adversarial testing, security review and the Phase 9 gate.

## Current repository facts

Audited at `ux-lab` parent head `985e461e7d882d484f7c04c957721bc9a58a000b` on 23 August 2026:

- `contracts/project-gas/foundry.toml`, pinned Foundry CI, the D01 chain guard and the D02 test-only share/index/wGAS simulation scaffold exist;
- there is still no deployable Project GAS monetary, ReserveVault, GameBankroll, referral-pool, internal-router, RNG or revenue-routing implementation and no authoritative deployment manifest;
- `app/providers.tsx`, `lib/wagmi-config.ts` and `lib/project-gas/asset-config.ts` fix the application posture to Base mainnet/Base Sepolia while preserving standard EVM wallet fallbacks;
- `hooks/useProjectGasAccount.ts` keeps Privy as canonical GAS identity/orchestration and renders unconfigured or wrong-chain financial state unavailable;
- V1–V8 controller/query/adapter boundaries, strict parsers, idempotent game intent persistence/reconciliation, and reserve/activity/trade/Crew read projections exist, but live money-moving sources remain disabled or unconfigured;
- legacy referral code is wallet/refund/points-oriented and cookie/device-assisted. It is not a Project GAS `AttributionIntent`, USDC liability ledger, Referral Reward Pool, stable-`claimId` conversion flow or GAS-only payout implementation;
- `lib/project-gas/referral-claim-preflight.ts` encodes only the settled funding, delivery, internal-route, pause and reconciliation laws. It moves no money and approves no D06/D10 parameters;
- no Project GAS production address/provider is approved, and none may be inferred from legacy GASCOIN variables.

## Dependency order

| ID | Decision | Depends on | Unlocks | Must not be silently assumed |
|---|---|---|---|---|
| D01 | Chain posture + contract toolchain | Locked product/account laws | Reproducible simulations, contract workspace, chain config boundary | Base, Robinhood, Ethereum, Foundry, Hardhat, provider, live address |
| D02 | GAS share/index + wGAS exact accounting | D01 | Monetary kernel model and invariants | Rounding direction, precision, wrap/unwrap edge law |
| D03 | Oracle + rebase/AMO controller | D01–D02 | Rebase simulation and bounded Reserve AMO | source set, cadence, deadband, caps, persistence, fallback |
| D04 | Reserve policy | D02–D03 | ReserveVault, strategy adapters and backing invariants | minimums, buckets, assets, haircuts, exposure/liquidity caps, ETH/RWA custody |
| D05 | GameBankroll solvency | D02–D04 | Wager acceptance and worst-case liability reservation | capital ratio, exposure/correlation caps, sourcing safety margin, bailout path |
| D06 | Game Entry Router + internal referral conversion route | D01–D05 | Authoritative USDC-to-GAS game intent and funded GAS-only referral claim paths | inventory ownership, pricing/oracle guard, internal liquidity, netting, slippage, sizing/batching, expiry, pause/recovery |
| D07 | CRUISE/BOOST/REDLINE math | D05–D06 | Exact epoch RTP and payout tables | outcome weights, multipliers, mode fee split |
| D08 | RNG/finality/failure recovery | D01, D05–D07 | Verifiable wager settlement | VRF/beacon/provider, timeout, refund, fallback |
| D09 | Presale + team principal exit | D02–D04 | Genesis state machine | price, caps, vesting, principal exit law |
| D10 | Trading/game/referral-conversion fee routing | D03–D09 | Revenue Router, acquisition allocation and conversion accounting | venue enforcement, bucket allocation, AMO split, canonical fee application to internal claims |
| D11 | Governance/roles/pause/upgrade | D01–D10 | Production authority wiring | multisig, timelock, guardian, mutability |
| D12 | Account rails/permissions/funding/withdrawal | D01, D06, D11 | Live consumer money actions with provider degradation/fallback | provider, sponsorship allowlist/caps, limits, revoke/recovery |
| D13 | Legal/regulatory release structure | D01–D12 | Jurisdictional launch approval | availability, disclosures, entity/custody structure |

Each downstream packet must state recommendation, alternatives, failure modes, exact approval parameters and objective tests. A downstream implementation may not backfill an upstream OPEN choice.

## Strategy reconciliation additions — OPEN, not approvals

These additions place the accepted NetNet/Base/Coinbase/Fomo/holder laws at
their existing dependency points. They do not create new roadmap phases or
approve parameter values.

| Decision | Recommendation to simulate/decide | Alternatives | Principal failure modes | Evidence required before approval | Exact approval request |
|---|---|---|---|---|---|
| D03 AMO | Test market liquidity -> bounded Reserve AMO -> visible rebase as one controller | rebase-only; liquidity + rebase without AMO | reserve depletion, oscillation, oracle manipulation, stale execution | expansion/contraction shocks, manipulation/staleness, persistence and cap sweeps | approve oracle set, target/deadband, persistence, caps, cadence and pause/fallback |
| D04 reserve quality | Count only approved external assets at approved haircuts, with liquidity floors and adapter exposure caps | stable-only reserve; broader productive reserve | circular backing, illiquidity, custody/issuer failure, double counting | haircut/exposure/stale-oracle tests and liquidation/redemption scenarios | approve asset list, classes, haircuts, floors, caps, custody/oracle and strategy roles |
| D05 GameBankroll | Admit wagers only after worst-case liability, pending/correlated exposure, liquid GAS sourcing and safety margin pass | static wager cap; fully prefunded per-round inventory | insolvency, Reserve bailout pressure, sourcing slippage, duplicate liability | maximum-liability and concurrent/correlated-wager simulations | approve capital ratio, exposure caps, sourcing assumptions and rejection/recovery rules |
| D06 internal referral route | Use segregated USDC to purchase GAS through protocol-controlled inventory/liquidity; pause with no external fallback | inventory quote; bounded internal pool/router | stale/manipulated price, insufficient GAS, slippage, insolvency, circular backing | inventory/liquidity shocks, oracle divergence, sizing/batching, interruption and reconciliation tests | approve inventory source/accounting, pricing/oracle guard, liquidity formula, claim limits, slippage, batching and pause policy |
| D08 randomness | Keep `RandomnessAdapter` provider-neutral with canonical proof/finality evidence | VRF; beacon/commit-reveal; approved fallback | delayed/withheld randomness, remapping, duplicate settlement, false fairness claims | provider outage, delayed proof, replay and mapping-version tests | approve provider(s), mapping, timeout/fallback/refund and settlement-finality thresholds |
| D10 referral economics | Apply the already-approved canonical GAS routing fee law to internal conversion and route realized acquisition revenue once | fee-waived internal conversion; protocol inventory spread under the same accounting law | arbitrary second tax, fee leakage, revenue/asset double count | fee-path/accounting invariants and end-to-end liability-to-GAS reconciliation | approve referral allocation, canonical fee application and protocol/team routing; do not approve a second tax |
| D12 account rails | Keep Privy/GAS identity canonical; capability-discover Base Account enhancements with normal-wallet fallback | provider-neutral external wallet only; other embedded provider | provider lock-in, permission abuse, unrecoverable smart account, sponsored-action abuse | expiry/revoke, wrong-chain, degradation/fallback, caps/allowlist and abuse tests | approve providers, sponsorship actions/caps, permission scopes/expiry and recovery policy |

X proof, durable `AttributionIntent`, Partner clearance and time-weighted
GAS+wGAS alignment are V6/V7 identity/distribution inputs. Their verification
mechanism, attribution window, anti-Sybil thresholds, referral percentages and
holder multiplier remain OPEN; they must resolve to the GAS-owned canonical
identity and may not become a parallel custody or economic truth system.

The repo-grounded classification and acceptance mapping is maintained in
[`NETNET_BASE_COINBASE_FOMO_HOLDER_GAP_ANALYSIS_2026-08-23.md`](./NETNET_BASE_COINBASE_FOMO_HOLDER_GAP_ANALYSIS_2026-08-23.md).

---

## D01 — Chain posture and contract toolchain — APPROVED

**Decision:** Option A was explicitly approved by the user on 22 August 2026.
Base is the fixed Phase 1 execution chain, Base Sepolia is the first public
integration testnet, and Foundry is the canonical Solidity toolchain. This
approval does not authorize a mainnet deployment or any D02+ parameter/provider.

### Approved decision

The approved combined posture is:

1. **Base is the fixed Phase 1 production target and Base Sepolia is the first public integration testnet.** This authorizes chain-specific implementation and testing; it does not authorize mainnet deployment or unverified production contracts/addresses.
2. **Foundry is the canonical Solidity build/test/deploy toolchain.** The Next.js application keeps Privy + `@privy-io/wagmi` + wagmi + viem; it does not gain a second wallet stack.
3. **Robinhood Chain remains an explicit portability/test candidate and future RWA distribution option, not a Phase 1 dependency.** Pure monetary/game contracts must remain standard EVM Solidity and avoid Base-only precompiles.
4. **Ethereum L1 remains a possible settlement/reserve anchor, not the high-frequency game execution chain.** No cross-chain architecture is introduced in Phase 1 without a later approved packet.

### Decision rationale

**The combined posture above is approved.**

Why:

- the locked player asset is USDC, and Circle currently lists Base and Ethereum as supported USDC networks while Robinhood Chain is not in Circle's supported USDC chain list;
- Base has canonical USDC-centered account/payment primitives, Base Sepolia USDC test liquidity/faucets, current Privy integration guidance and the repository already supports Base Account as a wallet option;
- Base supplies sub-second preconfirmations with explicit deeper finality stages, suitable for clear `accepted != settled` state modeling;
- Robinhood Chain is live, EVM-compatible, RWA-focused and technically credible, but its official canonical token list currently exposes USDG rather than USDC; making it Phase 1 canonical would introduce a bridged-USDC or asset-substitution question that conflicts with Source of Truth v1.1;
- Robinhood Stock Tokens are tokenized debt securities with geographic restrictions, so they are valuable future research evidence but should not drive the global Phase 1 monetary/game kernel;
- Foundry directly supports fuzz, invariant, fork and local-node testing needed by the Phase 9 gate and is documented by both Base and Robinhood Chain.

### Candidate matrix

| Criterion | Base | Robinhood Chain | Ethereum L1 |
|---|---|---|---|
| Locked USDC entry fit | Strong: Circle-supported native USDC and USDC account/payment tooling | Weak today: official chain token surface centers USDG; USDC would require a separately approved canonical/bridged path | Strong: Circle-supported native USDC |
| High-frequency Play UX | Strong: ~200 ms preconfirmation, ~2 s sealed L2 blocks | Strong: sub-second soft confirmation | Weak: L1 latency/cost for repeated wagers |
| Account abstraction | Base Account, paymasters, subaccounts/spend-permission paths; Privy integration exists | ERC-4337 plus Alchemy/ZeroDev/Privy options | Available, but higher execution cost |
| Oracle/finality maturity | Chainlink feeds and Base sequencer-uptime feed; explicit L2/L1 finality stages | Chainlink feeds, including Stock Tokens; explicit soft/L1 finality stages | Mature feeds/finality, no L2 sequencer |
| RWA adjacency | Emerging Base RWA infrastructure, but not the core reason to choose it | Strongest: Stock Tokens, RWA-first ecosystem | Broad institutional settlement, weaker consumer/RWA product distribution |
| Wallet/repo migration | Lowest: named Base Account already present; standard viem chain config | Moderate: custom chain config, provider and AA validation needed | Current transition config, but unsuitable as the game execution default |
| Key risk | Sequencer/L2 reliance; Base-specific account features could leak into core | USDC mismatch, newer ecosystem, sequencer screening/finality/bridge and jurisdictional RWA constraints | Cost/latency and poor repeated-action economics |

### Why not multi-chain Phase 1

A simultaneous Base + Robinhood launch would multiply:

- GAS supply/rebase authority and cross-chain canonicality;
- Reserve and GameBankroll reconciliation;
- USDC provenance and bridge risk;
- oracle, finality and incident-recovery paths;
- liquidity fragmentation and 2% fee enforcement;
- upgrade/role wiring and audit surface.

Phase 1 should prove one authoritative monetary/game loop. Portability tests are allowed; live multi-chain monetary state is not.

### Robinhood Chain promotion gates

Robinhood Chain should be reconsidered for canonical Phase 1 or later RWA modules only after all are proven:

1. a canonical USDC path approved by product, risk and legal review, without silently substituting USDG;
2. Privy embedded/external wallet, smart-wallet, bundler and paymaster behavior validated on chain ID 46630;
3. oracle freshness, sequencer health and finality semantics available to the guarded controller;
4. Game Entry Router inventory/liquidity and 2% venue fee enforcement demonstrated;
5. geographic eligibility and Stock Token restrictions enforced outside the monetary kernel;
6. deposits, withdrawals, indexer recovery and provider failover adversarially tested;
7. no assumption that an RWA asset counts as GAS backing without D04 approval.

### Base failure modes and required mitigations

| Failure mode | Required response |
|---|---|
| Sequencer/RPC outage | OracleGuard and mutation adapters fail closed; reads show stale/degraded; no blind retry |
| Flashblock/preconfirmation reorg | UI distinguishes accepted/preconfirmed from safe/settled; irreversible payouts use approved finality threshold |
| L1 batch delay | Rebase/reserve actions pause or use bounded stale policy; never invent finality |
| Base Account/permission provider failure | Privy external/embedded wallet path remains recoverable; permission expansion is never automatic |
| Public RPC rate limit | production requires at least two approved provider transports plus health/freshness telemetry |
| Base-specific SDK lock-in | contract core and domain adapters use standard EVM interfaces; Base account features stay behind the account-rail adapter |
| USDC contract/config error | official address allowlist + chain ID + decimals/code checks; unavailable until verified |
| Mainnet premature deployment | CI contains no production broadcast secret; deploy workflow requires explicit environment approval and release artifact hash |

---

## Recommended tooling baseline

### Workspace

Create one contract workspace only after D01 approval:

```text
contracts/project-gas/
  foundry.toml
  src/
  test/unit/
  test/fuzz/
  test/invariant/
  test/fork/
  script/
  deployments/
```

Generated ABIs and deployment manifests may be consumed by the application, but React imports no raw deployment broadcast and calls no contract directly. The existing controller/query/adapter boundary remains mandatory.

### Compiler and libraries

Recommended initial technical pins:

- Solidity `0.8.36`, which fixes the public 0.8.35-and-earlier IR bug and the 0.8.29–0.8.35 storage-end warning bug;
- OpenZeppelin Contracts `5.4.0`, the current non-release-candidate line in the reviewed official release surface;
- Slither `0.11.6` for static analysis;
- an immutable Foundry release/commit and an immutable `foundry-toolchain` action SHA recorded in the first contract commit; never float on `latest` or a nightly channel;
- explicit common EVM target, initially `cancun`, unless the approved chain compatibility test proves a lower target is required;
- `via_ir = false` initially; any later IR enablement requires bytecode equivalence/regression review and a compiler-security check;
- optimizer enabled with a recorded run count; change only with bytecode-size and gas benchmarks.

Tool version updates are engineering changes with clean CI and security-note review, not automatic upgrades.

### Required local/CI commands

The contract lane must eventually block on:

```text
forge fmt --check
forge build --sizes
forge test
forge test --match-path 'test/fuzz/**'
forge test --match-path 'test/invariant/**'
forge coverage
slither .
```

Before testnet deployment it must also prove:

- deterministic deployment artifact and constructor/config hash;
- ABI and storage-layout diff review;
- role/authority manifest;
- no secret or private key in repository/output;
- chain ID assertion before broadcast;
- explorer verification or reproducible bytecode evidence;
- deployment address/code-hash/config readback;
- application configuration updated only after the deployment checkpoint is verified.

### Test profiles

| Profile | Chain | Purpose | Money authority |
|---|---|---|---|
| `unit` | in-process EVM | pure math/state tests | mocks only |
| `anvil` | 31337 | deterministic integration, time/epoch control, failure injection | local only |
| `base-sepolia` | 84532 | first public chain/account/provider/finality integration | test assets only |
| `base-fork` | forked 8453 | read-only USDC/oracle/venue compatibility tests | no broadcast |
| `robinhood-testnet` | 46630 | portability/RWA-adjacent spike after Base baseline | test assets only |
| `mainnet` | none until release approval | prohibited during ordinary Phase 9 development | explicit approval required |

### Chain abstraction law

The monetary kernel must not branch on `block.chainid` for economic policy. Chain-specific facts belong in immutable deployment configuration or adapters:

- official USDC address and decimals;
- oracle/feed and sequencer-health addresses;
- finality thresholds;
- router/liquidity venue;
- RNG provider/coordinator;
- bundler/paymaster/permission provider;
- RPC/indexer/explorer configuration.

Tests must run the same core invariants under every approved chain profile.

---

## Alternatives

### Alternative B — Robinhood Chain first

Benefits:

- direct alignment with the strongest current RWA-native chain thesis;
- live Stock Tokens and Chainlink stock-token feeds;
- sub-second soft confirmations, standard EVM tooling and ERC-4337 infrastructure;
- explicit ecosystem support for Uniswap, Morpho, Alchemy and custody/analytics partners.

Costs/failure modes:

- Source of Truth requires USDC, while official chain/currency surfaces currently center USDG;
- bridged or non-native USDC adds provenance, liquidity, redemption and incident-recovery risk;
- Stock Tokens cannot be assumed globally available and must remain outside Phase 1;
- newer chain/provider/indexer operational history;
- sequencer screening and Arbitrum bridge/finality semantics require explicit policy;
- chain choice could accidentally broaden GAS into an RWA product before the monetary/game kernel works.

Recommendation: retain as a tested portability target and later RWA module candidate, not the initial canonical chain.

### Alternative C — tooling now, chain still fully open

Approve Foundry/standard EVM only; run Anvil plus equal Base Sepolia and Robinhood testnet spikes before naming a provisional production target.

Benefit: minimizes premature chain commitment.

Cost: delays official USDC configuration, oracle/finality choices, account-permission integration, Game Entry Router liquidity design and public testnet vertical loops. It is viable if the user wants a formal two-chain bakeoff before D01 is resolved.

### Alternative D — Ethereum L1 first

Benefit: native USDC, mature security/oracles/liquidity and simplest canonical settlement domain.

Cost: repeated game actions, permissions, settlements and consumer transaction recovery inherit L1 cost/latency. Recommendation: reject as the Phase 1 game execution default; preserve as a possible reserve/settlement anchor subject to a later cross-chain packet.

---

## Approval record and boundary

The decision packet originally presented:

- **A — Base + Foundry (selected 22 August 2026):** Base fixed Phase 1 target, Base Sepolia first public testnet, Foundry canonical contract toolchain, Robinhood testnet retained for portability evidence.
- **B — Robinhood + Foundry:** Robinhood provisional Phase 1 target, contingent on a separate canonical USDC decision before any public money flow.
- **C — Foundry only / two-chain bakeoff:** approve the toolchain and chain-portability rules, but keep the production target open until a scored Base Sepolia vs Robinhood testnet spike is complete.

Selection of A does **not** approve:

- any mainnet deployment;
- live contract/token/oracle/provider addresses;
- a production RPC, bundler, paymaster, funding or withdrawal provider;
- rebase, reserve, GameBankroll, router, payout, RNG, presale, fee-allocation, governance or legal parameters;
- a proxy/upgrade architecture;
- Phase 9 closure or Phase 10 activation.

The Foundry-only D02 share/index/wGAS candidate scaffold now exists at
`contracts/project-gas/test/simulation/ShareIndexCandidateModel.t.sol`, with its
unapproved decision boundary recorded in
`D02_SHARE_INDEX_WGAS_CANDIDATE.md`. It contains no production monetary source
and keeps the exact precision, rounding, wrapper-unit, dust and all D03+
constants OPEN. The next D02 checkpoint is explicit approval of those exact
semantics after the listed full-precision and repeated-sequence evidence—not a
silent move of the candidate into `src/`.

## Primary evidence reviewed

- Base network IDs/RPCs: <https://docs.base.org/base-chain/quickstart/connecting-to-base>
- Base transaction finality: <https://docs.base.org/base-chain/network-information/transaction-finality>
- Base transaction timing: <https://docs.base.org/base-chain/network-information/troubleshooting-transactions>
- Base Account model: <https://docs.base.org/base-account/overview/what-is-base-account>
- Base/Privy subaccounts: <https://docs.base.org/base-account/framework-integrations/privy/sub-accounts>
- Base USDC/paymaster evidence: <https://docs.base.org/base-account/improve-ux/sponsor-gas/erc20-paymasters>
- Base Sepolia faucets/test assets: <https://docs.base.org/base-chain/network-information/network-faucets>
- Circle USDC supported chains: <https://developers.circle.com/stablecoins/usdc-contract-addresses>
- Circle stablecoin payment chains: <https://developers.circle.com/cpn/stablecoin-payments/references/supported-blockchains>
- Privy EVM network configuration: <https://docs.privy.io/basics/react/advanced/configuring-evm-networks>
- Robinhood Chain overview: <https://docs.robinhood.com/chain/>
- Robinhood network IDs/RPCs: <https://docs.robinhood.com/chain/connecting/>
- Robinhood finality: <https://docs.robinhood.com/chain/transaction-finality/>
- Robinhood account abstraction: <https://docs.robinhood.com/chain/account-abstraction/>
- Robinhood token contracts (WETH/USDG): <https://docs.robinhood.com/chain/contracts/>
- Robinhood Stock Tokens and restrictions: <https://docs.robinhood.com/chain/stock-tokens/>
- Robinhood oracles: <https://docs.robinhood.com/chain/oracles-and-price-feeds/>
- Foundry overview/testing: <https://www.getfoundry.sh/> and <https://www.getfoundry.sh/forge>
- Solidity 0.8.36 release/security fixes: <https://www.soliditylang.org/blog/2026/07/09/solidity-0.8.36-release-announcement/>
- OpenZeppelin Contracts releases: <https://github.com/OpenZeppelin/openzeppelin-contracts/releases>
- Slither: <https://github.com/crytic/slither>

## Evidence limitations

- Chain, account, oracle, stablecoin and provider support can change. Revalidate primary documentation at each deployment checkpoint.
- Circle's omission of Robinhood Chain from the reviewed supported-USDC lists is evidence of missing official support in those lists, not proof that no bridged token using the USDC symbol exists.
- No contract source, ABI, live address or provider configuration is approved by this packet.
- Legal restrictions described by a chain/token issuer are not legal advice. D13 requires qualified review before release.
