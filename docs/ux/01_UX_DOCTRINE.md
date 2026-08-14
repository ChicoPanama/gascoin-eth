# PROJECT GAS UX DOCTRINE

**Status:** Canonical UX principles  
**Scope:** Web + mobile web Phase 1

## 1. Product objective

The UX must make a sophisticated monetary protocol feel immediate without hiding material risk or accounting facts.

The user should experience GAS as:

- a live asset;
- a live network;
- a one-action game;
- a social identity;
- a transparent reserve-backed protocol.

The user should **not** experience GAS as a stack of contracts, dashboards, and technical terminology.

## 2. Reference synthesis

Project GAS takes interaction principles from successful products, then re-implements them in a GAS-native language.

### Existing GAS template

Keep:

- black / off-white visual foundation;
- compact mono labels and large display type;
- responsive shell;
- Privy/wallet wiring;
- animation primitives;
- community, referral, leaderboard, wallet, dashboard patterns;
- design-token architecture;
- Playwright/Vitest infrastructure.

Replace:

- old gas-refund hero;
- receipt submission as primary CTA;
- refund-specific nav and gates;
- explanatory marketing hierarchy.

### Fomo principle

**Social context is part of execution, not a separate community tab.**

Apply:

- feed as discovery surface;
- profiles tied to economic activity;
- leaderboards tied to real performance;
- quick actions embedded in content;
- one identity and one balance across surfaces;
- mobile-first navigation and onboarding;
- share cards and result objects that lead back to action.

Do not turn GAS into a token-scrolling trading terminal.

### ORE principle

**The protocol should visibly feel alive.**

Apply:

- live network state;
- obvious current round / event state;
- participant activity;
- simple language;
- large primary action;
- explicit rewards/state.

Do not copy ORE's literal board or mining metaphor.

### Stake Originals principle

**Remove every interaction that does not improve the decision or the result.**

Apply:

- tiny number of pre-round controls;
- visually understandable volatility selection;
- one large primary action;
- fast repeated play;
- desktop hotkeys;
- Instant Mode;
- autoplay only after core manual UX is proven and risk controls are defined;
- explicit provably-fair verification;
- result-state feedback.

Do not copy casino trade dress or generic slot-machine aesthetics.

## 3. The core GAS loop

```text
OPEN PLAY
   |
   v
SELECT CRUISE / BOOST / REDLINE
   |
   v
SET BET
   |
   v
IGNITION
   |
   v
RESULT ON GAS GAUGE
   |
   +------> VERIFY
   |
   +------> SHARE
   |
   +------> SAME BET / NEXT IGNITION
```

### Time budgets

- first-time comprehension target: <= 10 seconds to understand the primary action;
- returning user: one primary action to repeat an unchanged configuration;
- result animation target: satisfying but short;
- Instant Mode: minimal visual delay after settlement is available;
- wallet/transaction state should never be ambiguous.

## 4. Priority hierarchy

When UI goals conflict, resolve in this order:

1. correctness and truthful state;
2. solvency/risk clarity;
3. transaction safety;
4. mobile interaction speed;
5. comprehension;
6. accessibility;
7. social discovery;
8. delight/animation;
9. dense analytics.

## 5. Primary navigation

Phase 1 primary nav:

- **Home**
- **Play**
- **Trade**
- **Crews**
- **Reserve**
- **Wallet / Me**

Secondary:

- Provably Fair
- Docs
- Audits
- Contracts
- Governance
- Settings
- Responsible Play

The first screen must not force users through Docs or How It Works before they can understand the product.

## 6. Mobile doctrine

Mobile is the controlling constraint.

### Core Play viewport

On common iPhone/Android viewport sizes, the following should fit without scrolling whenever safe-area constraints permit:

- balance;
- GAS Gauge/result arena;
- CRUISE / BOOST / REDLINE selector;
- wager amount;
- quick amount controls;
- IGNITION;
- compact history tabs or drawer affordance.

### Bottom navigation

Default mobile pattern:

`HOME | PLAY | TRADE | CREWS | WALLET`

Reserve may live under Home or Wallet on smallest widths if required, but must remain one tap away from a clear trust indicator.

### Thumb zones

IGNITION belongs in the lower primary thumb zone. Secondary risk/detail actions must not compete visually with it.

## 7. Desktop doctrine

