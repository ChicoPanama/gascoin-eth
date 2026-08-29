# Phase 2 — Fomo Friction Signals

**Status:** Phase 2 weakness/failure hypothesis log  
**Rule:** This file separates verified product behavior from user-reported friction. Public reviews are **signals to investigate**, not proof of root cause.

## Evidence classes

- `official_constraint` — Fomo's own docs/terms acknowledge the condition.
- `product_iteration_signal` — Fomo shipped a redesign/feature change addressing a UX class.
- `store_review_signal` — individual public App Store/Play review; not independently verified.
- `capture_target` — issue must be tested/observed during ordinary manual use.

---

## F01 — Buy/sell execution delay

**Evidence:** `store_review_signal`

Google Play review dated 2026-04-28 reports a noticeable delay between initiating buy and actual transaction, significant enough that the reviewer believed price movement could affect results. Fomo's developer response asked whether buy/sell was taking too long to execute.

**Corroborating official constraint:** Fomo's own slippage material and Terms acknowledge network delay, congestion, fast markets and failed transactions as possible execution risks.

**Do not conclude:** that Fomo systematically executes slowly or that the review's causal diagnosis is correct.

**Manual capture target:** record user-initiated execution acknowledgement, pending state, confirmed state and portfolio update timing without automating a trade.

---

## F02 — Android Google sign-in failure

**Evidence:** `store_review_signal`

Google Play review dated 2026-06-23 reports Google account selection succeeding on iPhone but not continuing on Android. Developer replied that it would investigate.

**Do not conclude:** universal Android sign-in failure.

**Capture target:** if user has Android available, test only normal sign-in behavior; otherwise preserve as hypothesis.

---

## F03 — Deposit retry-loop / false rate-limit perception

**Evidence:** `store_review_signal`

Google Play review dated 2026-07-01 reports a `tried too many times / wait and try again` message on deposit even when the reviewer believed it was the first attempt that day.

**UX failure class:** retry/rate-limit errors that do not explain the authoritative state or next safe action.

**Capture target:** ordinary deposit flow, validation errors, retry state and support/recovery copy; do not complete unnecessary money movement solely for research.

---

## F04 — Withdrawal latency / trust anxiety

**Evidence:** `store_review_signal` + `official_constraint`

A July 2026 Google Play review reports that a withdrawal eventually arrived but took longer than expected, creating concern that funds might not arrive. Fomo's own withdrawal education says bank withdrawals can take time and advises contacting support if delayed.

**UX failure class:** money is pending but user lacks a sufficiently reassuring, authoritative state/ETA/recovery path.

**Capture target:** withdrawal screen before confirmation, stated ETA, pending-state language, progress/history and support escalation.

---

## F05 — Deposit/withdrawal clarity

**Evidence:** `store_review_signal`

An iOS reviewer who otherwise praised the product explicitly requested clearer/simpler deposit and withdrawal flows.

**Corroborating structure:** current Fomo docs have separate bank, crypto, debit and Apple Pay pathways with network correctness constraints on external crypto transfers.

**UX tension:** account abstraction works strongly inside the app but external money movement necessarily reintroduces rail/network choices.

**Capture target:** option hierarchy, terminology, warnings, destination confirmation and symmetry between entry/exit.

---

## F06 — Feed scanability under high activity

**Evidence:** `product_iteration_signal`

Fomo's February 2026 recap explicitly says the social Feed was substantially redesigned to make activity faster to parse and better organized during high-activity periods.

**Interpretation:** feed density/grammar is a real scaling problem even for a social-first product.

**Capture target:** live card density, event-type visual consistency, insertion behavior, pinned/system content and layout shift.

---

## F07 — Social signal can become copy pressure

**Evidence:** `official_documented`

Fomo's own navigation/social education repeatedly describes using top traders, follows and alerts to identify trades users may independently research/copy.

**UX risk:** profitability ranking + instant notifications + contextual execution can compress independent judgment.

**GAS later must improve:** social result/action loops should never auto-copy/auto-wager; canonical facts and user commentary should be visibly distinct.

