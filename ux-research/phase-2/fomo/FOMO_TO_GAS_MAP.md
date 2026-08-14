# Phase 2 — Fomo → Existing GAS Compatibility Map

**Purpose:** Compare the documented Fomo SocialFi/application-shell primitives directly against the current `gascoin-eth` implementation so later GAS work evolves existing bones rather than building a disconnected social application.

## Summary

The current GAS repository already has enough social/navigation/account infrastructure to absorb most of Fomo's useful product laws. The largest gaps are not framework gaps; they are **data-model, identity, feed-object, following, notification and economic-action integration gaps**.

## Primitive mapping

| Fomo primitive | Existing GAS substrate | Action | GAS improvement target |
|---|---|---|---|
| Global social feed | `CommunityFeed` inside Leaderboard Recent tab | REFACTOR/EXTEND | Canonical typed GAS event feed with game/trade/rebase/reserve/Crew objects |
| Friends/following feed | partial community/follow/referral infrastructure | BUILD/EXTEND | Same underlying event stream filtered by followed players/Crews |
| Leaderboards | `/leaderboard`, podium, rankings table, stats | REFACTOR | Player/Crew rankings with transparent, anti-gaming metrics |
| Profile drilldown | `WalletDrillDown`, X handles/avatar support | REFACTOR | GAS identity first; wallet/address becomes controlled technical detail |
| Follow graph | old X-follow verification/recheck + social identity primitives | BUILD/REPURPOSE | Native GAS follow relationships rather than external-X follow gates |
| Social trade/result object | CommunityFeed old activity model | BUILD | Verified round/transaction-linked result/activity card |
| Social object → action | no GAS-native game/trade action yet | BUILD | `TRY BOOST/REDLINE/...` preconfigures but never auto-wagers |
| Unified account | Privy + wallet hooks + dashboard/account surfaces | REFACTOR/BUILD | One consumer account shell with correct GAS/USDC/pending/future-position semantics |
| Same identity across devices | Privy/session infrastructure | EXTEND | Persist profile/follows/preferences/pending money state across devices |
| Notifications | existing platform/webhook primitives, no GAS notification architecture | BUILD/EXTEND | Deep-link to exact result/player/Crew/rebase/settlement state |
| Search across assets/users | old product routes do not provide unified GAS search | BUILD | Search players/Crews/games/transactions/future Bracket markets |
| Quick action near discovery | NavActionsMenu + existing CTA patterns | REFACTOR | Contextual action adjacent to result/activity without hidden financial intent |
| Performance context | leaderboard scores and wallet drilldown | REFACTOR | Protocol-verified game/trade history, not screenshot/self-reported claims |
| Advanced chart/social overlay | no GAS-native trade chart shell yet | DEFER/BUILD LATER | Advanced Trade/Bracket depth behind progressive disclosure |
| Exit/withdraw from account | wallet/tracker legacy surfaces | REFACTOR | Exit path as discoverable as entry, with settlement/recovery state |

## Existing GAS behaviors worth preserving

### URL-backed social state
`LeaderboardClient` already preserves tab state in the URL and responds to browser back/forward navigation. Keep this behavior for GAS feed filters, leaderboard timeframes and deep-linked social states.

### Scroll preservation
The current leaderboard uses route replacement without forced scrolling when tabs change. This is directly compatible with a high-frequency feed UX where returning from profile/result detail should not reset the user's place.

### Loading/error surfaces
The existing leaderboard has dedicated loading/error behavior. Phase 5 should convert these from generic page states into GAS patterns rather than replace them with raw spinners/errors.

### Profile identity prior art
Rankings already support avatar + X handle + wallet fallback. GAS should reverse the priority: GAS username/profile is primary; linked X and wallet/address are optional verified attributes.

## Fomo laws GAS should adopt

1. **One social graph across the product.** Do not create separate follows for Play, Trade and future Bracket.
2. **Global discovery and following relevance are different filters over one system.**
3. **Ranking is a discovery path, not merely a scoreboard.** Every ranked identity should lead to useful verified context.
4. **Social content is stronger when it carries economic context at the point of discovery.**
5. **Context should survive device and surface changes.** Identity, balances, follows and relevant preferences must not reset between mobile/desktop.
6. **Advanced financial depth should be contextual, not the default shell.**
7. **Notifications should return the user to the exact relevant state.**

## Fomo weaknesses / places GAS should improve

### 1. Avoid implicit copy-trading pressure
Fomo's product is optimized around following top traders and acting on their activity. GAS should preserve discovery value while requiring explicit user confirmation before any wager/trade and avoiding auto-copy defaults.

### 2. Separate verified facts from social narrative
A GAS social object should visibly distinguish:
- canonical round/transaction facts;
- calculated/verified performance;
- user-authored commentary.

### 3. Preserve financial-domain boundaries
A unified shell must never imply that:
- GAS monetary reserve backs game winnings;
- game bankroll is user cash;
- future Bracket marked position value is spendable cash;
- potential payout is current balance.

### 4. Improve feed trust state
Every economic feed object should carry enough state to answer whether it is:
- pending;
- confirmed;
- settled;
- failed/reorged/reconciled;
- sourced onchain/indexer/user-authored.

The typed live-event prior art in PR #66 is a strong candidate implementation basis.

### 5. Make the game itself socially replayable
Fomo primarily connects social content to trading. GAS can go further by making a verified game result an actionable object:

`RESULT → SEE CONFIG → TRY CONFIG → EXPLICIT IGNITION`

This is a unique GAS-native SocialFi loop rather than a copied trading pattern.

## Phase 2 measurement priorities

The highest-value measurements are now:

1. **F05/F06:** feed → profile → follow.
2. **F07:** leaderboard → profile → follow.
3. **F08:** feed thesis/trade → relevant economic action.
4. Feed density at mobile and desktop standard viewports.
5. Back-navigation/scroll preservation behavior.
6. Primary CTA placement on asset-detail and social-detail surfaces.

If authenticated states cannot be measured without an account, retain official-document evidence and mark geometry/timing as unavailable rather than fabricating values.

## Phase 5 carry-forward candidates

Candidate GAS pattern names emerging from Fomo research:
- `VerifiedSocialObject`
- `ActionableResult`
- `GlobalFollowingFeed`
- `IdentityPerformanceCard`
- `ContextPreservingDrilldown`
- `CrossDeviceAccountContinuity`
- `NotificationDeepLink`
- `SimpleDefaultAdvancedDepth`

These are **candidate patterns only** until Phase 4 Reference Matrix confirms them against other products.
