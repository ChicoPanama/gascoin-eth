# Phase 3 — Current Reference Revalidation

**Date:** 2026-08-16  
**Status:** current first-party evidence pass complete for the core J01–J18 coverage map.

This file revalidates the existing Phase 3 pre-work after Phase 2 completion. It is deliberately organized by **GAS user problem**, not by brand popularity.

## 1. High-frequency game loop — Stake Originals

Current Stake Plinko/Limbo/Darts product/help material continues to validate:
- persistent wager/risk controls;
- few legible risk/difficulty choices;
- Hotkeys for rapid repetition;
- Instant Bet to bypass animation and reveal outcomes immediately;
- explicit Manual vs Auto modes;
- provably-fair result verification;
- Darts supports multiple concurrent bets and explicitly reduces waiting between bets.

### GAS use
J02/J03/J04.

### Keep
- result → replay compression;
- animation speed as a presentation preference, not game-state logic;
- desktop hotkey ergonomics;
- fairness one layer away;
- risk mode adjacent to wager/action.

### Do not blindly copy
- autoplay/repetition defaults;
- unrestricted concurrency;
- casino visual identity;
- persistence of financially dangerous values.

GAS keeps explicit session limits, bankroll solvency and safe-preference rules.

## 2. Social finance / verified identity — Fomo + Robinhood Social + OKX Orbit

### Robinhood Social — current 2026 evidence
Robinhood Social current official material validates:
- authentic/verified trader profiles;
- live verified trades;
- live performance context;
- profile statistics and trade history;
- follow/comment/like/discuss inside the financial app;
- **manual trade directly from the feed**;
- social coverage spanning stocks, options, crypto and prediction markets.

### OKX Orbit — current 2026 evidence
OKX Orbit current official material validates:
- native community inside the trading application;
- optional sharing of verified PnL, win rate and historical performance;
- referenced assets can be traded without leaving the platform;
- follow/discussion/recommended content;
- groups, gated communities and livestreams;
- web + app availability by the latest July-2026 FAQ.

### GAS use
J05/J06/J07/J16/J17.

### Law
Social financial content becomes materially stronger when **identity + verified economic evidence + discussion + optional action** share one canonical object model.

### GAS improvement
GAS result/trade objects separate:
- protocol-verified facts;
- derived performance;
- user commentary;
- explicit financial action.

No social object silently copies/wagers/trades for the user.

## 3. Discovery / conversion — Fomo + Pump + financial search patterns

Pump's current official platform material validates a broader consumer loop where trading, creator economics and community/live content are adjacent. Its current fee documentation also demonstrates why fee disclosure must be part of the decision boundary: fee rates vary by market state/pool and estimates may differ from final smart-contract charges.

Pump is useful primarily as a **discovery → intent → action compression** reference, not as a visual or economic model for GAS.

### GAS use
J08/J16 and social discovery.

### Law
Users should never need to leave the context that created intent in order to locate the action, but the action must still surface the financially material facts.

## 4. Prediction/event markets — Polymarket + Kalshi

### Polymarket current 2026 evidence
Official Help Center material validates:
- displayed price is translated to probability;
- prices derive from order-book bid/ask state;
- positions can be sold before resolution;
- market or limit exits are supported;
- limit orders may partially fill;
- available depth determines whether size can execute without material price impact;
- sports order handling includes explicit delay/cancellation behavior around game start.

### Kalshi current 2026 evidence
Official Help Center material validates:
- Quick Order as the simple immediate path;
- larger quick orders may span several prices and show average execution price;
- quick-sale flow shows contracts available, average price and estimated payout;
- portfolio value is distinct from cash balance;
- marked/current position value can differ from actual cash-out because of available liquidity;
- potential payout is a separate semantic value.

### GAS / Bracket use
J09/J15/J18.

### Law
Lead with human event/outcome meaning and simple execution; expose order-book depth progressively. Never equate marked value, available cash, expected payout and executable proceeds.

## 5. Account abstraction / bounded authorization — Base Account

Current Base Account documentation validates:
- app-specific Sub Accounts;
- Sub Accounts can avoid repeated passkey prompts/popups during ordinary app interaction;
- Spend Permissions define account, spender, token, allowance, period, start and end;
- after explicit permission, spend can occur without repeated user prompts within scope;
- Auto Spend Permissions can fund app Sub Accounts from the parent account;
- users can manage Sub Accounts;
- paymaster URLs support gas sponsorship;
- batching is available through wallet call primitives.