Desktop should not become a professional terminal by default.

Use additional space for:

- live activity tape;
- my bets / all bets / high rollers tabs;
- social context;
- reserve / rebase side information;
- optional detailed stats.

Keep the primary game interaction identical in hierarchy to mobile.

## 8. State truthfulness

Never fabricate:

- online players;
- wins;
- wagers;
- reserve assets;
- volume;
- rebase state;
- leaderboard rank;
- social activity.

If data is unavailable, show a real empty/loading/degraded state.

## 9. Monetary trust without friction

Every main surface should expose a small amount of monetary context:

- GAS price/reference;
- next rebase timer or state;
- reserve/backing health indicator;
- link to Reserve detail.

But the Play screen must not require interacting with these elements before playing.

## 10. Game trust

Every resolved wager must have:

- round ID;
- wager amount/asset;
- selected mode;
- outcome;
- payout;
- timestamp;
- verification entry point;
- transaction/settlement state where applicable.

Provably Fair opens as a secondary sheet/modal/detail page, not an intrusive step in every round.

## 11. Risk-mode communication

CRUISE / BOOST / REDLINE must communicate relative volatility through multiple redundant cues:

- label;
- position/order;
- gauge distribution preview;
- microcopy;
- optional payout-range preview;
- motion intensity;
- color emphasis that remains accessible without relying on color alone.

Never use language implying guaranteed profit or that a mode is "safer" in a financial sense. Prefer lower/higher variance and clear odds/payout disclosures.

## 12. Result design

Result hierarchy:

1. multiplier / win-loss state;
2. payout delta;
3. updated GAS balance;
4. repeat action;
5. share / verify / details.

Large wins may use enhanced motion/haptics where supported, but the interface must return to a ready state quickly.

## 13. Social loop

Desired viral loop:

`PLAY -> RESULT -> SHARE/FEED -> VIEWER TAPS TRY -> PRECONFIGURED PLAY -> RESULT`

A result object can carry:

- profile;
- mode;
- wager;
- payout/multiplier;
- time;
- reactions/comments;
- `TRY THIS MODE` deep link.

Do not default to exposing wallet addresses when a social identity is available.

## 14. Crews

Crews are competitive/social groups, not DAO governance surfaces.

Crew page should prioritize:

- members;
- 24h/7d participation;
- handle/activity where appropriate;
- biggest verified hit;
- rank;
- streaks;
- top members;
- join/share actions.

Crew metrics must clearly distinguish volume, net P/L, wins, and protocol rewards.

## 15. Performance requirements

The high-frequency game is unusable if the interface feels slow.

Targets to validate during implementation:

- no unnecessary full-page navigation in repeated play;
- optimistic UI only where settlement safety permits;
- preload critical Play assets;
- avoid heavy decorative bundles above the fold;
- animation must use compositor-friendly properties;
- respect `prefers-reduced-motion`;
- instrument interaction latency from IGNITION click to acknowledged pending state and from settlement receipt to rendered result.

## 16. Accessibility

Minimum requirements:

- keyboard navigation;
- Space hotkey only when it cannot conflict with focused controls/text inputs;
- visible focus states;
- sufficient contrast;
- non-color state cues;
- reduced-motion behavior;
- screen-reader labels for balance, mode, wager, result and verification;
- no auto-playing animation that blocks interaction;
- mobile touch targets sized appropriately.

## 17. Responsible-play UX

Because GAS includes games of chance, the design must include non-dark-pattern controls:

- clear wager amount;
- clear balance;
- session/wager history;
- optional user-configured limits when supported;
- loss/stop controls for any future autoplay;
- no misleading near-miss manipulation;
- no fake scarcity/countdowns;
- no hidden fee or RTP presentation.

Engagement should come from speed, social presence, competition, and product quality—not deceptive friction or coercive dark patterns.

## 18. Acceptance tests

The UX epic is not complete until Playwright/manual QA proves:

1. new connected user can identify the primary action immediately;
2. returning user can repeat a round in one primary action;
3. mobile core loop fits the target viewport;
4. pending/success/failure states are distinguishable;
5. mode changes update visible risk context;
6. result can be verified;
7. result can be shared/deep-linked;
8. reduced-motion mode remains fully usable;
9. keyboard workflow works on desktop;
10. reserve trust detail is accessible without obstructing play.
