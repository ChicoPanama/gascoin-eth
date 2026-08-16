# Phase 8 Gate — Desktop Adaptation

**Status:** ACTIVE / NOT PASSED  
**Predecessor:** Phase 7 — PASS / CLOSED

## Objective

Adapt the verified Project GAS mobile product to desktop without creating a second, terminal-first product model.

Desktop should use extra width to expose more simultaneous context while preserving the same identity, routes, financial semantics, action state machine and primary user decisions proven in Phase 7.

## Behavioral source of truth

Phase 7 mobile behavior remains canonical:

`SIGN IN -> TRUTHFUL ACCOUNT -> PLAY -> CRUISE/BOOST/REDLINE -> WAGER -> IGNITION -> CANONICAL ACTION STATE -> RESULT -> REPLAY`

Desktop may rearrange or expose supporting context around that loop. It may not alter the loop's economic meaning or create a different settlement model.

## Target desktop shell

Persistent product destinations:

`Home | Play | Trade | Crews | Reserve`

Utilities:

`Search | Notifications | Account`

The exact visual rail/header composition may evolve during Phase 8, but those information-architecture roles are fixed by Phase 6.

## Required adaptations

### Shell
- responsive desktop navigation using the same routes as mobile;
- no legacy GASCOIN nav on Project GAS routes;
- clear active state and keyboard-accessible navigation;
- desktop does not require chain/RPC knowledge for ordinary use.

### Home
- preserve one primary action hierarchy;
- use wider layout for monetary state, activity and social context without fabricating unavailable data;
- Reserve remains first-class and persistent on desktop.

### Play / GAS Original
- preserve CRUISE / BOOST / REDLINE, wager, IGNITION and one-action replay;
- keep GAS Gauge as the primary game-state focal point;
- use extra width for history/social/trust context rather than additional required steps;
- canonical ready/locking/locked/resolving/settled/recovery state remains identical to mobile.

### Trade / Account / Reserve / Crews
- adapt existing Phase 7 shells to desktop density and hierarchy;
- preserve truthful separation of spendable funds, locked wagers, future positions and protocol reserve state;
- no fake activity, liquidity, backing or rankings.

### Responsive system
- define intentional transformations for mobile, tablet and desktop rather than accidental CSS wrapping;
- no horizontal document overflow at approved desktop/tablet widths;
- primary actions remain visually dominant and reachable;
- desktop layout must not degrade mobile geometry already proven in Phase 7.

## Verification viewports

At minimum:

- 768×1024 tablet transition
- 1440×900 desktop
- 1920×1080 wide desktop

The existing 390×844 Phase 7 mobile gate remains a regression check.

## Exit requirements

Phase 8 passes only when all are true:

1. Project GAS desktop routes use one coherent shell and the Phase 6 IA.
2. Home, Play, Trade, Crews, Reserve and Account remain the same product/state model as mobile.
3. GAS Original desktop flow retains one-action configuration and one-action replay with no new mandatory step.
4. Extra desktop context does not obscure the primary action or invent live protocol facts.
5. Financial/account semantics are identical across mobile and desktop.
6. Responsive behavior is explicit at tablet/desktop breakpoints and does not introduce horizontal overflow.
7. Keyboard/focus and desktop pointer interactions are usable on critical controls.
8. Phase 7 390×844 mobile requirements remain green.
9. Production build, unit tests and Project GAS E2E remain green.
10. Desktop-specific Playwright assertions cover critical layout/state transformations at approved viewports.
11. Known limitations remain explicitly prototype/unavailable rather than silently mocked as live.

## Out of scope for Phase 8

Do not use desktop adaptation as an excuse to begin Phase 9 implementation. The following remain later work:

- real RNG/VRF;
- real bankroll settlement;
- live reserve/rebase adapters;
- production account/session permissions;
- live social graph/activity;
- final Bracket integration;
- protocol contract wiring.

**Do not activate Phase 9 before this file is updated to PASS.**
