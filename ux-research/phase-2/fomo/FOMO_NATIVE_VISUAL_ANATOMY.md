# Phase 2 — Fomo Native/Web Visual Anatomy

**Evidence class:** `official_published_visual`  
**Important:** These observations are visual structure from Fomo-published images. They are not computed CSS measurements. Exact pixel values remain pending direct capture.

## 1. Global mobile shell

Repeated official screens establish a stable five-destination bottom shell:

1. Home
2. Search
3. Feed — center destination
4. Friends / Leaderboard
5. Profile

Observed characteristics:
- translucent / glass-like bottom container;
- Feed receives center-weighted visual emphasis;
- selected destination is visually distinct without needing a text label;
- the shell remains visible across feed and leaderboard screens;
- major content extends close to the shell, maximizing vertical information density.

### GAS relevance
Do not copy the iconography. Preserve the law: **five or fewer persistent destinations, center-weight the dominant repeat action/destination, and keep the mobile content model stable.**

## 2. Onboarding screen

Source: `create-an-account.webp` and current `sign-in-static.webp`.

Observed hierarchy:
1. branded visual / logo;
2. one-line product promise;
3. very large consumer identity buttons;
4. Terms / Privacy secondary text.

Visible account choices in published visuals:
- Sign in with Apple;
- Sign in with Google.

Official written docs also reference email/Apple ID. Treat the exact live method list as capture-pending.

Not visibly present on the primary screen:
- seed phrase;
- network selector;
- RPC;
- native gas token requirement;
- external-wallet chooser.

### GAS relevance
GAS account entry should lead with normal consumer identity, not blockchain vocabulary.

## 3. Home / discovery screen

Current landing-phone visual shows:
- portfolio/account balance as the first large number;
- 24h account change immediately beneath;
- Deposit as a large adjacent primary financial CTA;
- top-trader/social-performance cards before the main token list;
- compact categorical discovery tabs;
- dense token rows with asset identity + market information + price/change;
- persistent bottom navigation.

Key structural law:
**Account state -> funding CTA -> social proof/discovery -> asset list.**

Historical Home filters changed over time, so exact current labels are capture-pending.

## 4. Feed screen

Source: `social-feed.webp` and current `social-static.webp`.

### Header
- concise `Feed` title;
- in-context Friends-only/following scope control rather than separate community application;
- no heavyweight page chrome.

### Feed object grammar
Older published screenshot:
- actor/avatar;
- action verb (`bought`, `closed a position`);
- amount;
- context badge;
- timestamp right aligned;
- compact asset card beneath with token identity, market cap, monetary amount and token units.

Current landing social visual expands the grammar to typed economic/social events:
- `Thesis`;
- `Buy`;
- `Sell`;
- position cards;
- engagement counts;
- threaded/older-context affordance.

### Pinned/system content
Feed screenshot includes pinned Fomo/system recap content before ordinary activity.

### Density
A single mobile viewport can show a pinned block plus multiple economic events. The feed is designed for scan speed rather than large lifestyle-media cards.

### GAS relevance
A GAS feed can support heterogeneous canonical objects while preserving a stable grammar:
`actor -> event type -> economic object -> verified numbers -> time -> next action`.

## 5. Friends / Leaderboard

Sources: `friends-and-leaderboard.webp`, `leaderboard.webp`.

### Top tabs
- Friends and Leaderboard share one destination;
- active tab marked with a thin underline / state cue.

### Self-context first
A `Your rank` card appears before global top traders.

### Timeframe controls
Compact inline:
- 24h
- 7d
- 30d
- All

### Ranking row anatomy
- rank/medal;
- avatar;
- display name;
- handle;
- monetary performance right aligned;
- small token/position badges/icons.

### Density
Approximately seven top-trader rows are visible in the published mobile screenshot before the lower navigation region, indicating a deliberately compact ranking row.

### GAS relevance
Rankings should be a **discovery surface**, not merely a scoreboard. Player/Crew row -> verified profile -> social relationship/action.

## 6. Trader profile

Sources: `profile.webp` from both official guides.

### Profile identity header
- back control;
- avatar;
- display name + handle;
- optional bio;
- Following / Followers counts;
- mutual-follow context on later screenshot;
- compact behavioral stats such as average hold time, trades, join date;
- prominent Follow button;
- share/external social control.

### Performance section
- very large performance/account number;
- 24h change adjacent/beneath;
- compact timeframe controls;
- large line chart.

