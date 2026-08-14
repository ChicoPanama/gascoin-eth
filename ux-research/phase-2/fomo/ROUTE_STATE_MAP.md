# Phase 2 — Fomo Route / State Map

**Status:** ACTIVE — documented/observed pass
**Evidence class:** official Fomo documentation + public web surfaces. Measured browser captures remain a separate workstream.

## Why Fomo is the primary Phase 2 reference

Fomo is not being treated as a visual template. It is the deepest single SocialFi/application-shell reference because its documented product model combines identity, balances, execution, discovery, profiles, following, leaderboards, notifications and cross-device continuity in one consumer experience.

## Documented mobile information architecture

Official navigation guidance documents a five-destination bottom-navigation model:

1. Home / discovery
2. Search
3. Social feed
4. Friends & leaderboard
5. Profile

### Home / discovery
Documented behaviors:
- token/asset discovery with filters;
- asset detail after selection;
- holder/context information;
- primary buy action anchored near the bottom;
- shareable win/fumble cards.

### Search
Documented behaviors:
- search assets;
- search user profiles;
- profile inspection can lead to following.

### Social feed
Documented behaviors:
- followed users and top traders appear in the feed;
- buys and sells appear as social activity;
- position status/PnL context updates in the feed;
- feed is designed to make trading discovery feel like scrolling a social network.

### Friends & leaderboard
Documented behaviors:
- leaderboards across multiple time windows;
- profile drilldown from ranked trader;
- follow from profile;
- trade-history/context inspection;
- Friends view for focused social tracking.

### Profile
Documented behaviors:
- personal volume/followers/following;
- portfolio performance chart over multiple timeframes;
- activity history;
- cash balance as a withdrawal entry point.

## Documented web architecture

Fomo Web is explicitly described as the same account on a larger screen rather than a separate terminal product.

Continuity documented across mobile/web:
- same profile;
- same unified USD balance;
- same positions;
- same following graph;
- same notification settings;
- trades opened on one device appear on the other.

Web-specific additional context includes:
- social feed;
- trending assets/alerts;
- leaderboards;
- trade theses;
- quick buys;
- professional TradingView charting as optional depth rather than the default product mental model.

## Feed-state evolution

### Global feed
Current documented feed supports broad social/trading discovery.

### Following / Friends focus
Fomo introduced a focused feed of activity from users a person follows, reducing global-feed noise.

### Trade-thesis object
A thesis can surface in the global feed with:
- trader thesis/context;
- PnL;
- balance;
- likes/interactions.

### High-activity design
Fomo's February 2026 feed redesign explicitly targeted faster scanability and organization during high-activity periods.

## Notification state

Documented notification purposes include:
- activity from followed/top traders;
- notable coin/trading activity;
- announcements;
- new followers;
- price changes relative to entry.

GAS implication: notifications should deep-link to the exact relevant result/player/Crew/rebase/settlement state, not to generic Home.

## Execution abstraction

Documented Fomo abstractions include:
- same/unified USD balance across supported chains;
- no normal bridging/chain switching in the web execution path;
- gas sponsorship described in its consumer positioning;
- email/Apple ID account creation;
- fiat/crypto funding options;
- fast/quick-buy flows.

GAS implication: chain/account mechanics should be implementation detail where safely possible, but explicit financial intent and domain separation must remain.

## Cross-product extension behavior

Fomo's newer perpetuals reuse the same social primitives: feed, leaderboard, theses, profiles, top-holder/trader context and notifications.

GAS implication: GAS SocialFi should be built as a reusable product layer that can later extend to Bracket without a second identity/social shell.

## GAS translation hypotheses to measure

1. **Five-destination mobile navigation is cognitively effective**, but GAS destinations will differ. Phase 6 should test Home / Play / Trade / Crews / Account while keeping Reserve trust one action away.
2. **Social object → context → action** is the core Fomo law; GAS result objects should preserve a verified round/configuration and offer a `TRY MODE` path without auto-wagering.
3. **One identity across products/devices** should be non-negotiable for GAS.
4. **Following feed + global feed** likely maps directly to GAS's network/social layer.
5. **Verified performance context** is stronger than screenshot/social claims; GAS can improve this by anchoring game/trade claims to canonical round/transaction IDs.
6. **Advanced depth is optional**: TradingView can coexist with simplicity because it is added to the asset-detail surface rather than forcing all users into a terminal.
7. **Withdraw/exit is visible from account context**, supporting GAS's exit-symmetry principle.

## Evidence sources

Official Fomo sources reviewed:
- `https://fomo.family/blog/announcing-fomo-web`
- `https://fomo.family/blog/february-2026-recap/`
- `https://fomo.family/blog/learn/navigating-your-fomo-app`
- `https://fomo.family/blog/learn/leveraging-fomos-social-features`
- `https://fomo.family/blog/september-2025-recap`
- `https://fomo.family/blog/perpetuals-now-on-fomo`
- `https://fomo.family/blog/tradingview-partnership/`
- `https://fomo.family/blog/learn/what-is-fomo`

## Still required for Phase 2 gate

- measured geometry at standard public viewports where accessible;
- feed element density and primary focal-point counts;
- profile/follow/leaderboard action-count measurements;
- public social-to-action journey measurements;
- loading/empty/error/public-auth states where observable;
- comparison against the existing GAS leaderboard/community substrate;
- final Fomo pattern extraction with strengths, weaknesses and GAS improvements.
