# Phase 2 — Fomo SocialFi System Model

**Status:** Evidence-backed Phase 2 model  
**Purpose:** Describe Fomo's social system as a set of product/state relationships rather than as screenshots.

## 1. The social graph is product infrastructure

Fomo's social layer spans:
- Feed;
- Friends/following;
- profiles;
- leaderboard;
- token-specific timelines;
- chart overlays;
- theses/comments;
- notifications;
- newer perpetual-product surfaces.

The social system is therefore not one `Community` destination. It is a shared graph attached to financial objects throughout the product.

## 2. Canonical identity object

A trader profile can expose:
- avatar;
- display name / handle;
- follower/following state;
- mutual followers;
- performance chart;
- current open positions;
- cash balance;
- recent trades/activity;
- behavioral stats such as average hold time;
- Follow action.

### Product role
Profile answers two different questions simultaneously:
1. `Who is this person socially?`
2. `What verified economic context does the product have about them?`

That combination makes ranking/feed discovery actionable without requiring screenshots or self-reported performance.

## 3. Global and Following are views over one activity system

Fomo progressively added:
- Friends feed;
- following toggle in the main Feed;
- global thesis distribution;
- top-trader activity;
- token-specific feeds.

The pattern is one canonical stream with different relevance scopes, not disconnected content silos.

Conceptually:

`ALL ACTIVITY`
`├─ global/trending`
`├─ following/friends`
`├─ token-specific`
`├─ top traders`
`└─ profile-specific`

## 4. Economic activity is the social content primitive

Fomo's feed has evolved from buy/sell activity into typed social-economic objects:
- buy;
- sell;
- position open/close;
- profit milestone;
- deposit/transfer;
- thesis;
- comments/replies/reactions;
- significant movement relative to the user's entry.

### Stable feed grammar
The repeated visual/documented model is:

`ACTOR -> ACTION TYPE -> ECONOMIC OBJECT -> VERIFIED CONTEXT -> TIME -> SOCIAL/ECONOMIC NEXT ACTION`

## 5. Social narrative and financial evidence are colocated

Trade Thesis allows a user to attach reasoning to an entry/exit. February 2026 expanded thesis into the global feed and displayed trader PnL and balance with the thesis.

This is a powerful Fomo pattern because narrative is not isolated from observable account context.

### GAS improvement requirement
Later GAS design should visually distinguish:
- canonical protocol facts;
- derived performance metrics;
- user-authored commentary.

They can appear together while remaining semantically separate.

## 6. Leaderboard is a discovery engine

Fomo's leaderboard:
- supports multiple timeframes (24h / 7d / 30d / All in published material);
- ranks traders by performance;
- provides row-to-profile drilldown;
- profile then exposes positions/cash/recent activity;
- Follow adds the person into future discovery/notification flows.

The loop is:

`RANK -> PROFILE -> VERIFY CONTEXT -> FOLLOW -> FEED/ALERTS`

not merely `RANK -> SCORE`.

## 7. Following changes the future product

Following is consequential because it affects:
- Feed content;
- Friends/following filter;
- notifications;
- chart signals/overlays;
- mutual-follow context;
- discovery.

### Phase 2 law
**Follow should be a relationship that changes future information, not a vanity count.**

## 8. Notifications are social graph re-entry

Fomo documents notification families including:
- Price alerts;
- Friends' activity;
- Trending activity;
- Top traders' activity;
- Announcements;
- New followers.

Friends activity can be further configured by minimum trade size and specific followed users.

The social graph therefore drives re-entry, not just browsing.

## 9. Chart becomes social context

Fomo added:
- dynamic PnL directly on chart;
- followed-trader buy/sell signals;
- real-time activity;
- community sentiment/social overlays;
- professional TradingView analysis underneath.

### Product law
**When the user is making a financial decision, relevant social context stays attached to the object being evaluated rather than requiring a separate social tab.**

## 10. Comments deepen economic objects rather than create generic posts

Fomo expanded comments/replies/reactions across:
- trades;
- position milestones;
- first buys;
- transfers;
- theses.

This keeps conversation anchored to an event with economic provenance.

## 11. Search connects identity and assets

Fomo's Search supports both:
- tokens/assets;
- user profiles.

This is a subtle but important IA decision: people and financial objects live in one discoverable application namespace.

## 12. Social layer survives product expansion

When Fomo introduced perpetuals, it reused:
- Feed;
- leaderboard;
- thesis;
- profiles;
- notifications;
- position half-sheets/share cards.

The new financial product extends the same social primitives rather than creating a separate perps community.

### GAS relevance
This is highly relevant to future Bracket compatibility: GAS should eventually extend one identity/social graph into Bracket rather than create a second community/account shell.

## 13. SocialFi risks / weaknesses to improve

### Copy pressure
Fomo's materials explicitly frame top-trader tracking as a way users might find/copy trades. GAS should preserve discovery while requiring explicit user confirmation before any wager/trade.

### PnL/ranking incentives
Performance-based discovery can incentivize extreme risk, gaming, survivorship bias or misleading snapshot performance. GAS ranking logic later needs transparent metrics and anti-gaming controls.

### Information overload
Attaching social context everywhere can become noise. Fomo's February feed redesign itself is evidence that high-activity SocialFi needs disciplined scan grammar.

### Source/provenance ambiguity
A feed mixing user commentary and economic facts needs strong visual provenance. GAS can improve this with typed canonical event IDs and explicit pending/settled states.

## 14. Open questions for direct capture

- current global vs Friends/following control placement;
- exact feed-card event types live today;
- card density and visible fields by event type;
- profile -> Follow tap count and acknowledgement;
- leaderboard -> profile transition;
- back navigation/scroll restoration;
- notification deep-link destination;
- comments/thread sheet behavior;
- mutual-follow rendering;
- search grouping of users vs tokens;
- whether social filters persist across sessions/devices;
- live update insertion behavior;
- loading/empty states for new accounts with no follows;
- block/mute/report controls and moderation UX;
- current perps-vs-spot social differentiation.

## Source set

- https://fomo.family/blog/learn/leveraging-fomos-social-features
- https://fomo.family/blog/learn/navigating-your-fomo-app
- https://fomo.family/blog/september-2025-recap
- https://fomo.family/blog/october-2025-recap/
- https://fomo.family/blog/november-2025-recap
- https://fomo.family/blog/december-2025-recap
- https://fomo.family/blog/january-2026-recap/
- https://fomo.family/blog/february-2026-recap
- https://fomo.family/blog/tradingview-partnership/
- https://fomo.family/blog/announcing-fomo-web
- https://fomo.family/blog/perpetuals-now-on-fomo

## Phase 2 conclusion

Fomo's SocialFi advantage is a **closed information loop**:

`DISCOVER ECONOMIC EVENT -> INSPECT IDENTITY/PERFORMANCE -> FOLLOW/ENGAGE -> RECEIVE BETTER FUTURE SIGNALS -> RETURN TO ACTION`

The key reference point for GAS is not a social feed component. It is the fact that **identity, economic provenance, discovery, relationship and action are one connected system.**
