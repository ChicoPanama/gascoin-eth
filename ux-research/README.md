# GAS UX Research Lab

This directory is the permanent evidence and benchmarking layer for Project GAS UX.

## Mission

Systematically study successful public interfaces across social trading, crypto, prediction markets, consumer finance, gaming and adjacent categories; extract the underlying UX patterns; map those patterns to GAS requirements; implement them in the existing GAS React system; and quantitatively verify that core GAS journeys meet or beat the strongest references.

This is not a visual-copy exercise. GAS keeps its own brand, React architecture, contracts, terminology and product logic. Reference products are treated as observable UX systems.

## Non-negotiable UX doctrine

1. Maximum sophistication underneath; minimum cognitive load above.
2. Every interaction must increase trust, excitement, understanding or progress toward the user's intended action.
3. Social is a layer across the product, not a disconnected community page.
4. Returning-user gameplay must be one action from the next eligible IGNITION after explicit session authorization.
5. Monetary complexity must increase trust without increasing interaction complexity.
6. Normal consumer flows must not expose RPCs, gas settings, contract addresses or chain switching.
7. All money-moving states must survive refresh, reconnect and device interruption.
8. GAS may borrow proven UX principles from anywhere, but the implementation and visual language remain GAS-native.

## Swarm / workstreams

- UX Architect: taxonomy, arbitration, GAS coherence.
- Browser Recon: route/state capture and public interaction observation.
- Geometry: dimensions, spacing, typography, density, breakpoints.
- Interaction: taps, states, timing, persistence, errors, keyboard/touch behavior.
- SocialFi: feed, identity, follows, profiles, leaderboards, social-to-action loops.
- Game UX: wager configuration, result presentation, replay, fairness, high-frequency ergonomics.
- Market/Conversion: discovery, quick buy/sell, funding, balances, portfolio and order-ticket UX.
- Monetary UX: rebase, reserve, backing, transparency and protocol-state communication.
- GAS Compatibility: map findings to current GAS features/contracts/components.
- Benchmark/QA: run standardized journeys and score GAS against reference bests.

## Evidence levels

- `observed`: directly visible in the public product.
- `documented`: supported by official product documentation.
- `measured`: collected by repeatable browser/Playwright instrumentation.
- `inferred`: analyst interpretation; must be clearly labeled.

## Research pipeline

`REFERENCE -> CAPTURE -> OBSERVATION -> PATTERN -> GAS MAPPING -> PROTOTYPE -> BENCHMARK -> REDESIGN/PASS`

No finding is considered actionable until it is linked to a GAS capability and a measurable acceptance criterion.

## Initial GAS capability map

- Identity: account, profile, follows, notifications, social graph.
- Home: GAS price, portfolio, social feed, live network activity, rebase countdown, reserve state.
- Play: CRUISE, BOOST, REDLINE, IGNITION, GAS Gauge, Instant Mode, history, provably fair, roulette.
- Social: result posts, reactions, comments, follows, crews, leaderboard, referrals.
- Trade: buy/sell GAS, USDC funding, unified balance.
- Monetary: rebase, reserve, backing, wGAS, protocol activity.
- Account: deposits, withdrawals, permissions, history, security.
- Future: Bracket market integration without breaking the GAS UX model.

## Standard viewports

- 390x844
- 430x932
- 768x1024
- 1440x900
- 1920x1080

## Core release principle

A smart-contract feature is not product-complete until its user journey is measured, recoverable, understandable and benchmarked.