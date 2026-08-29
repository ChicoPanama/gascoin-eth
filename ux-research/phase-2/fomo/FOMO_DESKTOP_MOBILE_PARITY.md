# Phase 2 — Fomo Mobile ↔ Desktop Parity Model

**Status:** Evidence-backed Phase 2 model  
**Evidence:** Official Fomo web launch, TradingView integration, mobile navigation guides and current published screenshots.

## 1. One account, not two products

Fomo's April 2026 web launch explicitly frames web as the existing Fomo account on a new screen.

Documented cross-device shared state:
- identity/profile;
- unified balance;
- positions;
- following/social graph;
- notification settings.

A trade opened on desktop is expected to appear on mobile rather than becoming a separate desktop-only position state.

## 2. Mobile establishes the mental model

Published mobile navigation is compact and persistent:
- Home;
- Search;
- Feed;
- Friends/Leaderboard;
- Profile.

The mobile product prioritizes:
- one-thumb navigation;
- fast discovery;
- social scrolling;
- profile/performance;
- quick execution.

## 3. Desktop expands information density, not conceptual scope

Fomo's own launch language says web is not intended to become a conventional trading-terminal product even though more screen area is available.

Desktop adds simultaneous context:
- dense token list/filters;
- persistent search;
- larger TradingView chart;
- token metrics;
- social trade markers;
- holder/trade/thesis panels;
- persistent execution rail;
- user position/performance context.

The core object relationships remain familiar from mobile:
`asset -> chart/social context -> buy/sell -> position -> profile/social graph`.

## 4. Desktop navigation transforms rather than duplicates mobile navigation

Official desktop visuals show a left-side application rail/list structure rather than literally scaling the five-item mobile bottom bar.

This is an important responsive principle:
**preserve destination meaning while adapting spatial organization to the device.**

The user should not need to relearn the product because a bottom destination became a desktop rail/tab.

## 5. Search remains global

Mobile places Search as a persistent bottom destination. Desktop elevates search into a prominent top/global input that can search assets/users.

Same capability; device-appropriate placement.

## 6. Social feed retains product status on desktop

Desktop's left/top modes include Feed and Leaderboard, while social signals are also embedded directly on charts and thesis/activity surfaces.

Web therefore does not demote SocialFi into a secondary mobile-only feature.

## 7. TradingView adds depth through progressive disclosure

Fomo integrated professional charting after the simple product model was established.

Desktop can expose:
- many timeframes;
- indicators;
- drawing tools;
- technical analysis;
- social overlays.

This adds expert capability without requiring mobile users to operate a terminal-like shell.

## 8. Execution becomes spatially persistent on desktop

Published desktop visual shows a dedicated right-side Buy/Sell execution area while the chart/discovery context remains visible.

Mobile necessarily uses more sequential sheets/screens due to space.

### UX law
**Desktop can reduce navigation cost through simultaneous panes while preserving the same decision sequence.**

## 9. Portfolio/position continuity is a product invariant

The same account balance and positions are documented across mobile/web.

The useful principle is not simply data sync. It is that the meaning of:
- cash;
- position;
- performance;
- trader identity;
- follow relationship
remains stable across both surfaces.

## 10. Social expansion survives desktop

The desktop screen layers:
- followed/top-trader signals on chart;
- thesis/comment context;
- leaderboard/feed navigation;
- holder/trade analysis.

This reinforces that social is part of the economic object rather than a phone-specific engagement layer.

## 11. Potential parity failure modes for direct capture

Phase 2 should test whether documented parity survives actual use:
- preferences sync correctly;
- Follow state changes propagate;
- notification configuration changes propagate;
- pending transaction state propagates;
- cash balance matches;
- open position and PnL state matches;
- feed object ordering/state is coherent;
- recently viewed/search context syncs or intentionally remains local;
- desktop back navigation preserves state;
- mobile app resume reconciles a desktop transaction.

## 12. Mobile/native details to compare

Capture:
- native bottom nav safe-area height;
- sheet vs full-screen navigation;
- system haptic/biometric involvement;
- swipe/back behavior;
- app-resume behavior;
- keyboard/search behavior;
- push notification deep-linking;
- touch-only slide-to-buy mechanics.

## 13. Desktop details to compare

Capture:
- left rail width/collapse behavior;
- global search location;
- chart/execution split ratios;
- whether execution panel remains fixed while scrolling;
- keyboard shortcuts if any;
- hover-only information;
- feed and leaderboard density;
- responsive breakpoints when desktop becomes tablet/mobile layout.

## 14. Direct GAS relevance (Phase 2 handoff only)

Do not copy Fomo's pane layout. Preserve the requirement to later evaluate GAS through one cross-device product model:
- one identity;
- one social graph;
- one truthful balance semantics;
- one set of canonical financial/game states;
- device-specific layout only.

## Sources

- https://fomo.family/blog/announcing-fomo-web
- https://fomo.family/blog/tradingview-partnership/
- https://fomo.family/blog/learn/navigating-your-fomo-app
- https://fomo.family/blog/learn/leveraging-fomos-social-features
- official current mobile/desktop Fomo visuals indexed in `FOMO_SOURCE_INDEX.md`

## Phase 2 conclusion

Fomo's cross-device strategy is:

**mobile defines the simple product model; desktop spends extra pixels on context, not on creating a different product.**

Direct capture should now test the fidelity of that promise and record the responsive transformation quantitatively.
