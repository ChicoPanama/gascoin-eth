# GAS Canonical Journey Benchmarks

Every reference product and every GAS prototype is measured against the same goal-oriented journeys. A reference product may only set a benchmark for a journey it genuinely supports.

## J01 — New User to First Meaningful Action
Goal: understand the product, create/enter account, reach an actionable funded state.
Metrics: elapsed time, screens, required fields, authentication steps, wallet/network knowledge exposed, funding friction.

## J02 — Returning User to IGNITION
Goal: returning funded user opens GAS and starts the previously preferred eligible play configuration.
Target: <=2 intentional actions from app open; 0 chain/RPC interactions; 0 wallet prompts after valid bounded play authorization.

## J03 — Result to Replay
Goal: start another eligible GAS Original round after a settled result.
Target: 1 action; controls and safe preferences retained; no required scroll on primary mobile viewport.

## J04 — Configure Risk
Goal: move between CRUISE, BOOST and REDLINE and understand relative risk without reading documentation.
Target: 1 action to switch; wager retained unless policy requires otherwise; visual risk distinction understandable without color alone.

## J05 — Social Result to Same Game
Goal: user sees another player's result and intentionally enters the matching game configuration.
Target: <=2 actions before explicit wager confirmation; never auto-wager; mode/config visible before confirmation.

## J06 — Feed to Profile to Follow
Goal: inspect a player from social activity and follow them.
Target: <=3 actions; performance/context visible before follow; back navigation preserves feed position.

## J07 — Join Crew
Goal: discover, inspect and join an eligible Crew.
Metrics: action count, social proof, rules clarity, reversibility, identity continuity.

## J08 — Buy GAS
Goal: convert supported funding asset/fiat route into GAS.
Target: no manual contract address; no RPC configuration; network abstraction wherever architecture permits; amount/fees/minimum received clear before confirmation.

## J09 — Sell/Withdraw
Goal: leave a GAS position or move funds out.
Target: withdrawal/sale must be as understandable and discoverable as entry; fees, destination and settlement state visible; no intentional friction asymmetry.

## J10 — Understand Rebase
Goal: user sees an upcoming or completed rebase and can understand what changed.
Target: at-a-glance direction, magnitude, balance impact and reserve context; deeper mechanics <=1 disclosure layer away.

## J11 — Understand Reserve
Goal: answer: how backed is GAS, what counts as backing, and where can I verify it?
Target: simple reserve summary on Home; detailed assets/audit data one level deeper; no self-issued GAS/wGAS counted as external backing.

## J12 — Refresh Mid-Round
Goal: close/reload Play after a wager has been committed.
Target: exact wager/round state restored; no double-submit path; result/settlement reconciled from canonical state.

## J13 — Connectivity Failure
Goal: survive degraded network or temporary RPC/API failure.
Target: no raw technical error as primary message; user is told whether money moved, whether action is pending, and the one safe recovery action.

## J14 — Permission Expiry
Goal: continue safely when bounded session/play permission expires.
Target: explain scope and amount in human language; require one deliberate reauthorization; never silently broaden authorization.

## J15 — Portfolio / Unified Balance
Goal: understand total account value and expand into GAS/USDC/components.
Target: one prominent total; component balances one level deep; internal wallet/game/reserve implementation details hidden from normal consumer flow.

## J16 — Search / Discovery
Goal: find player, Crew, game, transaction and eventually Bracket market.
Target: one consistent search primitive; relevant actions available from results.

## J17 — Notification to Action
Goal: open a meaningful notification (result settled, followed player action, Crew event, rebase) and reach the relevant state.
Target: deep-link directly; no home-page detour.

## J18 — Future Bracket Event to Position
Goal: discover a Bracket event and understand/select an outcome position.
Metrics: probability/price clarity, event hierarchy, order/position steps, settlement language, social context.

# Scoring

Each journey is scored 0-100:
- Action efficiency: 25
- Perceived speed: 20
- Cognitive load: 15
- Mobile ergonomics: 15
- State clarity: 10
- Recovery/resilience: 10
- Accessibility: 5

Core GAS release target: >=90 on J02, J03, J04, J08, J10, J12 and J13 with no critical trust/recovery failure.

# Competitive rule

For each metric, record `reference_best`, `GAS_current`, `GAS_target`. If GAS is worse than the strongest credible reference and there is no protocol/security reason for the difference, the UX must be redesigned.