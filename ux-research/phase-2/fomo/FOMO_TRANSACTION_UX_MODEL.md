# Phase 2 — Fomo Transaction / Funding UX Model

**Status:** Evidence-backed Phase 2 model  
**Evidence:** Official Fomo security, onboarding, funding, trading and token-analysis documentation plus current Terms.  
**Exact live interaction timings:** pending manual capture.

## 1. The financial journey begins before the trade sheet

Fomo compresses three traditionally separate crypto jobs into one product:

`FUND -> DISCOVER -> EXECUTE`

Funding can be via:
- Apple Pay;
- debit card;
- crypto deposit.

Discovery can come from:
- Home/trending;
- Search;
- Feed;
- Friends/following;
- leaderboard/profile;
- token-specific social/timeline surfaces;
- notifications.

The economic action is adjacent to those discovery objects rather than requiring the user to leave for a wallet/DEX.

## 2. Unified USD balance is the execution substrate

Fomo documents a single USD balance used across supported chains. The user is not expected to bridge or manually choose a chain for ordinary execution.

This means transaction input is framed in familiar dollar terms even when the underlying asset lives on a different network.

## 3. Amount selection precedes execution

Published Fomo buy visuals and release notes show:
- a prominent dollar amount;
- output token quantity;
- dollar preset chips;
- available/on-chain balance near the trade sheet;
- fee context near execution;
- Buy/Sell mode at the top.

December 2025 added dollar preset buys specifically to make sizing faster.

### Phase 2 law
**Fast action is created by pre-compressing configuration, not by hiding the amount.**

## 4. Slide-to-buy is the final interaction boundary

Fomo's own security/product documentation consistently describes a `slide-to-buy` gesture.

This is important because the product simultaneously claims one-tap/instant simplicity while using a gesture that can function as a deliberate final commitment boundary.

Documented sequence:
1. user chooses token and amount;
2. user slides to buy;
3. wallet signs inside the underlying secure wallet architecture;
4. smart wallet executes on the relevant chain;
5. gas is sponsored;
6. position and PnL update in the portfolio.

### Phase 2 observation
The strongest idea is **one deliberate execution gesture**, not necessarily a literal tap.

## 5. Fomo increasingly moves financial context toward the decision boundary

Product evolution shows repeated additions near execution:
- on-chain balance directly in trade sheet (Dec 2025);
- low-fee banner on coin pages (Jan 2026);
- verified-token badge in the buy/sell header (Feb 2026);
- PnL directly on charts (Oct 2025);
- social buy/sell signals overlaid on charts (Apr 2026);
- liquidity, volume and holder data exposed on token pages;
- price-since-entry context in feed/notifications.

This is a durable pattern: **put the information needed to decide beside the decision, not in a separate education center.**

## 6. Liquidity/slippage risk is progressively inspectable

Fomo's education and answers repeatedly direct users to inspect:
- liquidity;
- volume;
- holder concentration/count;
- lock status;
- market cap;
- slippage/price impact.

Some of this appears under an `About` section rather than dominating the default buy sheet.

### UX interpretation
Fomo preserves a fast primary transaction path while placing deeper market-risk information nearby.

## 7. Current fee truth

Current Fomo Terms of Use state a minimum service fee of:
- **0.50% per transaction**;
- subject to a **$0.95 minimum fee per transaction**.

The terms also warn that market/network conditions can create:
- slippage;
- failed transactions;
- inability to close positions;
- network congestion effects.

### Phase 2 requirement
When benchmarking Fomo transaction UX, distinguish:
- marketing language (`low fees`, `instant`);
- contractual fee rules;
- live UI disclosure (capture pending);
- actual observed execution state (capture pending).

## 8. Apple Pay is both funding and direct-buy UX

Official Fomo material describes two related patterns:

### Fund account
`Deposit -> Apple Pay/debit -> dollar amount -> confirm -> USD balance`

### Buy asset using Apple Pay
On supported mobile flows, an asset's buy screen can expose Apple Pay directly, reducing the visible distinction between onboarding funding and asset purchase.

Current marketing visual hierarchy:
`Buy/Sell -> amount -> output -> presets -> payment rail/fee -> Buy with Apple Pay`.

