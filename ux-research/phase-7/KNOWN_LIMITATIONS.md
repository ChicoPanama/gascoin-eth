# Phase 7 — Known Limitations

**Status:** required gate evidence for the mobile UX prototype.  
**Rule:** a green prototype is not protocol readiness.

## What Phase 7 proves when the gate passes

Phase 7 is intended to prove only that the **consumer interaction model** is coherent and mechanically testable:
- five-destination mobile shell;
- Project GAS Home/Play/Trade/Crews/Account hierarchy;
- GAS Original CRUISE/BOOST/REDLINE → amount → IGNITION → state → result → replay loop;
- one-action replay;
- explicit canonical action states;
- no-scroll primary Play reachability at 390×844;
- minimum mobile touch targets for primary controls;
- presentation speed separated from canonical result state;
- honest prototype/unavailable states;
- consumer account-entry direction;
- no legacy UI interference on Project GAS routes.

## What Phase 7 does NOT prove

### Protocol/game execution
Not connected:
- GameBankroll;
- real wager locking;
- VRF/RNG provider;
- payout tables/RTP curves;
- settlement transaction path;
- FeeRouter;
- protocol/team game-revenue accounting;
- bankroll solvency checks;
- pause/kill-switch policy.

The current results are deterministic illustrative UI data and are explicitly labeled as such.

### Monetary system
Not connected:
- GAS share/index token;
- rebase controller;
- price/oracle source;
- ReserveVault;
- external reserve composition;
- backing ratio;
- wGAS wrapper;
- POL/fee routing;
- rebase schedule/countdown.

No reserve ratio, backing number or rebase countdown is fabricated in the prototype.

### Real Trade
Not connected:
- real GAS quote source;
- swap/router execution;
- fee/minimum-received calculation;
- price-impact/slippage calculation;
- funding provider;
- withdrawal provider;
- quote expiry/reconciliation.

`/trade` is a shell only.

### SocialFi
Canonical event types exist, but live data is not connected:
- native GAS profile graph;
- follows;
- Crews;
- real rankings;
- live verified activity feed;
- reactions/comments;
- notifications;
- search index;
- anti-Sybil/ranking logic.

No fake player, result, Crew, ranking or notification data is shown.

### Authentication/account policy
The branch introduces consumer-first email entry and embedded-wallet creation for users without a wallet while preserving legacy login methods. Phase 7 does not yet prove:
- final sign-in provider set;
- final custody/recovery policy;
- final passkey behavior;
- bounded Play permission implementation;
- gas sponsorship/paymaster behavior;
- cross-device pending-action reconciliation;
- sensitive-action step-up implementation.

### Chain selection
The transition repository remains configured to Ethereum mainnet for legacy compatibility. **This is not a final Project GAS chain decision.** The canonical Phase 0 decision remains OPEN.

### Roulette
Roulette remains in protocol scope but its Phase 7 interaction surface is not implemented yet. `/play` presents it as pending rather than pretending it exists.

### Desktop
Phase 7 is mobile-first. The current CSS may render on desktop, but desktop navigation/context is not considered canonical until Phase 8.

### Bracket
Only future compatibility contracts/IA exist. No Bracket market/position implementation belongs to Phase 7.

### Native app / authenticated Fomo measurement
No native GAS application is built. Earlier Phase 2 Fomo native/authenticated exact measurements remain unavailable without a user-device capture node and are not implied by this prototype.

## Explicit blockers for Phase 9 real-state implementation

Before Phase 9 can close, the project will need authoritative interfaces/decisions for at least:
- deployed or integration-ready GAS token/share-index contracts;
- oracle/rebase controller;
- ReserveVault and reserve data source;
- GameBankroll;
- GAS Original wager/settlement API/contracts;
- real RNG/VRF and liveness policy;
- payout/RTP tables;
- actual trade/liquidity path;
- bounded authorization/account architecture for the selected chain;
- canonical social/event persistence/indexing.

Those are **not reasons to weaken Phase 7**; they define the boundary between a tested consumer interaction prototype and real protocol integration.
