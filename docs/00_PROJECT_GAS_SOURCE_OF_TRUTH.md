# PROJECT GAS — SOURCE OF TRUTH

**Status:** Canonical working specification  
**Version:** 1.0  
**Date:** 2026-08-14

## Authority

When prior Project GAS discussions conflict, the newest explicit GAS-specific decision controls.

Decision states:

- **LOCKED** — explicitly accepted or repeatedly reaffirmed.
- **CURRENT** — latest working architecture; exact parameter may still need freeze.
- **OPEN** — not finalized; must not be silently hard-coded.
- **DEFERRED** — intentionally excluded from Phase 1.
- **DEPRECATED** — superseded.

---

## 1. Project definition

**LOCKED:** The protocol is **GAS**.

GAS is a reserve-backed elastic monetary protocol combined with a high-frequency, provably-fair game and social layer.

The system has four economic engines:

1. the GAS elastic asset;
2. external reserve backing and protocol-controlled liquidity;
3. the GAS game/social economy;
4. future economic integration with Bracket while preserving independent solvency.

The product must not feel like a slow DeFi yield farm. The monetary system can be sophisticated underneath, but the consumer experience must be simple, visual, social, and highly replayable.

## 2. Non-negotiable product principles

### Simple first

Primary loop:

`one machine -> one choice -> one action -> one short wait -> one result`

Users should not need to understand rebasing, reserve ratios, AMM math, or treasury policy before they can use GAS.

### GAS-native branding

Retire CORE and pressure-based user-facing naming. Current GAS-native vocabulary:

- CRUISE
- BOOST
- REDLINE
- IGNITION
- GAS GAUGE

### Social by design

Accepted primitives:

- social games;
- crews;
- referrals;
- shared/high-frequency activity;
- result cards and replay loops;
- leaderboards.

### Real backing

GAS must improve on earlier reflexive elastic systems by accumulating genuine external assets and liquidity.

### Financial firewalls

`GAS monetary reserve != GAS game bankroll != Bracket collateral`

No subsystem may hide another subsystem's losses.

## 3. Assets

### GAS

**LOCKED:** GAS is the protocol's primary persistent asset and current Phase 1 elastic dollar-like monetary asset.

### wGAS

**CURRENT:** Fixed-share / non-rebasing representation for DeFi and integrations that cannot tolerate visible rebases.

Invariant:

`wGAS liabilities = GAS shares held by wrapper`

### GSD

**OPEN / RESERVED:** Earlier work separated GAS and GSD; later work consolidated the elastic-dollar function into GAS. Phase 1 therefore uses GAS + wGAS unless a separate GSD asset is explicitly approved later.

## 4. Monetary architecture

### Share / index model

`visible GAS balance = wallet shares × global GAS index`

Rebases modify the global index, not every wallet.

### Daily rebase

**CURRENT:** Visible daily cadence, approximately $1 reference target. Exact oracle set, deadband, max positive/negative rebase, reserve constraints, and emergency controls remain OPEN.

### External-only backing

**LOCKED:** GAS may not back GAS with GAS. GAS, wGAS, self-issued LP value, and circular accounting cannot count as external reserve backing.

## 5. Reserve and RWA treasury

**CURRENT:** Build a treasury of real external assets, potentially including conservative short-duration tokenized dollar/RWA assets. Specific provider/issuer/custodian remains OPEN.

Treasury yield is protocol income. It is not guaranteed player yield and cannot be used to disguise game losses.

## 6. Genesis / launch

**CURRENT:** Use a simple presale, not the old Index-Settled CCA.

Launch should bootstrap external reserve and protocol-controlled liquidity without requiring a huge team-funded treasury.

Open parameters:

- price;
- cap;
- duration;
- quote assets;
- allocation;
- initial index;
- reserve/POL split.

### Team principal exit

**LOCKED AS REQUIREMENT:** retain the previously agreed team principal-exit mechanism, but rewrite the implementation for the simple-presale structure. Amount, trigger, timing, cap, accounting, and transparency remain OPEN.

### Deprecated launch concepts

- Index-Settled CCA
- SEAL / CRACK UX
- Day-28 CCA exit mechanics

## 7. GAS liquidity and trading fee

**LOCKED:** GAS buys and sells carry a 2.00% base trading/hook fee:

- 1.50% -> GAS protocol
- 0.50% -> team

The 1.50% protocol bucket primarily strengthens reserve, POL, stabilization, and protocol-owned infrastructure. Exact internal split remains OPEN.

## 8. GAS Original

Signature high-frequency game:

`USDC or GAS -> CRUISE / BOOST / REDLINE -> IGNITION -> verified RNG -> GAS GAUGE -> result / GAS payout`

### CRUISE

Lower variance.

### BOOST

Balanced default.

### REDLINE

Higher variance / extreme payout profile.

Old CALM/LIVE/WILD and STABLE/SURGE/BREACH naming is deprecated.

## 9. Game assets and payout loop

**LOCKED:** Game supports USDC and GAS.

Preferred acquisition loop:

`USDC in -> gameplay -> GAS out`

Existing GAS holders can also play with GAS.

Operational conversion inventory belongs to GameBankroll, not the monetary ReserveVault.

## 10. Game economics

**LOCKED:**

| Period | Player / RTP envelope | GAS protocol | Team | Total take |
|---|---:|---:|---:|---:|
| Days 1-14 | 90% | 7% | 3% | 10% |
| Days 15-28 | 92% | 6% | 2% | 8% |
| Days 29-42 | 93% | 5% | 2% | 7% |
| Day 43+ | 95% | 4% | 1% | 5% |

These are expected aggregate handle economics, not a promise that each round pays a fixed RTP.