### Financial segmentation
Critically, the profile does **not** collapse everything into one ambiguous number:
- `Cash balance` is explicitly labeled;
- `Open positions` is a separate section;
- each position shows asset identity, units/value and performance.

### GAS relevance
GAS identity should similarly separate:
- identity/social stats;
- verified performance;
- spendable balances;
- locked/pending/game/position state.

## 7. Position drilldown

Source: `position.webp`.

Observed hierarchy:
1. trader identity + Follow;
2. token / state (`Open`);
3. current price + performance;
4. chart with trade markers;
5. timeframes;
6. large position value / profit summary;
7. average entry;
8. Share action;
9. transaction history with individual buy events.

This screen makes a social feed item inspectable all the way down to the trader's position construction.

### GAS relevance
A GAS result/round drilldown should make canonical facts inspectable without requiring a block explorer:
- round ID;
- mode;
- wager;
- result/multiplier;
- settlement;
- fairness proof;
- related social commentary as a separate layer.

## 8. Notifications settings

Source: `notifications.webp`.

Observed hierarchy:
- top-level Notifications title;
- master Enabled notifications toggle;
- multiple independent signal families;
- some families expose a deeper configuration row rather than binary-only toggle.

Published categories:
- Price alerts;
- Friends' activity;
- Trending activity;
- Top traders' activity;
- Announcements;
- New followers.

Official social guide documents deeper Friends filtering by minimum trade size and selected followed users.

### GAS relevance
Notifications should be **signal families with user control**, not an undifferentiated push stream.

## 9. Current compact alert object

Source: `alerts-static.webp`.

Example anatomy:
- asset + market movement in headline;
- social proof and aggregated economic magnitude in second line;
- timestamp;
- app identity icon.

This compresses:
`what changed + who/what validates relevance + magnitude`.

Potential GAS analogue later:
`REDLINE hit 82.4x` + `followed player / Crew` + `verified payout`, or `GAS rebase +0.3%` + personal impact — but exact pattern belongs to later phases.

## 10. Current Apple Pay / quick-buy composition

Source: `apple-pay-static.webp`.

Visible stack:
- Buy/Sell state at top;
- large dollar amount;
- output token amount;
- preset dollar chips ($25/$50/$100/$250 in published visual);
- secondary configuration icon;
- Apple Pay funding/payment section;
- fee message near payment boundary;
- large `Buy with Apple Pay` final CTA.

### GAS relevance
The key law is not the dollar values. It is:
**amount first -> presets -> fee context -> recognizable payment rail -> explicit final CTA.**

## 11. Desktop web anatomy

Source: current `fomo-desktop.webp` and April 2026 web/TradingView documentation.

### Left rail
- Tokens / Feed / Leaderboard top modes;
- token category filters;
- vertically dense asset rows;
- collapse affordance.

### Global top bar
- search for tokens or usernames;
- cash balance/profile at the far right.

### Asset header
- token identity;
- favorite/watch affordance;
- price;
- market cap;
- 24h change;
- volume;
- liquidity;
- holder count.

### Main workspace
- chart dominates center;
- trade/social markers visibly overlaid on chart;
- compact timeframe controls;
- chart overlays for Friends, Top Traders and user's own trades.

### Lower analysis area
- Holders;
- Trades;
- Thesis/social context.

### Right execution rail
- Buy / Sell tabs;
- amount input;
- preset amounts;
- available balance;
- fee;
- explicit Buy CTA;
- user's position/performance context;
- thesis/comment entry;
- token information;
- buy/sell distribution/activity information.

### Desktop principle
Fomo's own documentation explicitly says web is **not a trading terminal** even though the desktop screen can expose advanced depth. The mobile mental model persists while information density increases.

## 12. Social system as visual layer

Across current Fomo screenshots, social context appears in:
- Home trader cards;
- Feed;
- token/position drilldowns;
- profile;
- leaderboard;
- chart overlays;
- notifications;
- thesis/comment surfaces.

This supports the Phase 2 conclusion:
**Social is not a single Community page. It is attached to economic state throughout the application.**

## 13. Visual weaknesses / capture questions

Public images cannot establish:
- touch-target sizes in actual device points;
- computed CSS/layout values;
- animation durations/easing;
- loading skeleton behavior;
- error states;
- exact modal/sheet transitions;
- scroll restoration;
- real execution acknowledgement/latency;
- current filter names where historical marketing images conflict;
- native vs web behavior under account/session failure.

These stay in the manual capture queue.
