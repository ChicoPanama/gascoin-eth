# Project GAS — Base + Coinbase Ecosystem Integration Research

**Date:** 23 August 2026  
**Status:** research input only; does not supersede Source of Truth v1.1 or freeze OPEN chain/economic/legal parameters.  
**Scope:** Base App, Base Account, Coinbase Developer Platform, Base protocol stack, current productive Base ecosystem primitives, consumer/social distribution, agentic tooling, and how GAS can become Base-native without importing unnecessary dependencies.

## Executive thesis

The strongest GAS strategy is not merely `deploy contracts on Base`. GAS should be designed as a Base-native consumer economy:

- Base Account / Sign in with Base for identity and wallet abstraction;
- app-specific subaccounts + bounded spend permissions for repeated low-friction game actions;
- CDP Paymaster/Bundler for gas sponsorship and batched operations;
- Base App mini-app compatibility and discovery;
- USDC-first funding via Coinbase Onramp/Base Pay where permitted;
- Farcaster/Base App social distribution and XMTP Crew communication;
- Aerodrome/Uniswap for liquidity execution, Morpho/Moonwell for selectively approved yield/credit primitives, wstETH for productive reserve exposure where policy allows;
- agent-native support through Base MCP, CDP Agentic Wallets and x402;
- Base Builder Codes / attribution where available;
- preserve Project GAS financial firewalls and authoritative-state architecture.

The desired player experience is:

`open GAS in Base App -> Sign in with Base -> fund with USDC -> bounded app permission -> CRUISE/BOOST/REDLINE -> IGNITION -> GAS GAUGE -> replay/share/hold/trade`

No seed phrase requirement, no ETH gas management, no repeated token approval prompts, no manual bridge requirement, and no fake optimistic settlement.

## Current Base / Coinbase capabilities relevant to GAS

### Base App

Base App is now a global consumer surface combining social, trading, payments, app discovery, chat and earning. It supports mini apps in-feed; its social feed is built on Farcaster, posts can be tokenized through Zora, and chat is powered by XMTP. Base App therefore can be treated as a distribution surface for GAS rather than only a wallet.

GAS implications:

- Build GAS Original as a Base App-compatible mini app/surface.
- Deep links from Base feed activity directly into a replayable GAS round or GAS profile.
- Use GAS social events (wins, Crew milestones, verified activity) as shareable Base-native objects, but avoid making every activity a speculative coin.
- Keep GAS identity canonical internally while supporting Base Account/Farcaster identity binding.
- Add Base/XMTP Crew chat integration only behind explicit consent; economic truth remains in GAS authoritative models, not chat.

### Base Account / app accounts / spend permissions

Base Account supports app-specific accounts/subaccounts and bounded spend permissions. Gaming is an explicit use case: time-limited events and repeated app actions can execute within approved limits without prompting for every transaction.

Recommended GAS pattern:

1. User signs in with Base.
2. GAS creates/links an app account dedicated to GAS.
3. User funds it with a chosen USDC budget.
4. User grants a bounded permission with explicit amount, frequency, duration, and revocation path.
5. GAS Original can execute low-value IGNITIONS inside those bounds without repeated wallet popups.
6. Any wager outside the bound requires fresh user approval.
7. Permission state must be visible, revocable and represented as a first-class security object in Account.

Do not use open-ended approvals or custody. App-account funds and primary-wallet funds must remain visually and financially distinct.

### CDP Paymaster + Bundler

CDP Paymaster can sponsor Base transaction gas and batch ERC-4337 operations. GAS should use this to make gas invisible for the core consumer loop.

Candidate sponsored operations:

- account setup;
- initial permission/revoke;
- small approved IGNITION/settlement related user operations;
- claim/share/profile writes when economically reasonable.

Do not blindly sponsor arbitrary swaps or unbounded activity. Build a sponsorship policy keyed by action class, user/session caps, abuse score, and protocol economics.

### Coinbase Onramp / Base Pay

Coinbase Onramp supports embedded fiat funding through Coinbase balances and supported payment methods. Base Pay provides fast USDC checkout. GAS should treat these as optional funding adapters behind the canonical funding boundary, not hard-code the product to one provider.

