# Phase 8 — Research Integration Review

**Scope:** Desktop adaptation implementation on `ux-lab`  
**Status:** IMPLEMENTATION REVIEW COMPLETE — CI gate remains authoritative for final Phase 8 closure

This review verifies that Phase 8 translates the completed research into GAS-owned responsive behavior without creating a second product model or advancing Phase 9 live-protocol wiring.

## Reviewed research and architecture

- `ux-research/phase-2/fomo/FOMO_DESKTOP_MOBILE_PARITY.md`
- `ux-research/phase-2/fomo/FOMO_TO_GAS_MAP.md`
- `ux-research/phase-3/CROSS_CATEGORY_FINDINGS.md`
- `ux-research/phase-3/PHASE_3_REVALIDATION_2026-08-16.md`
- `ux-research/phase-4/REFERENCE_MATRIX.json`
- `ux-research/phase-5/PATTERN_LIBRARY.md`
- `ux-research/phase-1/COMPATIBILITY_MATRIX.json`
- `ux-research/phase-6/INFORMATION_ARCHITECTURE.md`
- `ux-research/CODEX_RESEARCH_FRONTEND_BACKEND_INTEGRATION_ADDENDUM.md`

## Traceability review

| User problem | Reference law | GAS pattern / rule | Existing repo surface | Phase 8 implementation | Acceptance evidence |
|---|---|---|---|---|---|
| Desktop must not become a second product | RM17 CrossDeviceCanonicalState; Fomo mobile↔desktop parity | Phase 6 responsive model; one canonical account/state model | `GasPrototypeShell`, `GasMobileNav` | Added `GasDesktopNav` + `GasResponsiveShell.module.css`; mobile retains bottom nav while desktop exposes the same destinations as a rail | `GAS04`, `GAS05`, `GAS07`, `GAS09` |
| Desktop navigation should spend pixels on context, not new ontology | Fomo parity law: preserve destination meaning while changing spatial organization | Phase 6 Desktop IA | Existing Project GAS routes | Desktop primary rail is `Home / Play / Trade / Crews / Reserve`; `Search / Notifications / Account` remain utilities | `GAS05`, `GAS07`, `GAS09` |
| High-frequency Play must remain immediate | RM03 OneActionReplay, RM04 DualSpeedPresentation, RM05 FewLegibleRiskChoices | GP06 RiskModeSelector, GP07 WagerComposer, GP08 IgnitionControl, GP09 CanonicalActionState, GP10 DualSpeedPresentation, GP11 ResultActionRail | `GasOriginalPrototype`, `useGasOriginalPrototype`, `GasGauge`, `RiskSelector`, `WagerComposer` | Desktop keeps the same center game controller/state and adds optional side context only at sufficient width; no new confirmation step added | `GAS08` plus mobile `GAS10`–`GAS17` regression suite |
| Extra desktop information must not obscure the primary action | Fomo simultaneous-pane law; Phase 5 U1 One primary action; U11 Progressive disclosure | GP08 + progressive disclosure | GAS Original card | Side panels are secondary and disappear below the desktop context breakpoint; the center remains `GAS GAUGE -> RISK -> WAGER -> IGNITION` | `GAS05`, `GAS08` |
| Desktop must never fabricate social/economic depth | Phase 5 U9 No fake activity; RM06 verified economic objects | GP12 VerifiedEconomicObject | Phase 7 prototype empty states | Desktop session context explicitly labels recent rounds, live players and bankroll as unavailable/not connected rather than manufacturing activity | `GAS08`; visible `NO FAKE ACTIVITY` state |
| One account shell must preserve financial truth | RM01 ConsumerAccountFirst, RM09 TruthfulUnifiedPortfolio, RM17 CrossDeviceCanonicalState | GP01 ConsumerAccountEntry, GP02 TruthfulUnifiedAccount | Privy/wagmi architecture, `GasWalletAccess`, `/account` | Account remains the same canonical identity/wallet model; responsive layout changes density only; wallet remains a linked credential rather than a social identity | `GAS03`, `GAS07`; `docs/WALLET_ARCHITECTURE.md` |
| Reserve must be first-class on desktop without inventing backing | RM14 ReserveTrustSurface; Circle transparency translation | GP20 ReserveTrustSurface; Phase 5 U4/U9 | `/reserve`, Home reserve link | Reserve becomes persistent desktop navigation; unavailable coverage remains `—`; GAS/wGAS/GameBankroll exclusions remain explicit | `GAS06`, `GAS07` |
| Trade must remain simple by default | RM10 QuickDefaultAdvancedDepth; Kalshi/Polymarket translation | GP17 QuickTradeSheet, GP18 ProgressiveMarketDepth | `/trade` prototype | Responsive density exposes more simultaneous space but does not introduce CLOB/order-book plumbing into the default path; quote/fee/output requirements remain explicit | `GAS07` plus route content assertions through build/E2E |
| Social identity must not fragment across desktop surfaces | RM07 GlobalFollowingOneGraph | GP13 GlobalFollowingFeed, GP14 IdentityPerformanceCard | `/crews` and existing social substrate | No desktop-specific social graph, feed or identity model was created; Crews remains an honest empty prototype until canonical data exists | `GAS07`; no new social state store introduced |
| Existing mature infrastructure should survive the product transition | Phase 1 compatibility matrix | REUSE/REFACTOR rules | Privy, wagmi, React Query, tokens, App Router, Playwright, existing controller/view split | Phase 8 adds scoped GAS CSS/components and reuses existing providers/testing; no wholesale CSS/framework/auth rewrite | Production build + unit + Project GAS E2E + legacy compatibility CI gates |
| UI must acknowledge presentation without becoming financial authority | RM15 CanonicalPendingState; Phase 5 U2/U7; Codex addendum authority model | GP09 CanonicalActionState, GP21 HumanRecoveryNotice | `useGasOriginalPrototype` controller + presentation component | Desktop adaptation does not move canonical state into React layout code and does not add live-settlement claims; prototype truth boundary remains explicit | Existing state tests + Project GAS E2E; Phase 9 remains locked |