---

## F08 — Risk context may be one level too deep for very fast execution

**Evidence:** `official_documented` + `capture_target`

Fomo provides liquidity, volume, holder and slippage-related information, often in token detail / About analysis. Meanwhile the core transaction UX promotes speed and slide-to-buy.

**Open question:** which risk signals are visible *before the final gesture* versus available only after navigating deeper?

**Capture target:** buy sheet and immediate pre-confirmation screen; list fee, liquidity, slippage, verified-token, price-impact and safety cues that are visible without leaving the action surface.

---

## F09 — Fee marketing vs contractual fee truth

**Evidence:** `official_constraint`

Marketing/release notes emphasize low fees. Current Terms specify a minimum 0.50% transaction service fee subject to a $0.95 minimum.

**UX question:** does the live action surface show the actual estimated fee in dollars and percentage before confirmation?

**Capture target:** exact fee representation and whether minimum fee effects are obvious on small orders.

---

## F10 — Home/discovery IA changes frequently

**Evidence:** `product_iteration_signal`

Published screenshots and release notes from different dates show changes in Home categories/filters. February 2026 specifically revised discovery filtering.

**Interpretation:** token discovery is an actively optimized surface; historical screenshot labels should not be treated as current truth.

**Capture target:** live current Home filters/order and whether the last-used filter persists.

---

## F11 — High release cadence suggests persistent reliability optimization

**Evidence:** `store_listing`

The iOS version history through mid-2026 contains many closely spaced releases described primarily as bug fixes, small fixes, performance improvements or similar maintenance.

**Do not conclude:** poor quality. Frequent releases can also indicate active maintenance.

**Phase 2 implication:** responsiveness/reliability is a first-class benchmark. Visual teardown alone is insufficient.

---

## F12 — Platform parity is not automatically perfect

**Evidence:** `store_review_signal` + `official_product_claim`

Fomo promises one account across devices, while the Android Google-login review shows that platform-specific identity regressions can still occur.

**Capture target:** compare the same ordinary state on web/iPhone (and Android if available): sign-in, profile, follow state, balances and search.

---

## F13 — Transaction-state truth under market failure

**Evidence:** `official_constraint`

Fomo Terms warn that volatility, low liquidity, protocol malfunction, oracle failure and congestion can cause slippage, failed transactions or inability to close positions.

**Phase 2 unknown:** how the interface distinguishes:
- intent accepted;
- wallet signed;
- submitted;
- pending;
- executed;
- failed;
- retry-safe;
- position updated.

This is one of the highest-value capture targets because users care first whether funds/position changed.

---

## F14 — Accessibility support remains an evidence gap

**Evidence:** `capture_target`

Public product material does not provide enough detail to evaluate:
- VoiceOver/TalkBack labels;
- dynamic type/text scaling;
- keyboard operation on web;
- non-color state semantics;
- motion reduction;
- touch-target consistency.

**Capture target:** normal accessibility inspection only where available; do not infer support from appearance.

---

## Public review sources

- Apple App Store: `https://apps.apple.com/us/app/fomo-never-miss-out/id6741115427`
- Google Play: `https://play.google.com/store/apps/details?id=family.fomo.app`

## Official corroborating sources

- `https://fomo.family/terms`
- `https://fomo.family/blog/february-2026-recap`
- `https://fomo.family/blog/learn/a-guide-to-deposits-and-withdrawals`
- `https://fomo.family/answers/what-is-slippage-in-crypto`
- `https://fomo.family/blog/learn/fomo-security-wallet-architecture`

## Phase 2 conclusion

Fomo's strongest public UX story is **speed + abstraction + social context**. Its most important Phase 2 weakness hypotheses are therefore the inverse failure modes:

- speed without clear execution state;
- abstraction breaking at deposit/withdraw/network boundaries;
- social density becoming difficult to parse;
- performance signals creating copy pressure;
- cross-platform regressions;
- low-fee simplicity not communicating the actual small-order cost clearly.

These hypotheses stay open until ordinary manual observation confirms or rejects them.