Canonical path remains `USDC at player boundary`. Provider adapters may make acquiring that USDC invisible.

### CDP Embedded Wallets

Embedded Wallets provide email/SMS/OAuth onboarding and a white-label wallet UX. GAS should not automatically replace Base Account/Privy with CDP wallets merely because they exist. Instead evaluate:

- Base App users: prefer Base Account / Sign in with Base.
- Standalone web/mobile acquisition outside Base App: CDP Embedded Wallets are a strong alternative adapter.
- Existing EVM users: support wallet linking through the current canonical account architecture.

The account model should support multiple credential providers without letting wallet implementation become protocol identity.

### Agentic Wallets / x402 / Base MCP

Coinbase now exposes agent-focused wallets with spending guardrails and gasless Base execution, while x402 supports ERC-20 payments and Base MCP exposes ecosystem skills including Morpho, Moonwell, Aerodrome, Uniswap, Avantis, Bankr and Virtuals.

Future GAS opportunity:

- a read-first GAS Agent can explain reserve state, account state, GAS GAUGE verification and portfolio exposure;
- bounded automation can perform non-custodial maintenance or user-authorized actions under explicit spending policies;
- x402 can support machine-paid premium data, analytics or API services without API-key friction;
- protocol maintenance agents should never receive raw authority to violate reserve, bankroll, rebase or settlement invariants.

Agent design law: agents choose from safe contract transitions; they do not become trusted financial operators.

## Base chain roadmap implications

Base is moving toward native 200 ms blocks; its current upgrade roadmap says the planned native 200 ms block lifecycle will eventually supersede Flashblocks. GAS should therefore avoid hard-coding a dependency on Flashblocks-specific websocket semantics and instead build latency abstraction around canonical Base transaction states.

Sub-second UX is highly attractive for GAS Original:

`IGNITION -> acknowledgement -> randomness pending -> outcome -> replay`

The presentation may react immediately, but final financial truth still comes from authoritative chain/backend state.

Base also has Appchains for mature apps that need dedicated scale. GAS should not launch an Appchain in Phase 1. Consider it only after Base mainnet throughput, sponsorship cost or state isolation becomes a proven constraint.

## Productive / innovative Base ecosystem primitives worth using or learning from

### Aerodrome

Aerodrome is a core Base DEX with constant-product and concentrated-liquidity (Slipstream) AMMs and an integrated liquidity incentive system.

GAS use:

- candidate primary/secondary GAS-USDC liquidity venue;
- potential protocol-owned liquidity deployment;
- useful reference for liquidity depth, fee routing and incentive efficiency.

GAS should not import ve-token complexity into Phase 1 merely to participate. POL must remain separate from monetary backing.

### Uniswap

Uniswap remains a key liquidity route and v4 hooks can support venue-specific policy logic without contaminating the GAS ERC-20 with fee-on-transfer semantics.

GAS use:

- alternate/aggregated execution route;
- potential future v4 hook for bounded fee/policy behavior;
- price/TWAP input as one oracle component, never as a sole manipulable source.

The earlier CCA launch path remains deprecated for GAS even though Uniswap has continued developing launchpad mechanisms.

### Morpho

Morpho Vault V2 is especially relevant. Its adapter architecture, granular exposure IDs/caps, role separation and real-time asset reporting closely match the direction GAS needs for ReserveStrategyRouter.

GAS should borrow the design laws:

- strategy adapters instead of hard-coded single yield venue;
- absolute + relative exposure caps;
- explicit owner/curator/allocator/sentinel-like role separation;
- real asset reporting;
- idle-liquidity floor;
- gated strategy approval.

Do not blindly deposit monetary reserves into third-party vaults. Reserve policy decides which adapters count as backing and at what haircut.

### Moonwell

Moonwell provides consumer-friendly Base lending/borrowing and liquid mToken representations of supplied assets. It is useful both as a possible future strategy venue and as a UX benchmark for hiding protocol complexity.

GAS use later:

- conservative USDC yield or credit adapter if risk-approved;
- potential wGAS borrowing UX benchmark;
- user-facing Earn integration only after monetary kernel and legal/risk review.

### wstETH / Lido

