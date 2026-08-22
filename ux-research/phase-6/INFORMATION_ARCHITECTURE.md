# GAS UX Phase 6 — Information Architecture

**Status:** CANONICAL IA CANDIDATE / gate artifact  
**Inputs:** Phase 0 protocol freeze, Phase 1 repo inventory, Phase 5 GAS Pattern Library

## Product mental model

A normal user experiences GAS as one application with five primary jobs:

```text
HOME     — what is happening to my GAS / network / people I care about?
PLAY     — play GAS Original or another GAS game
TRADE    — buy/sell/fund/withdraw assets
CREWS    — people, groups, rankings and competitive identity
ACCOUNT  — my available funds, portfolio, history, permissions and security
```

The monetary protocol remains visible but does not become another consumer workflow maze:

```text
HOME → Rebase Moment → Reserve Summary → /reserve detail
```

Future Bracket joins the same identity/account/social shell rather than creating a second application.

---

# 1. Primary navigation

## Mobile bottom navigation — LOCK FOR PROTOTYPE

Exactly five persistent destinations:

1. **Home** → `/`
2. **Play** → `/play`
3. **Trade** → `/trade`
4. **Crews** → `/crews`
5. **Account** → `/account`

### Rules

- Play is the center/high-salience primary product action but must remain visually coherent with GAS rather than a floating casino gimmick.
- Bottom navigation respects safe-area insets.
- Current destination is programmatically selected and not indicated by color alone.
- Search and Notifications are top-level utilities, not sixth/seventh nav tabs.
- Reserve is not buried: its summary is persistent/visible on Home and its detail route is one action away.
- Docs/Audits/Governance are secondary navigation.

## Desktop navigation

Persistent primary destinations:

`Home | Play | Trade | Crews | Reserve`

Right-side account/utility cluster:

`Search | Notifications | Account`

Desktop is allowed more simultaneous context but uses the same routes/state objects as mobile.

---

# 2. Canonical routes

## Core consumer routes

| Route | Primary purpose | Primary action | Core patterns |
|---|---|---|---|
| `/` | personalized Home / live GAS state | Play or contextual next action | GP19, GP20, GP12, GP13 |
| `/play` | game selection / last-play resume | Open/Resume GAS Original | GP07, GP10 |
| `/play/gas` | GAS Original | IGNITION | GP03, GP06–GP11, GP21 |
| `/play/roulette` | provably-fair roulette | Place/confirm wager | GP03, GP07–GP10, GP21 |
| `/trade` | Buy/Sell/Fund/Withdraw hub | Buy/Sell GAS | GP17, GP18 |
| `/crews` | Crew discovery/rankings | Inspect/Join Crew | GP13–GP16, GP22 |
| `/crews/[slug]` | Crew identity/activity/ranking | Join/Leave or contextual action | GP15, GP16 |
| `/profile/[handle]` | player identity/performance/activity | Follow | GP14, GP16 |
| `/account` | available funds, portfolio, history | context-dependent safe account action | GP02–GP04 |
| `/reserve` | monetary backing/rebase verification | Verify/inspect backing | GP19, GP20 |
| `/search` | unified discovery | Open relevant result | GP22 |
| `/notifications` | relevant re-entry events | Open relevant object | GP23 |

## Canonical object/detail routes

| Route | Object |
|---|---|
| `/activity/[id]` | verified social/economic activity object |
| `/round/[id]` | canonical game round / fairness verification |
| `/transaction/[id]` | canonical Trade/funding/withdrawal action state |
| `/rebase/[id]` | completed/upcoming rebase event detail when addressable |

These routes support deep links independent of source-feed client state.

## Secondary routes

| Route family | Purpose |
|---|---|
| `/docs` | protocol/product docs |
| `/docs/[slug]` | deep documentation |
| `/security` or docs equivalent | permissions/custody/security explanation |
| `/settings` | notification/preferences/accessibility/security settings if not embedded in Account |

## Legacy route migration

Legacy GasCoin routes remain redirect-compatible where valuable but disappear from primary navigation:

- `/community` → Home/Crews activity context as appropriate;
- `/leaderboard` → `/crews` or player rankings view;
- `/creator/[handle]` → `/profile/[handle]`;
- `/dashboard` → `/reserve` or Home protocol detail;
- `/wallet` → `/account`;
- `/how-it-works` → docs/contextual education;
- `/submit`, `/gates`, `/standing`, refund/receipt workflows → retire from new consumer IA unless preserved in archival/internal tooling.

Exact redirect implementation occurs in Phase 7+ after route compatibility review.

---

# 3. Home architecture

Home answers four questions in this order:

1. **What do I have / what can I do?**
2. **What is happening to GAS?**
3. **What is happening socially?**
4. **What should I do next?**

## Mobile Home hierarchy

```text
Top utility row
  GAS mark / search / notifications / account status

Available / GAS account summary
  available-to-use value
  GAS + USDC compact breakdown
  [PLAY] [BUY]

Rebase Moment
  countdown / completed direction / magnitude / personal impact

Reserve Summary
  external backing / freshness / status
  tap -> /reserve

Following / Live activity
  verified economic objects

Crews / rankings / discovery
```

### Important account wording

`Available to use` is distinct from broader `Portfolio value`.

Locked wagers or marked future positions may belong to the user's portfolio but must never appear spendable.

## Desktop Home

Desktop may use a two/three-column composition:
- personal monetary/account state;
- live social activity;
- contextual Play/Trade/Reserve modules.

It must not introduce a separate terminal mental model.

---

# 4. Play architecture

## `/play`

Purpose: choose/resume a game, not browse casino clutter.

Initial cards:
- GAS Original — signature/default;
- Roulette — secondary social game.

Future games may enter only if they preserve the one-machine simplicity principle.

## `/play/gas` mobile hierarchy

The primary approved viewport should require **no vertical scrolling for the wager/IGNITION/result loop**.

Source of Truth v1.1 fixes the Phase 1 player boundary to USDC. GAS sourcing/credit is automatic and invisible; the game remains GAS-native internally and pays out GAS. No player-facing GAS/USDC selector is part of the canonical IA.

```text
Compact account/balance row

GAS GAUGE / canonical result zone

CRUISE | BOOST | REDLINE

USDC entry amount
presets / available USDC balance
automatic GAS sourcing + GAS payout context

IGNITION

compact live/social context
```

Expandable/detail surfaces:
- Provably Fair / Verify;
- round history;
- odds/RTP/payout details;
- Instant/Cinematic settings;
- permission/session details.

### Canonical Play state machine

```text
READY
  ↓ explicit IGNITION
INTENT_CREATED
  ↓
LOCKING
  ↓
RESOLVING
  ↓
SETTLED
  ↓
RESULT
  ├─ IGNITION AGAIN
  ├─ SHARE
  └─ VERIFY
```

Failure/reconnect branches never skip canonical reconciliation.

---

# 5. Social architecture

Social is a product layer, not a separate Community application.

## Canonical activity object

Every social/economic object has:
- canonical activity ID;
- actor identity;
- activity type;
- timestamp;
- canonical financial/game facts;
- provenance/status;
- optional user commentary;
- engagement data;
- contextual action.

Initial activity types:
- GAS Original result;
- Roulette result;
- GAS Buy/Sell where sharing is permitted;
- rebase event;
- reserve/protocol event appropriate for social display;
- Crew event;
- future Bracket position/activity.

## Feed scopes

One stream, multiple filters:
- Following;
- Global/Live;
- Crew;
- contextual asset/game/player scopes.

No duplicated social graphs.

## Profile hierarchy

```text
Identity + Follow
Crew / verified attributes
verified performance summary
favorite/primary mode where useful
activity feed
achievements/history
technical wallet attributes only if expanded
```

Wallet address is not the user's primary identity.

---

# 6. Crews architecture

`/crews` contains:
- Following/featured Crews;
- global rankings;
- player rankings where useful;
- search/discovery;
- transparent membership/reward rules.

Crew detail contains:
- identity/description;
- members;
- verified activity;
- ranking/progress;
- membership state;
- join/leave action;
- reward/rule disclosure.