## 9. Debit-card funding

Official deposit guide describes:
- Deposit;
- Debit Card;
- dollar amount;
- card details;
- confirm.

The product's stated objective is to make this resemble ordinary online checkout rather than a crypto-specific transfer workflow.

## 10. Crypto deposits still expose network correctness

For users transferring existing crypto, Fomo cannot abstract every underlying network constraint away. Documentation warns users to use the correct supported network/address.

### Important UX tension
Fomo is strongest when it can abstract infrastructure, but external transfers reintroduce chain/network consequences.

This is a high-value manual-capture target: how does the live product explain a technical network requirement without breaking its consumer mental model?

## 11. Withdrawal paths

Official Fomo guides document:

### Bank withdrawal
`Withdraw -> destination account -> amount -> confirm`

Bank availability varies by region.

### Crypto withdrawal
`Withdraw -> Crypto -> wallet address -> network correctness -> amount -> confirm`

Security documentation indicates sensitive actions such as withdrawals receive stronger authentication/biometric protection on supported Apple devices.

### Product-law candidate
Entry and exit are both designed as normal account functions. Phase 2 should measure whether the live interface actually makes withdrawal as discoverable as funding.

## 12. Portfolio update closes the transaction loop

Fomo's documented trade flow ends with the user's position and PnL updating in real time in the portfolio.

The user therefore receives post-action confirmation as a **financial-state update**, not only a generic success toast.

This closes:
`INTENT -> EXECUTION -> POSITION STATE`.

## 13. Repeat-action compression

December 2025 added:
- preset dollar amounts;
- `Buy Again` after a closed position.

This demonstrates explicit product investment in reducing repeat-action cost after the first transaction.

## 14. Advanced execution remains contextual

Fomo web later added professional TradingView charting and perpetual advanced controls while still describing the overall web experience as mobile-simple rather than terminal-first.

The execution philosophy is therefore:
**simple default, advanced context when the object/user requires it.**

## 15. Open direct-capture questions

### Buy
- exact screens from Feed/token/profile -> Buy;
- amount field default behavior;
- preset values live today;
- `slide-to-buy` target geometry and gesture distance;
- fee displayed before gesture;
- slippage/price impact displayed before gesture;
- min received / quote expiry if present;
- acknowledgement immediately after gesture;
- pending vs complete state;
- result/portfolio update latency;
- failure/retry state;
- whether repeated buy keeps amount/preset context.

### Sell
- Sell discovery parity with Buy;
- percent/preset options;
- cash-output preview;
- fee/slippage display;
- final gesture/confirmation;
- position-close state;
- `Buy Again` placement.

### Funding
- Deposit CTA placement;
- Apple Pay/debit/crypto option hierarchy;
- number of steps;
- fee disclosure;
- pending deposit state;
- retry/recovery copy.

### Withdrawal
- discoverability vs Deposit;
- bank/crypto option hierarchy;
- destination verification;
- network warning presentation;
- biometric/step-up timing;
- fee/ETA disclosure;
- pending state;
- delayed withdrawal recovery/support path.

## Sources

- https://fomo.family/blog/learn/fomo-security-wallet-architecture
- https://fomo.family/blog/learn/a-guide-to-deposits-and-withdrawals
- https://fomo.family/blog/learn/how-to-buy-meme-coins
- https://fomo.family/answers/fastest-way-to-buy-altcoins-memecoins/
- https://fomo.family/answers/what-is-slippage-in-crypto
- https://fomo.family/answers/how-to-read-token-stats
- https://fomo.family/blog/learn/decoding-token-stats/
- https://fomo.family/blog/december-2025-recap
- https://fomo.family/blog/january-2026-recap/
- https://fomo.family/blog/february-2026-recap
- https://fomo.family/blog/tradingview-partnership/
- https://fomo.family/terms

## Phase 2 conclusion

Fomo's transaction UX is built around a compact principle:

**put familiar amount/balance context near discovery, make the final execution gesture explicit, absorb blockchain prerequisites underneath, and close the loop with immediate portfolio/position state.**

The remaining Phase 2 work is to measure how well the live product actually executes that model under normal, pending and failure conditions.