Base supports wstETH exposure. wstETH is a fixed-share representation of stETH, aligning well with GAS share/index accounting.

Potential reserve role:

- productive ETH reserve exposure;
- haircut for ETH volatility + Lido + bridge/integration risk;
- keep a liquid stable floor ahead of volatile/staked-ETH allocation.

### Avantis

Avantis represents Base-native high-speed perpetual/RWA-style markets and is useful as a market-UX benchmark. GAS should not add leveraged perps to Phase 1, but can study its fast confirmation, position feedback, risk display and market breadth for later Bracket/RWA work.

### Zora

Zora powers post/creator coin primitives in the Base App.

GAS should borrow distribution behavior, not token proliferation:

- shareable verified wins;
- creator/crew identity and social objects;
- collectable founding/history artifacts where useful.

Do not turn every GAS post/win into a new speculative token. GAS itself should remain the economic center of gravity.

### Farcaster + XMTP

Farcaster powers social identity/feed behavior; XMTP powers private chat.

GAS use:

- Base-native share/deep-link layer;
- optional Crew conversations;
- verified round cards in social feed;
- referrals and invites as deep links with server/onchain attribution.

Economic state is never sourced from social data.

### Virtuals / agent economy

Virtuals and Base's agent tooling show strong demand for autonomous onchain software. GAS can later expose machine-readable reserve/market/game verification data and controlled actions, but should not create an agent token merely to participate in the trend.

### Base-Solana bridge

Base-Solana interoperability is now live through a Coinbase + Chainlink-secured bridge. This gives GAS optional future access to Solana assets and liquidity without making GAS multichain at genesis.

Use only through explicit adapters and risk limits. Never count bridged assets as equivalent to canonical Base USDC without bridge/oracle haircuts.

## Fomo comparison: how GAS should be better

Fomo's Base product supports any ERC-20 trading, Base USDC deposits, discovery by volume, push notifications, and a friends feed showing followed traders' activity.

GAS should take the high-retention laws and apply them to a more coherent economic product:

### What to preserve

- fast discovery;
- social proof;
- friends/crew activity;
- instant trading/replay;
- push/deep-link notifications;
- one balance / low-friction funding feeling.

### What GAS can do better

1. **One native economy instead of a generic token casino.** The game, social graph, reserve, rebase and trade surfaces all reinforce GAS rather than sending attention across endless unrelated tokens.
2. **USDC boundary, GAS internally.** New users never need to acquire ETH or manually buy GAS before playing.
3. **App accounts + spend permissions.** One explicit bounded approval can enable a session of repeated IGNITIONS while preserving self-custody.
4. **Sponsored gas.** Users should not experience network gas during the core game loop.
5. **Provable settlement.** GAS GAUGE can expose randomness/round verification instead of merely showing a P&L feed.
6. **Crews > followers.** Crew competition, streaks, verified activity and collective milestones can create stronger identity than a generic friends feed.
7. **Reserve-backed monetary story.** Holding GAS has system-level meaning beyond momentum trading, provided accounting remains externally backed and transparent.
8. **One-tap social replay.** A Base feed card should deep-link directly into the same mode/wager context, with clear fresh-confirmation before money moves.
9. **No fake economic activity.** All economic social events must be protocol/onchain verified, preserving the Phase 9 provenance law.
10. **Consumer UX without custody ambiguity.** Keep spendable funds, app-account budget, locked wagers, GameBankroll, Reserve and POL visibly distinct.

## Proposed Base-native GAS architecture

