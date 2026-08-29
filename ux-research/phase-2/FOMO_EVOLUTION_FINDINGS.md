# Phase 2 — Fomo Evolution Findings

**Purpose:** use Fomo's own shipped redesign history to identify which UX problems it repeatedly optimized after launch. These are stronger signals than isolated screenshots because they reveal persistent product priorities.

## 1. Onboarding was repeatedly simplified

Documented changes:
- redesigned onboarding in the November 2025 full-app refresh;
- email/Apple-ID primary account model;
- embedded wallet model rather than requiring external wallet setup;
- native Apple Pay onramp in January 2026;
- web signup described as under 30 seconds;
- biometric app/security controls added without adding day-to-day friction.

### GAS implication
Phase 6 account architecture must be evaluated as a consumer onboarding problem first, wallet implementation second. The current X + external-wallet/mainnet-only GASCOIN policy is not the target.

---

## 2. Navigation/search moved closer to the thumb and persistent shell

Fomo's November 2025 redesign documents:
- liquid-glass tab bar;
- search integrated with the tab bar;
- redesigned onboarding;
- profile-header improvements.

Fomo's navigation guide describes the social feed as the middle bottom-panel action and Friends/Leaderboard as a primary bottom destination.

### GAS implication
The mobile GAS shell should treat Home/Play/Trade/Social/Account as first-class thumb-zone destinations. Search should be a universal product primitive, not buried inside a secondary page.

No exact tab dimensions are considered measured yet.

---

## 3. Feed scanability became an explicit optimization target

Documented sequence:
- friends/following feed introduced;
- following toggle added to the main feed;
- trade spotlight reorganized for easier browsing;
- February 2026 full feed revamp explicitly targeted faster parsing during high-activity periods;
- trade thesis/PnL/balance context was added without abandoning scanability.

### GAS implication
GAS needs a typed activity grammar. A feed card cannot be an unstructured blob. Event type, identity, action/result, magnitude, verification state and contextual CTA need stable visual positions.

Candidate GAS activity types:
- `game_result`
- `gas_trade`
- `crew_event`
- `rebase_event`
- `reserve_event`
- `protocol_milestone`
- later `bracket_position`

---

## 4. Fomo progressively attached context to financial actions

Documented additions include:
- dynamic PnL directly on charts;
- invested amount on position cards;
- average hold time on profiles/holder lists;
- trade thesis attached to buys/sells;
- thesis expanded from token feed to global feed;
- PnL and balance context on thesis cards;
- verified badge/safety information near token headers;
- transaction simulation toggle;
- low-fee messaging displayed at the point of trade.

### GAS implication
Do not make users navigate away to understand the state that matters to the current decision.

For Play:
- wager;
- mode/risk;
- RTP/odds disclosure;
- settlement state;
- fairness verification;
- current balance.

For Trade:
- amount;
- estimated received;
- fees/impact;
- confirmation;
- settlement state.

For Reserve/Rebase:
- direction/magnitude;
- personal impact;
- coverage;
- deeper verification one level down.

---

## 5. Re-entry/repeat-action friction was actively reduced

January 2026 documents a `Sell again` button for completed trades. Fomo web emphasizes quick buys and fast action. Dollar preset buys were also part of late-2025 trading-speed work.

### GAS implication
The canonical GAS game rule remains:
**result -> next eligible IGNITION = one action.**

Safe convenience preferences may persist (mode, non-dangerous wager preset, instant/cinematic preference). Dangerous one-time states such as MAX should not become silently sticky.

---

## 6. Social graph became richer, not separate

Documented additions:
- friends feed;
- following toggle;
- trade comments;
- reactions;
- mutual followers;
- profile performance context;
- notifications for followed traders;
- thesis activity in token and global feeds;
- social overlays on TradingView charts;
- same social primitives applied to perpetuals.

### GAS implication
Social is not a `/community` destination. It is a horizontal layer across Home, Play, Trade, profile, Crews, charts/analytics and later Bracket.

Existing GASCOIN community/leaderboard mechanics are useful, but their receipt/refund object model must be replaced.

---

## 7. Advanced tools were added without converting the product into a terminal

Fomo web explicitly says it is not a trading terminal. TradingView's advanced charting was later embedded directly into the existing product, with social activity overlaid on the charts.

### GAS implication
Phase 8 desktop adaptation may use the larger canvas for secondary context, but primary actions and mental models must remain consistent with mobile. Advanced trading, protocol details, proofs and market depth should be progressive disclosures.

---

## 8. Infrastructure abstraction is treated as UX

Fomo documents:
- one unified USD balance;
- multiple chains without normal bridging/switching;
- gas sponsorship;
- smart-wallet/account-abstraction capabilities;
- transaction batching;
- cross-device account continuity.

### GAS implication
The GAS infrastructure work is a UX dependency, not only backend plumbing. Product success requires the chain/account system to support the user journey we are specifying.

This finding must feed Phase 6 and the protocol/client architecture without prematurely locking a chain in Phase 2.

---

## 9. Safety/recovery is contextual

Documented examples:
- biometric security;
- transaction simulation toggle;
- token verification badge;
- safety/warning cues;
- external-link warning;
- deposit notifications with USD context.

### GAS implication
Trust controls should appear at the point of consequence. Security should be stricter for withdrawal/export/authorization changes than for ordinary browsing. Game/trade settlement and permission failures need human recovery states rather than raw RPC errors.

---

## 10. Candidate Fomo-derived GAS benchmarks

These are **targets to validate**, not measured Fomo values:

- one primary mobile bottom-navigation shell;
- social feed reachable from one primary navigation action;
- feed -> profile <= 1 contextual navigation action;
- profile -> follow = 1 explicit action once profile is open;
- social result -> matching GAS configuration <= 2 actions before explicit wager confirmation;
- returning account state restored without chain selection;
- account/balance/following/preferences consistent across devices;
- advanced detail never required to perform the basic primary action;
- feed insertion must preserve reading position or offer controlled new-item loading rather than disruptive jumps;
- withdrawal/security changes receive stronger authentication than routine browsing.

## Sources

- https://fomo.family/blog/november-2025-recap
- https://fomo.family/blog/october-2025-recap/
- https://fomo.family/blog/january-2026-recap/
- https://fomo.family/blog/february-2026-recap/
- https://fomo.family/blog/announcing-fomo-web
- https://fomo.family/blog/tradingview-partnership/
- https://fomo.family/blog/learn/navigating-your-fomo-app
- https://fomo.family/blog/learn/leveraging-fomos-social-features
- https://fomo.family/blog/learn/fomo-security-wallet-architecture