### GAS use
J01/J02/J08/J14.

### Law
Move repeated-signature friction to one understandable, bounded, revocable authorization boundary.

### Constraint
Base remains a reference architecture until chain selection is locked. GAS must preserve human-readable amount/scope/expiry and never silently broaden authorization.

## 6. High-speed trading / stale-action protection — Hyperliquid

Current Hyperliquid documentation provides two particularly useful patterns:
- users may choose `Don't show this again` on the order confirmation modal, reducing per-order confirmation friction after an explicit preference;
- actions not accepted within a short validity window can expire to prevent stale orders from executing after unstable connectivity; disabling that protection carries an explicit warning that multiple delayed attempts could later execute.

### GAS use
J02/J13/J14.

### Law
Fast execution is not only about removing prompts. It also needs **stale-intent protection** so connectivity problems cannot convert repeated retries into duplicate financial actions.

### GAS improvement
IGNITION/action intents get idempotent IDs + explicit expiry/nonce semantics + canonical reconciliation. A UI retry must never create an unintended second wager.

## 7. Failure/recovery — Uniswap

Current Uniswap support material validates several useful recovery laws:
- a failed interface action should tell the user what did **not** happen financially;
- some unfilled routes incur no network cost and can be safely resubmitted;
- cross-chain flows can retry from the failed step instead of restarting the entire journey;
- long-running cross-chain actions remain visible in an activity/status surface;
- transaction-expiry/slippage/network-cost problems are explained with a concrete corrective action.

### GAS use
J12/J13.

### Law
Recovery starts with canonical money state, then offers the smallest safe continuation/retry step.

## 8. Elastic-money explanation — Ampleforth

Current Ampleforth documentation continues to validate:
- rebase = global proportional quantity change;
- no per-wallet transfer is required;
- ownership percentage remains non-dilutive absent user buy/sell activity;
- cadence, deviation threshold and control-law detail can be explained separately from the user-level balance effect.

### GAS use
J10.

### GAS improvement
GAS must go beyond AMPL communication by adding:
- personal before/after balance;
- direction/magnitude;
- external reserve context;
- next rebase countdown/state;
- deeper control law behind one disclosure layer.

## 9. Reserve trust surface — Circle

Circle's current July-2026 transparency page validates:
- circulation and total reserves shown together;
- reserve composition broken down by asset class;
- 7/30/365-day issuance/redemption change;
- reserve assets described as separate from operating funds;
- recurring assurance/report context integrated into the transparency surface.

### GAS use
J11.

### GAS-specific additions
- self-issued GAS/wGAS excluded from external backing;
- monetary reserve separated from GameBankroll;
- future Bracket collateral separated;
- timestamps/valuation source/haircuts visible at deeper disclosure.

## 10. Pump / user-generated-content safety as a social-system warning

Pump's current moderation policy and history show that live/community financial content creates a separate safety/moderation scaling problem. That is relevant to GAS Crews/comments/feed design even though Pump is not the primary SocialFi benchmark.

### GAS use
J05/J07/social layer.

### Law
Social growth requires moderation/provenance controls as infrastructure, not a late cosmetic feature.

## Current J01–J18 coverage conclusion

The existing `REFERENCE_COVERAGE.json` remains directionally valid after revalidation. Two areas are strengthened:
- **J12/J13:** Hyperliquid stale-action expiry + Uniswap failed-step recovery now provide credible external reference behavior in addition to GAS-native integrity requirements.
- **J05/J06/J17:** Robinhood Social and current OKX Orbit independently reinforce the Fomo Phase 2 findings around verified economic activity, identity and action.

No canonical journey is uncovered.

## Source classes revalidated

Current first-party source families used in this pass:
- Stake casino/game guides;
- Robinhood Social product/news/support;
- OKX Orbit Learn/Help;
- Pump official docs/policies;
- Polymarket Help Center;
- Kalshi Help Center;
- Base Account documentation;
- Hyperliquid documentation;
- Uniswap Labs Support;
- Ampleforth documentation;
- Circle Transparency.

Exact competitor geometry/timing remains `unknown` unless directly measured. The Phase 3 gate is about credible journey benchmark coverage, not manufacturing pixel precision.
