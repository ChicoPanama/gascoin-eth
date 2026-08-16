# Phase 8 Gate — Desktop Adaptation

**Status:** ACTIVE / NOT PASSED  
**Predecessor:** Phase 7 — PASS / CLOSED

## Objective

Adapt the verified Project GAS mobile product to desktop without creating a second, terminal-first product model.

Desktop should use extra width to expose more simultaneous context while preserving the same identity, routes, financial semantics, action state machine and primary user decisions proven in Phase 7.

## Mandatory implementation context

Before continuing substantial Phase 8 UX, frontend, state-model, wallet/account or backend-integration work, read:

- `ux-research/CODEX_RESEARCH_FRONTEND_BACKEND_INTEGRATION_ADDENDUM.md`;
- `ux-research/phase-1/REPO_INVENTORY.md`;
- `ux-research/phase-1/COMPATIBILITY_MATRIX.json`;
- `ux-research/phase-1/PR66_RECONCILIATION.md`;
- the required Phase 2 Fomo corpus listed in the Codex addendum;
- `ux-research/phase-3/CROSS_CATEGORY_FINDINGS.md`;
- `ux-research/phase-3/PHASE_3_REVALIDATION_2026-08-16.md`;
- `ux-research/reference-matrix/REFERENCE_MATRIX.md`;
- `ux-research/phase-5/GAS_PATTERN_LIBRARY.md`;
- `ux-research/phase-6/GAS_INFORMATION_ARCHITECTURE.md`.

Before building a meaningful research-derived behavior, internally map:

```text
USER PROBLEM
-> REFERENCE LAW
-> GAS PATTERN
-> EXISTING REPO SURFACE
-> IMPLEMENTATION
-> ACCEPTANCE TEST
```

Do not create a new roadmap document for this mapping. `ux-research/ROADMAP.md` remains the sole numbered roadmap.

## Behavioral source of truth

Phase 7 mobile behavior remains canonical:

`SIGN IN -> TRUTHFUL ACCOUNT -> PLAY -> CRUISE/BOOST/REDLINE -> WAGER -> IGNITION -> CANONICAL ACTION STATE -> RESULT -> REPLAY`

Desktop may rearrange or expose supporting context around that loop. It may not alter the loop's economic meaning or create a different settlement model.

The cross-device invariant is:

> Identity, relationships, economic objects and account state remain canonical even when presentation changes.

## Target desktop shell

Persistent product destinations:

`Home | Play | Trade | Crews | Reserve`

Utilities:

`Search | Notifications | Account`

The exact visual rail/header composition may evolve during Phase 8, but those information-architecture roles are fixed by Phase 6.

Desktop is not a separate application. Bigger screen means more simultaneous context, not more required actions.

## Required adaptations

### Shell
- responsive desktop navigation using the same routes as mobile;
- no legacy GASCOIN nav on Project GAS routes;
- clear active state and keyboard-accessible navigation;
- desktop does not require chain/RPC knowledge for ordinary use;
- account/identity semantics remain canonical across mobile and desktop;
- wallet addresses remain linked financial credentials rather than the primary social identity.

### Home
- preserve one primary action hierarchy;
- use wider layout for monetary state, activity and social context without fabricating unavailable data;
- Reserve remains first-class and persistent on desktop;
- reserve/rebase values must preserve source authority and freshness semantics rather than being invented in components.

### Play / GAS Original
- preserve CRUISE / BOOST / REDLINE, wager, IGNITION and one-action replay;
- keep GAS Gauge as the primary game-state focal point;
- keep the primary desktop hierarchy `GAS GAUGE -> RISK -> WAGER -> IGNITION`;
- use extra width for history/social/trust/fairness/advanced context rather than additional required steps;
- canonical ready/locking/locked/resolving/settled/recovery state remains identical to mobile;
- presentation modes such as Instant or Reduced Motion may change presentation latency only, never probability/economics/settlement;
- do not invent cryptographic proof during the prototype phase;
- preserve controller/adapter separation so Phase 9+ can replace prototype data without rebinding the view directly to a contract function.

