# Fomo Phase 2 — Direct Measurement Queue

**Status:** ACTIVE  
**Boundary:** user-driven ordinary use only. See `FOMO_RESEARCH_BOUNDARY.md`.  
**Rule:** Fomo's useful product behavior may be observed/measured for reference, but we do not autonomously crawl/scrape the account, automate trades, probe private endpoints, or copy implementation/source assets.

This queue exists to convert the remaining Phase 2 unknowns into explicit user-initiated observations and derived measurements without fake precision.

# P0 — gate-critical journeys

## M01 — Feed -> Profile -> Follow

User manually:
1. opens Feed;
2. selects an ordinary trader activity object;
3. opens actor profile;
4. follows/unfollows only if the user actually wishes to do so.

Record/derive:
- start/end screen names;
- intentional tap count;
- whether card opens token, trade, position or profile by default;
- actor identity fields on card;
- PnL/balance/thesis fields before profile entry;
- Follow CTA placement;
- acknowledgement behavior;
- return/back behavior;
- whether Feed filter/scroll position is restored.

Do not create a social relationship solely to satisfy research if the user does not want it; the Follow screen/CTA can be observed without committing.

## M02 — Leaderboard -> Profile

User manually:
1. opens Friends/Leaderboard;
2. chooses each visible timeframe;
3. opens a ranked profile;
4. returns to the leaderboard.

Record:
- current timeframe labels/order;
- row density;
- self-rank placement;
- row fields;
- profile entry tap count;
- return-state/timeframe preservation;
- scroll restoration.

## M03 — Social object -> economic action boundary

User manually:
1. opens a Buy/Sell/Thesis/position object from Feed;
2. follows its normal drilldown toward the related asset/trade surface;
3. stops before the final money-moving gesture unless independently making a real trade.

Record:
- actions/screens/modals/sheets;
- which social context survives navigation;
- amount field placement;
- available balance;
- presets;
- fee;
- slippage/price impact;
- verified/safety context;
- final commitment mechanism (`slide`, button, system payment sheet, etc.);
- route back to original context.

## M04 — Current Home / discovery IA

Record current live state because historical screenshots disagree:
- persistent top-level Home sections;
- token filters/categories;
- top-trader/social blocks;
- trending/gainers/graduated/crypto/etc labels actually present;
- default selected filter;
- filter persistence;
- Deposit/funding CTA placement;
- number of assets visible above fold.

## M05 — Search -> User / Token

Record:
- search entry path;
- keyboard/autofocus behavior;
- result grouping;
- user vs token distinction;
- recent search behavior;
- zero state;
- no-result state;
- result -> profile/asset action count;
- back state.

# P1 — geometry / information density

## M06 — Mobile shell

From a user-initiated screenshot at known device resolution record derived geometry for:
- bottom nav container;
- each destination;
- safe-area inset;
- header height;
- horizontal page inset;
- primary content width;
- persistent/fixed elements.

Preferred reference device screenshot metadata:
- native pixel width/height;
- device model;
- display zoom/text-size settings if non-default.

## M07 — Feed card anatomy

For each live event type available:
- Buy;
- Sell;
- Thesis;
- closed/open position;
- system/pinned object;
- transfer/deposit if naturally present.

Measure from capture:
- card x/y/w/h;
- row/card gap;
- avatar size;
- text hierarchy;
- financial-number count;
- primary/secondary actions;
- timestamp placement;
- engagement row;
- asset sub-card geometry;
- truncation rules visible in screenshot.

## M08 — Profile anatomy

Measure/record:
- header hierarchy;
- Follow control;
- followers/following/mutuals;
- behavioral stats;
- performance number;
- chart height;
- timeframe controls;
- Cash balance;
- Open positions;
- position-row density;
- activity/history sections;
- sticky elements.

## M09 — Leaderboard anatomy

Measure/record:
- Friends/Leaderboard tab geometry;
- self-rank card;
- timeframe controls;
- ranking row height;
- avatar/rank/performance alignment;
- rows per viewport;
- scroll behavior;
- sticky header/filter behavior.

