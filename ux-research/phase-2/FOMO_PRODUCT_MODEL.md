# Phase 2 — Fomo Product Model

**Phase:** 2 — Fomo molecular teardown
**Evidence state:** DOCUMENTED / observed-public-product model; geometry/timing measurements remain separate

## Why Fomo is the deepest single-product benchmark

Fomo is not the GAS visual template. It is the strongest current reference for combining a consumer-simple financial account with an integrated social graph, activity discovery, verified performance context, rapid financial action, and cross-device continuity.

The useful object is the **system of journeys**, not the color palette or proprietary implementation.

## Documented product loop

```text
ACCOUNT
  -> FUND
  -> DISCOVER
  -> SOCIAL CONTEXT
  -> ASSET / POSITION CONTEXT
  -> ACTION
  -> LIVE POSITION STATE
  -> SHARE / FEED
  -> FOLLOW / NOTIFICATION
  -> RE-ENTRY
```

Fomo's own product material documents:
- email/Apple-ID account onboarding;
- embedded/smart-wallet architecture;
- gas sponsorship;
- unified USD balance across supported chains;
- no normal chain switching/bridging requirement;
- social feed and Following/Friends feed;
- profiles with portfolio/history/performance context;
- leaderboards across timeframes;
- trade theses attached to activity;
- PnL/balance context surfaced with social content;
- notifications when followed traders act;
- quick buys and one-click action language;
- mobile/web continuity for account, balance, positions, following and notification settings;
- social features reused when new financial products such as perpetuals are introduced;
- advanced charting layered in without replacing the simple social/execution shell.

## Product laws extracted for GAS

### FOMO-L01 — One account, infrastructure hidden
The normal user mental model is an application account, not a collection of wallets/chains.

**GAS translation:** one GAS account shell; GAS/USDC/wGAS and later Bracket positions may be expanded underneath, but RPCs, chain switches, native gas-token prerequisites and contract addresses do not enter normal flows.

### FOMO-L02 — Social object is actionable
Social content is adjacent to the financial object/action it describes.

**GAS translation:** verified result/activity cards deep-link into the matching GAS context. A game result may preconfigure CRUISE/BOOST/REDLINE and wager context, but must never auto-submit a wager.

### FOMO-L03 — Performance context is part of identity
Profiles are useful because they contain activity/performance context, not merely bios.

**GAS translation:** player profiles should distinguish verified on-protocol results/activity from user-authored text and expose meaningful history without glorifying loss-chasing behavior.

### FOMO-L04 — Feed is a discovery engine, not a forum
The feed exists to surface useful economic/social signals and drive relevant action.

**GAS translation:** Global and Following views should prioritize canonical GAS activity/result/crew/rebase objects, not generic social posting as the default product.

### FOMO-L05 — Desktop preserves mobile simplicity
Fomo explicitly says its web product is not intended to become a professional terminal; it carries mobile journeys into a larger canvas.

**GAS translation:** desktop may add simultaneous context panes, but the same primary actions and concepts must remain consistent with mobile. Do not create a desktop-only DeFi dashboard mental model.

### FOMO-L06 — Advanced tools are progressively disclosed
Professional charting was added inside the existing product rather than forcing every user into an advanced-trading surface.

**GAS translation:** protocol math, reserve composition, provably-fair proofs, advanced trade controls and later Bracket order depth live behind progressive disclosure.

### FOMO-L07 — Cross-device continuity is product state
Identity, balance, positions, following and settings travel between web/mobile.

**GAS translation:** game preference, account state, follow graph, Crews, notifications and canonical pending/settled financial states must reconcile across devices. Dangerous financial actions are never silently resumed without canonical-state checks.

### FOMO-L08 — High-activity feed must remain scannable
Fomo's February 2026 feed redesign explicitly targeted faster parsing during high-activity periods.

**GAS translation:** GAS activity density requires hierarchy, event-type grammar and selective animation. New events should not cause layout thrash or make important financial states disappear.