### Trade / Account / Reserve / Crews
- adapt existing Phase 7 shells to desktop density and hierarchy;
- preserve truthful separation of spendable funds, locked wagers, marked positions, potential payouts, protocol reserve and GameBankroll;
- no fake activity, liquidity, backing or rankings;
- advanced execution/data may expand through progressive disclosure but may not dominate the default consumer action;
- social/account surfaces must preserve a single canonical relationship/activity ontology rather than creating Play/Trade/Crew-specific identities or duplicate economic events.

### Frontend/backend authority
- React components remain presentation, not the authoritative financial system;
- preserve the architecture `presentation -> feature controller/query layer -> domain adapter -> authoritative sources`;
- React Query remains the client/server-state boundary where appropriate;
- important data must preserve authority/provenance class: canonical, backend/indexer-derived, user-authored or presentation/prototype;
- optimistic UI may acknowledge action receipt but must not claim financial settlement before settlement is canonical;
- if finality is uncertain, reconcile before retry; do not blind-submit a second money action.

### Existing-repo compatibility
- use the Phase 1 compatibility matrix before rebuilding or deleting an existing surface;
- retain/evaluate reusable auth, health, `/me`, public-data, RPC, API versioning, webhook, observability, rate-limit, audit-log, cache, Supabase/storage and test infrastructure;
- isolate/retire refund-specific claims/receipt/refund/gates/standing semantics only after generic utilities are extracted or proven unused;
- do not perform a wholesale CSS/framework rewrite for cleanliness or competitor parity.

### Responsive system
- define intentional transformations for mobile, tablet and desktop rather than accidental CSS wrapping;
- no horizontal document overflow at approved desktop/tablet widths;
- primary actions remain visually dominant and reachable;
- desktop layout must not degrade mobile geometry already proven in Phase 7;
- extra context surrounds the primary action instead of displacing it.

## Verification viewports

At minimum:

- 768×1024 tablet transition
- 1440×900 desktop
- 1920×1080 wide desktop

The existing 390×844 Phase 7 mobile gate remains a regression check.

## Required research-integration review before PASS

Before Phase 8 closes, explicitly review the implementation against:

- `ux-research/phase-2/fomo/FOMO_DESKTOP_MOBILE_PARITY.md`;
- `ux-research/phase-2/fomo/FOMO_TO_GAS_MAP.md`;
- `ux-research/phase-3/CROSS_CATEGORY_FINDINGS.md`;
- `ux-research/phase-3/PHASE_3_REVALIDATION_2026-08-16.md`;
- `ux-research/reference-matrix/REFERENCE_MATRIX.md`;
- `ux-research/phase-5/GAS_PATTERN_LIBRARY.md`;
- `ux-research/phase-1/COMPATIBILITY_MATRIX.json`;
- `ux-research/phase-6/GAS_INFORMATION_ARCHITECTURE.md`.

The review must confirm:

- desktop preserved mobile ontology;
- social/account state remains canonical;
- Play primary action remains dominant;
- advanced depth remains progressive;
- no fake activity exists;
- financial semantics and provenance remain truthful;
- backend/frontend authorities are clear;
- no legacy refund ontology re-entered.

Only then may the Phase 8 gate pass.

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
12. The required research-integration review above is completed and its findings are reflected in implementation/tests, not merely acknowledged in prose.
13. Major research-derived behaviors can be traced through `problem -> reference law -> GAS pattern -> repo surface -> implementation -> acceptance test`.
14. React views do not become the source of authoritative financial settlement/state where a controller/query/adapter boundary is required.
15. No duplicate social graph or duplicate per-feed economic-event truth is introduced by desktop adaptation.
16. No mature generic GASCOIN infrastructure is replaced solely because the old product domain is being retired.

## Out of scope for Phase 8

Do not use desktop adaptation as an excuse to begin Phase 9 implementation. The following remain later work:

- real RNG/VRF;
- real bankroll settlement;
- live reserve/rebase adapters;
- production account/session permissions, except narrowly scoped wallet cleanup specifically required to preserve the Phase 8 account model;
- live social graph/activity;
- final Bracket integration;
- protocol contract wiring.

Research may define the future adapter/state boundaries for these systems. Production wiring remains gated to its owning phase.

**Do not activate Phase 9 before this file is updated to PASS.**
