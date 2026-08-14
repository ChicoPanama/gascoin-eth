# Phase 3 — Cross-Category Findings

**Status:** synthesis of specialized teardown lanes for Phase 3 coverage.

The purpose of this phase is not to crown one product. It is to identify which product currently solves each GAS UX problem best, record the underlying law, and identify where GAS must establish a new benchmark.

---

## Lane A — High-frequency game UX

### Stake Originals

Strongest documented primitives:
- Instant Bet / animation bypass for expert repetition;
- hotkeys for rapid consecutive action;
- persistent bet controls;
- few high-salience risk parameters;
- manual and auto modes separated;
- provably-fair verification accessible without dominating the main action;
- newer fast-game flows explicitly reduce waiting between wagers.

### GAS translation

- Cinematic and Instant presentation modes share the same canonical game state.
- `Space` may map to IGNITION on desktop after explicit eligibility checks.
- Result → next eligible IGNITION remains one intentional action.
- CRUISE / BOOST / REDLINE are the only primary risk choices; probability detail is progressive.
- Safe preferences can persist; dangerous one-time states such as MAX must not silently persist.
- Fairness proof is one disclosure layer away.
- Automated/repeated play, if ever offered, must include explicit user-control limits and cannot become a dark-pattern default.

### Where GAS should beat the reference

Stake solves repetition but not GAS's SocialFi/monetary context. GAS must combine high-frequency ergonomics with canonical social result objects, explicit account permissions and protocol state without increasing the Play surface's cognitive load.

---

## Lane B — Prediction / market execution

### Polymarket

Strongest documented primitives:
- prices are communicated as probabilities;
- users can buy/sell before resolution;
- simple market comprehension is separated from deeper order-book mechanics;
- limit orders and partial fills are available for advanced users;
- liquidity/depth matters for large execution and is disclosed as a real market constraint.

### Kalshi

Strongest documented primitives:
- cash balance is distinct from fluctuating position value;
- marked value is not represented as guaranteed executable cash-out;
- quick-order sale exposes available contracts, average price and estimated payout before submission.

### GAS / Bracket translation

- Future Bracket event cards should lead with the human event and probability/payout meaning, not order-book plumbing.
- Quick execution should be the default path; CLOB/limit-order depth is progressive.
- Cash, GAS, marked positions, potential payout and actual executable proceeds remain distinct.
- Exiting a position must be as discoverable as entering it.

---

## Lane C — Social finance / verified identity

### Fomo

Primary application-shell/social benchmark from Phase 2:
- consumer account;
- unified balance;
- feed/global/following;
- profiles and leaderboards;
- cross-device continuity;
- actionable social content;
- simple desktop adaptation.

### Robinhood Social

Independent validation:
- live verified trades;
- authentic/KYC-backed profiles;
- performance context;
- follow/discuss/trade inside the financial product;
- economic activity can be acted on directly from the feed.

### OKX Orbit

Independent validation:
- social network natively embedded in trading app;
- optional sharing of verified PnL, win rate and historical performance;
- referenced assets can be traded from the social context;
- groups, live streams and gated communities provide community/creator layers.

### GAS translation

- A canonical GAS activity ID is a stronger trust primitive than screenshots.
- User-authored text must be visibly distinct from verified round/trade facts.
- One social graph spans Play, Trade, Crews and later Bracket.
- Player/Crew performance should derive from on-protocol data where possible.
- Social-to-action always retains explicit user confirmation.

---

## Lane D — Consumer account / transaction abstraction

### Base Account / Coinbase account primitives

Current official capabilities useful as architecture references:
- app-specific Sub Accounts;
- repeated interactions without repeated passkey popups when the appropriate subaccount/permission model is used;
- bounded Spend Permissions with allowance, period and validity fields;
- user revocation;
- automatic/permission-based funding from a parent account;
- batch transactions;
- paymaster/gas sponsorship;
- passkey/WebAuthn account ownership and cross-device recovery options.

### GAS translation

- Normal game play should not show wallet prompts after an explicit bounded authorization has been granted and remains valid.
- Permission UI must state token, amount/scope and expiry in human language.
- Users can inspect/revoke permissions.
- GAS may adopt equivalent primitives on the chosen EVM stack, but Phase 3 does not lock Base as the chain.
- App/account abstraction must preserve self-custody and canonical accounting rather than hiding financial facts.

---

## Lane E — Elastic-money communication

### Ampleforth

Useful communication laws:
- explain rebasing as quantity changes in the wallet rather than an ordinary transfer;
- make proportional/non-dilutive ownership understandable;
- communicate cadence, target/deviation behavior and policy mechanics separately from the simple user-level explanation.

### GAS improvement

AMPL is a monetary-mechanism reference, not the target UX. GAS should show:
- next rebase;
- direction/magnitude;
- personal balance before/after;
- external reserve context;
- deeper control-law details one layer down.

This is a GAS-specific benchmark opportunity.

---

## Lane F — Reserve / transparency UX

### Circle Transparency

Strong trust-surface primitives:
- circulation and total reserves shown together;
- reserve composition broken down by asset type;
- issuance/redemption change visible;
- assurance/report history linked into the trust surface;
- reserve assets separated from operating funds in the product's trust narrative.

### GAS translation

GAS Reserve needs an at-a-glance summary plus one-level-deeper composition/verification. It must additionally explain GAS-specific constraints:
- GAS/wGAS do not count as external backing;
- game bankroll is not monetary reserve;
- future Bracket collateral is separate;
- POL self-issued side does not become fake reserve backing.

---

## Lane G — Resilience and canonical financial state

No reference product should be treated as authoritative enough to lower the GAS bar for:
- refresh mid-round;
- double-submit prevention;
- delayed RNG/settlement;
- connectivity/RPC failures;
- pending/confirmed/settled reconciliation.

These are system-integrity journeys. GAS establishes its own benchmark:
1. canonical money/round state survives UI interruption;
2. user can always tell whether money moved;
3. retry never silently duplicates a financial action;
4. raw infrastructure errors are secondary technical detail;
5. one safe recovery action is available whenever recovery is user-actionable.

---

## Cross-category UX laws entering Phase 4

1. **Infrastructure disappears; financial meaning does not.**
2. **Primary action is immediate; advanced depth is progressive.**
3. **Repeat action preserves safe context.**
4. **Economic social objects must be verified and actionable.**
5. **One identity/social graph should survive product expansion.**
6. **Cash, assets, locked amounts, marked value and potential payout are distinct semantics.**
7. **Permissions are bounded, human-readable and revocable.**
8. **Fast UX requires immediate acknowledgement even when canonical settlement remains pending.**
9. **Reserve trust requires composition + verification, not a single marketing number.**
10. **Unique GAS mechanics (rebase, socially replayable game result, interruption recovery) should establish new benchmarks instead of forcing a competitor analogy.**

## Current reference sources

- Stake Originals product/help pages for Plinko, Limbo and Darts.
- Fomo official product/release/help material captured in Phase 2.
- Robinhood Social official newsroom/product material.
- OKX Orbit official product/help material.
- Base Account official documentation for Sub Accounts, Spend Permissions and paymasters.
- Polymarket official Help Center for price/probability, limit orders, liquidity and early exits.
- Kalshi official help for portfolio and Quick Order Sale.
- Ampleforth official documentation.
- Circle official Transparency & Stability page.

Reference discovery remains open-ended after Phase 3: stronger evidence may replace a reference-best during Phase 4/10 without changing the roadmap.