```text
BASE APP / STANDALONE GAS
        |
        +-- Base Account / Sign in with Base
        +-- alternative wallet credential adapters
        |
        v
PROJECT GAS IDENTITY
        |
        +-- profile / Crew / referrals / notification prefs
        +-- linked app account
        |
        v
FUNDING ROUTER
        +-- existing Base USDC
        +-- Coinbase Onramp adapter
        +-- Base Pay / supported payment adapter
        |
        v
GAS APP ACCOUNT
        +-- bounded USDC/GAS spend permission
        +-- revocation / expiry / cap state
        |
        v
GAME ENTRY ROUTER
        USDC -> invisible GAS sourcing/netting
        |
        v
GAS ORIGINAL
CRUISE / BOOST / REDLINE
        |
        v
IGNITION
        |
        +-- CDP Paymaster sponsorship where policy allows
        +-- Base low-latency execution
        +-- authoritative GameBankroll admission
        +-- RandomnessAdapter
        |
        v
GAS GAUGE
        +-- verified result
        +-- replay
        +-- hold
        +-- trade
        +-- share to Base/Farcaster

TRADE ROUTER
        +-- Aerodrome
        +-- Uniswap
        +-- later aggregators

RESERVE STRATEGY ROUTER
        +-- liquid USDC floor
        +-- approved Morpho/Moonwell adapters
        +-- approved wstETH strategy
        +-- future RWA adapters
        +-- per-strategy haircuts + caps

SOCIAL/DISTRIBUTION
        +-- Base App mini app
        +-- Farcaster social graph/deep links
        +-- XMTP Crew chat
        +-- Base notifications

AGENT LAYER (later)
        +-- Base MCP / GAS skill
        +-- x402 data/services
        +-- bounded Agentic Wallet policies
```

## Critical implementation principles

### GAS should be gasless to the player, not gasless to the protocol

Track sponsorship as a real acquisition/COGS line. Sponsor only high-value core actions. Add per-user and per-action budget caps and abuse controls.

### Permissions must be bounded

Do not recreate casino custody by hiding an unlimited allowance inside a smart account. Permission UX must always communicate remaining budget, expiration, allowed action classes and revoke path.

### Base App is distribution, not authority

Base/Farcaster/XMTP can distribute and communicate GAS state. They cannot define settled financial truth.

### Build around Base Account but remain provider-modular

The current Privy/account architecture should evolve through adapters, not be discarded in a rewrite. A user can bind Base Account, embedded wallet or external EVM wallet to one GAS identity.

### Do not hard-code Flashblocks

Base's upgrade roadmap now plans native 200 ms blocks and deprecation of the Flashblocks stream. Use a Base latency/finality adapter with canonical fallback.

### Reserve adapters should look more like Morpho V2 than ad hoc treasury scripts

Each strategy needs identity, caps, real asset reporting, liquidity status, haircut and emergency disable controls.

### Avoid unnecessary token proliferation

Do not create Crew coins, win coins, agent coins or creator coins by default. Zora/Base social primitives are useful for distribution, but GAS should stay the single primary economic asset.

## Suggested sequencing within the existing roadmap

This research does not create a new numbered roadmap. For the existing Phase 9 decision packet, the recommended Base-related decision order is:

1. Evaluate Base as canonical Phase 1 chain and define finality/latency assumptions.
2. Add Base Account / app-account / bounded-permission compatibility to the account decision packet.
3. Define Paymaster sponsorship policy and unit economics.
4. Define USDC funding adapters (Base balance, Coinbase Onramp/Base Pay where eligible).
5. Freeze share/index/wGAS monetary kernel.
6. Freeze ReserveStrategyAdapter interface inspired by Morpho V2 caps/reporting.
7. Decide initial liquidity routing between Aerodrome/Uniswap and POL policy.
8. Complete GameBankroll, Game Entry Router, randomness and wager execution.
9. Add Base App mini-app manifest/discovery/social deep-link compatibility.
10. Add XMTP/Farcaster social integrations only after economic vertical loop is authoritative.
11. Add agent/x402 integrations after human financial flows and bounded permissions are proven.
12. Consider Base Appchain only if real usage proves Base L2 itself insufficient.

## Current recommendation

Base should now be the leading chain candidate for GAS Phase 1, subject to formal validation of legal/provider availability and final chain decision approval.

The target differentiation is:

**Fomo:** universal social token trading feed.  
**GAS:** Base-native monetary game network — one reserve-backed elastic asset, one high-frequency signature game, one identity/crew graph, one-tap social replay, invisible USDC->GAS entry, sponsored transactions, verifiable settlement, and a productive reserve behind it.

The optimal Coinbase strategy is to use Coinbase/Base as the distribution, account, payment, infrastructure and agent stack while keeping GAS economic truth and protocol invariants independent and verifiable onchain.