CRUISE / BOOST / REDLINE probability tables must reproduce the active epoch RTP mathematically.

## 11. Social games

**LOCKED:** Social games are part of GAS.

First accepted conventional game: **provably-fair roulette**.

Roulette does not replace GAS Original.

## 12. Social network layer

Accepted primitives:

- crews;
- referrals;
- live activity;
- profiles;
- result posts/cards;
- leaderboards;
- one-tap replay / try-this-configuration actions.

Exact reward emissions and anti-sybil controls remain OPEN.

## 13. Game / reserve firewall

**LOCKED:** ReserveVault cannot back gambling liabilities.

1. player submits wager;
2. GameBankroll validates liability capacity;
3. wager locks;
4. verifiable RNG/VRF resolves;
5. GameBankroll settles;
6. only realized house/protocol revenue exits the game domain;
7. protocol revenue may then strengthen GAS according to policy.

A game deficit cannot call ReserveVault for rescue capital.

## 14. Revenue architecture

Distinct bases must remain distinct:

- GAS trading volume -> 2.0% (1.5% protocol / 0.5% team)
- game handle -> epoch schedule (7->4% protocol / 3->1% team)
- treasury/RWA yield -> protocol income
- future Bracket integration -> additional GAS utility/economic capture
- separately agreed team principal exit

Trading volume and game handle must never be merged in revenue reporting.

## 15. GAS and Bracket

**LOCKED:** Economically interconnected, financially separable.

At launch, GAS is not mandatory Bracket collateral. Bracket must remain functional without GAS collateral.

Near-term utility may include rebates, staking, liquidity incentives, ecosystem identity, and protocol revenue that strengthens GAS.

Optional GAS collateral is only considered after sufficient liquidity, reserves, market depth, and risk/oracle maturity.

## 16. Chain position

**OPEN:** Final deployment chain not locked. Build modular EVM architecture. Base ancestry remains useful; Robinhood Chain has been explored for consumer/RWA distribution.

## 17. UX doctrine — now canonical

**LOCKED DIRECTION:** UX is a first-class protocol component.

The product should combine:

- existing GAS visual/component foundation;
- Fomo-like social-first discovery and unified identity;
- ORE-like visible shared/live protocol state;
- Stake Originals-like interaction economy and repeated-play speed.

Do not copy proprietary UI code or brand trade dress. Reverse-engineer interaction principles and implement a GAS-native experience.

### Core UX rules

1. First-time user understands GAS Original and can initiate play within 10 seconds of opening Play.
2. Returning user can initiate the next round with one primary action.
3. Monetary complexity increases trust without increasing interaction complexity.
4. Core Play loop fits within one mobile viewport where practical.
5. CRUISE / BOOST / REDLINE communicate relative risk visually.
6. Provably-fair verification is accessible from every completed result.
7. Live network activity must be real; never fabricate players, wins, volume, or reserve data.
8. Reserve and GameBankroll must be visibly distinct in trust/accounting surfaces.
9. Social results should be actionable: a result post can deep-link into the same game mode/configuration.
10. Instant Mode may shorten animation but never alter outcome/settlement semantics.

## 18. Phase 1 product surfaces

- Home
- Play / GAS Original
- Play / Roulette
- Trade
- Crews
- Reserve
- Wallet / profile
- Provably Fair / result verification

Docs, audits, contracts, and governance are secondary protocol surfaces rather than prime navigation.

## 19. Phase plan

### Phase 1 — foundation

Build:

- GAS share/index token;
- wGAS;
- oracle/rebase controller;
- ReserveVault;
- simple presale;
- POL;
- 2% fee architecture;
- FeeRouter;
- GameBankroll;
- GAS Original;
- roulette;
- minimum viable social/crew/referral layer;
- new GAS UX shell.

Do not require Bracket, PEG WAR, mandatory GAS collateral, many games, or GSD.

### Phase 2 — depth/network

Expand reserves, POL, selected RWA integrations, social network, crews, referrals, additional games, and automated risk monitoring.

### Phase 3 — Bracket integration

Integrate economically while preserving independent solvency.

### Phase 4 — optional monetary expansion

Evaluate GAS as optional collateral and/or separate GSD only after maturity.

## 20. Open decisions before code freeze

1. final GAS/GSD architecture;
2. exact rebase control law;
3. oracle architecture;
4. rebase caps/deadband;
5. minimum external backing ratio;
6. reserve whitelist / RWA providers;
7. presale parameters;
8. team principal-exit implementation;
9. internal split of 1.5% protocol trade fee;
10. internal split of game protocol bucket;
11. CRUISE / BOOST / REDLINE odds/payout curves;
12. RNG/VRF implementation and liveness recovery;
13. crew/referral economics and anti-sybil controls;
14. governance/multisig/emergency roles/upgradeability;
15. final Phase 1 chain;
16. legal/regulatory structure;
17. exact UI component specifications and interaction budgets.

## 21. Phase 1 acceptance standard

Phase 1 is not complete until:

- share/index rebase accounting is correct;
- wGAS is exactly share-backed;
- reserve accounting excludes self-backing;
- external backing is auditable;
- 1.5% / 0.5% trading fee split is deterministic;
- simple presale initializes GAS without old CCA;
- GameBankroll enforces liability/risk limits;
- no path allows game losses to use ReserveVault;
- game mode math reproduces active epoch RTP;
- results are verifiable;
- accounting separates trading, game, reserve yield, and team income;
- Bracket can be absent without breaking GAS;
- UX acceptance gates in `docs/ux/01_UX_DOCTRINE.md` pass.

This file is the baseline against which future Project GAS changes must be evaluated.