## M10 — Trade/action sheet

Without executing an unnecessary trade, capture the pre-confirmation state after entering a harmless amount if the user is comfortable.

Record:
- Buy/Sell selector;
- amount control;
- output estimate;
- presets;
- available balance;
- fee display;
- small-order minimum fee behavior if naturally observable;
- slippage/price impact;
- token verification/risk labels;
- final slide/button geometry;
- settings depth.

# P2 — transaction / recovery states

Only observe naturally occurring states or non-money-moving failures. Do not create failed financial transactions for research.

## M11 — Sign-in / re-entry
- current identity providers;
- number of screens;
- biometric/system prompt placement;
- loading state;
- cancel/back behavior;
- failed login if it occurs naturally;
- session restore after app close/open.

## M12 — Deposit
Without unnecessary funding:
- Deposit CTA;
- Apple Pay/debit/crypto hierarchy;
- amount entry;
- fee/ETA language;
- network language for crypto;
- confirmation boundary;
- naturally occurring validation errors/recovery.

## M13 — Withdrawal
Without unnecessary withdrawal:
- discoverability from Profile/Cash Balance;
- bank/crypto options;
- destination fields;
- network warning;
- fee/ETA;
- biometric/step-up boundary;
- pending/history/support status screens if already available from the user's legitimate activity.

## M14 — Money-state lifecycle
For any legitimate action the user independently chooses to make, record timestamps/labels for:
- gesture acknowledgement;
- signing/authorization;
- submitted/pending;
- executed/confirmed;
- portfolio/balance update;
- social/feed update if applicable.

Never infer onchain finality from animation alone.

## M15 — Loading / empty / degraded states
Observe naturally:
- new/empty Friends feed;
- no search results;
- loading skeletons;
- data refresh;
- offline/reconnect if user independently loses connection;
- support/error surfaces.

Do not intentionally attack or degrade the service.

# P3 — cross-device parity

## M16 — Mobile -> Web state parity
Compare ordinary read-only states:
- profile identity;
- cash/unified balance;
- positions;
- Follow state;
- Feed/leaderboard availability;
- current preferences;
- recent searches if intentionally synced;
- notification settings where visible.

## M17 — Responsive transformation
At web widths available through normal browser resizing, record:
- when navigation changes form;
- left rail behavior;
- chart/execution proportions;
- feed density;
- execution panel persistence;
- mobile/tablet breakpoint behavior.

Do not use automated crawling; ordinary manual resize/capture is sufficient.

# P4 — accessibility / ergonomics

## M18 — Native accessibility observation
Where available during ordinary use:
- VoiceOver/TalkBack labels for nav and key actions;
- text scaling behavior;
- state not communicated by color alone;
- reduced-motion behavior;
- touch target comfort;
- focus order on web keyboard navigation.

Do not claim compliance from absence of visible issues.

# Capture outputs

For each user-driven capture session, save **derived observations**, not authenticated session material.

Suggested local-only structure:

```text
.local-ux-captures/fomo/
  session-YYYYMMDD-HHMM/
    originals/        # screenshots/video; local only unless explicitly approved
    notes.md
    measurements.json
```

Sanitized repo output:

```text
ux-research/phase-2/fomo/captures/
  session-YYYYMMDD-HHMM/
    observations.json
    journey-metrics.json
    summary.md
```

Do not commit:
- cookies;
- browser profile;
- access tokens;
- private keys;
- wallet export data;
- payment-card/bank details;
- personally sensitive notifications;
- raw screenshots containing sensitive account information unless explicitly sanitized and approved.

# Evidence labels

- `documented`
- `official_published_visual`
- `manual_observed`
- `capture_measured`
- `unavailable`
- `inferred`

# Phase 2 gate rule

The gate passes only after this queue has been **materially exhausted with the legitimate tools available**. A state that cannot or should not be captured is marked `unavailable` with the reason; it is never filled with an estimate.