### FOMO-L09 — Social features survive product expansion
Fomo reused feed, leaderboard, thesis, profiles and notifications for perpetuals.

**GAS translation:** social identity should attach to generic canonical GAS activity objects so the same graph can later support roulette, new games, GAS trading and Bracket without rebuilding social from scratch.

### FOMO-L10 — Trust context travels with action
Fomo surfaces balance/PnL/history and token verification/safety context near decisions.

**GAS translation:** odds/RTP/fairness, settlement status, reserve state and verified-activity provenance should be accessible at decision time without cluttering the primary action.

## Fomo → GAS object mapping

| Fomo object | GAS-native equivalent | Notes |
|---|---|---|
| unified USD balance | GAS account portfolio | Keep spendable cash distinct from marked/locked positions internally and in expandable detail |
| token | GAS / game configuration / later Bracket market | Depends on context |
| trade activity | verified GAS activity event | Canonical event ID |
| trader profile | GAS player/profile | Handle first; wallet advanced |
| friends/following feed | Following feed | GAS activity objects |
| global feed | Global live network feed | Ranked/scannable, not raw firehose |
| leaderboard | player/Crew rankings | Metrics determined after benchmark |
| trade thesis | result/activity context | Optional user-authored explanation attached to canonical event |
| quick buy | contextual GAS action | Buy GAS / try configuration with explicit confirmation |
| position sheet | game/trade/result context sheet | Progressive detail |
| alerts | deep-linked GAS notifications | Settlement, followed activity, Crew, rebase, etc. |

## Fomo-specific journeys to capture/benchmark

1. New user -> account created.
2. Existing user -> signed-in home.
3. Home/discovery -> asset detail.
4. Feed -> asset/action.
5. Feed -> profile -> follow.
6. Leaderboard -> profile.
7. Profile -> activity/position context.
8. Search -> token.
9. Search -> user.
10. Token -> quick buy.
11. Position -> sell/exit.
12. Notification -> exact underlying context.
13. Mobile -> desktop continuity.
14. Global feed -> Following feed.
15. High-activity feed scan behavior.
16. Advanced chart disclosure -> return to simple action.
17. Funding -> spendable balance.
18. Withdrawal/security confirmation.

## Measurement separation

Each Fomo claim must carry one evidence state:
- `documented`: official Fomo material;
- `observed`: directly visible public product state;
- `measured`: produced by repeatable browser/harvester instrumentation;
- `inferred`: analyst interpretation.

No geometry/timing figure is allowed into the GAS benchmark as `measured` until captured by instrumentation.

## Official sources used for this documented model

- https://fomo.family/blog/announcing-fomo-web
- https://fomo.family/blog/february-2026-recap
- https://fomo.family/blog/learn/navigating-your-fomo-app
- https://fomo.family/blog/learn/leveraging-fomos-social-features
- https://fomo.family/blog/learn/fomo-security-wallet-architecture
- https://fomo.family/blog/perpetuals-now-on-fomo
- https://fomo.family/blog/tradingview-partnership/
- https://fomo.family/blog/september-2025-recap
- https://fomo.family/blog/october-2025-recap/
- https://fomo.family/blog/november-2025-recap

## Phase 2 remaining gate work

The documented architecture is now defined. Phase 2 remains OPEN until the molecular corpus adds enough directly observed/measured data to support:
- mobile navigation geometry and thumb-zone behavior;
- desktop shell geometry;
- feed row/card density;
- profile hierarchy;
- leaderboard hierarchy;
- quick-action placement;
- input/control dimensions;
- modal/sheet behavior;
- state transitions;
- perceived acknowledgement timing where observable;
- back/scroll preservation;
- loading/error behavior;
- responsive transformations.

The output must then be normalized into `FOMO_JOURNEY_MATRIX.json` and GAS acceptance targets before Phase 2 can pass.