Joining a Crew never bundles a hidden wager, trade or permission.

---

# 7. Trade architecture

`/trade` defaults to a simple consumer surface.

Primary modes:
- Buy GAS;
- Sell GAS;
- Fund;
- Withdraw.

Advanced depth is optional/progressive.

## Buy/Sell decision boundary must show

- source asset;
- destination asset;
- amount;
- available balance;
- fee;
- estimated output;
- minimum received / meaningful price-impact/slippage information where applicable;
- quote validity/staleness;
- final explicit confirmation.

No manual token-contract address, RPC or chain setup in normal path.

Exit/withdraw is not intentionally hidden or made harder than Buy.

---

# 8. Account architecture

`/account` uses **financially truthful hierarchy** rather than one misleading number.

## Header

```text
AVAILABLE TO USE
$X

GAS     ...
USDC    ...
```

## Portfolio section

May include:
- spendable assets;
- locked/pending wagers with explicit state;
- future marked Bracket positions;
- pending Trade/funding/withdraw actions.

`Portfolio value` may aggregate user-owned positions only if components and valuation basis are clear.

It never includes:
- protocol ReserveVault;
- GameBankroll;
- protocol-owned liquidity as personal value.

## Account secondary sections

- Activity/history;
- Play permission and revoke;
- connected/recovery/security details;
- notifications/preferences;
- deposit/withdrawal;
- advanced wallet/technical information.

---

# 9. Reserve / rebase architecture

## Home summary

`GP19 PersonalRebaseMoment` + `GP20 ReserveTrustSurface` appear as compact state, not a DeFi dashboard.

## `/reserve`

Order:
1. coverage status + freshness;
2. GAS circulation/liability basis;
3. adjusted external reserves;
4. reserve composition;
5. backing methodology/haircuts;
6. historical change;
7. verification/assurance/audit links;
8. deeper rebase/control-law explanation.

Never count GAS/wGAS/self-issued LP side as external backing.

GameBankroll and future Bracket collateral are separate disclosures, not reserve composition.

---

# 10. Search architecture

One `/search` primitive with typed result groups:
- Players;
- Crews;
- Games;
- Activity/transactions where appropriate;
- future Bracket events/markets.

Search is reachable from every primary shell without adding another permanent mobile destination.

---

# 11. Notification architecture

Notification classes:
- round/settlement complete;
- followed player activity;
- Crew event;
- rebase upcoming/completed;
- permission nearing expiry/expired;
- Trade/funding/withdrawal state;
- future Bracket event/position.

Every notification has an exact canonical deep-link target and reconciles stale state on open.

---

# 12. Future Bracket extension

Bracket does **not** create a new account/profile/social graph.

Future routes:

```text
/markets
/markets/[event]
/positions/[id]
```

or equivalent naming finalized when Bracket enters scope.

Bracket uses:
- GP02 TruthfulUnifiedAccount;
- GP12 VerifiedEconomicObject;
- GP13 GlobalFollowingFeed;
- GP14 IdentityPerformanceCard;
- GP18 ProgressiveMarketDepth;
- GP24 BracketOutcomeCard.

Financial firewall remains:

`GAS monetary reserve ≠ GameBankroll ≠ Bracket collateral/settlement`

---

# 13. Responsive model

## Mobile
- 5-item bottom navigation;
- one-thumb primary controls;
- Play primary loop no required scroll;
- sheets for contextual secondary detail;
- safe-area aware;
- primary financial action positioned in reachable lower region.

## Tablet
- bottom nav or adaptive rail determined by Phase 7/8 breakpoint testing;
- same route/state model.

## Desktop
- top/side navigation may expose Reserve persistently;
- simultaneous context increases;
- no separate desktop account/state model;
- keyboard shortcuts permitted for safe, eligible actions.

---

# 14. Information priority rules

For every screen:

1. current canonical state;
2. user's primary decision/action;
3. financially material consequence;
4. verification/social context;
5. advanced mechanics.

Never reverse this order merely because protocol internals are technically sophisticated.