## Responsive behavior implemented

### Mobile — 390×844 regression source of truth
- five-item bottom navigation remains `Home / Play / Trade / Crews / Account`;
- Reserve stays one action from Home;
- GAS Original retains no-scroll IGNITION/replay reachability and 44px primary touch targets;
- desktop rail and desktop context panels are not shown.

### Tablet — 768×1024
- consumer bottom navigation remains in use;
- content width expands intentionally instead of accidental wrapping;
- two-column content density is allowed where appropriate;
- no desktop-only product state is introduced.

### Desktop — 1440×900
- persistent desktop rail exposes `Home / Play / Trade / Crews / Reserve`;
- `Search / Notifications / Account` appear as utilities;
- Home, Play, Trade, Crews, Reserve and Account use responsive content density;
- GAS Original adds simultaneous trust/session context while preserving the center game action hierarchy.

### Wide desktop — 1920×1080
- the same shell expands within a bounded content width;
- no alternate terminal application or additional financial state model appears;
- horizontal document overflow remains a hard failure.

## Frontend/backend authority check

No Phase 8 code added a new live financial authority. The responsive shell and side contexts are presentation-only. `GasOriginalPrototype` continues to consume the existing controller (`useGasOriginalPrototype`) rather than binding the responsive layout directly to future contract/RNG functions.

The following remain deliberately unavailable until their Phase 9 adapters exist:
- real RNG/VRF;
- real wager lock/bankroll settlement;
- live reserve/rebase values;
- live social graph/activity;
- live trade quote/settlement;
- final Bracket integration.

## Existing-repo compatibility check

Phase 8 preserves or builds on the Phase 1 reuse decisions:
- Next.js App Router retained;
- Privy + wagmi account stack retained and previously normalized;
- React Query/provider architecture retained;
- design tokens and existing GAS CSS reused;
- Playwright/Vitest/production build lanes extended rather than replaced;
- legacy compatibility E2E remains a separate regression gate;
- no mature generic backend utility was deleted for desktop parity.

## Findings

- **Desktop preserved mobile ontology:** PASS.
- **Social/account state remains canonical:** PASS for Phase 8 prototype scope; no duplicate desktop graph/account created.
- **Play primary action remains dominant:** PASS.
- **Advanced depth remains progressive:** PASS.
- **No fake activity/backing/liquidity was introduced:** PASS.
- **Financial semantics/provenance remain truthful:** PASS for prototype scope.
- **Frontend/backend authority remains explicit:** PASS.
- **Legacy refund ontology did not re-enter Project GAS routes:** PASS.
- **Approved responsive viewports now have explicit E2E assertions:** PASS in test definition; final run result is the gate.

## Closure rule

This review does not independently mark Phase 8 complete. Phase 8 may move to `PASS / CLOSED` only after the latest implementation head passes the required CI lanes, including production build, Project GAS E2E and the Phase 7 mobile regressions. Until then `ux-research/phase-8/PHASE_8_GATE.md` remains authoritative.
