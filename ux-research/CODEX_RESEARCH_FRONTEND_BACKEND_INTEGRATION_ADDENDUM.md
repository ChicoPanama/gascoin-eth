# PROJECT GAS — CODEX RESEARCH + FRONTEND/BACKEND INTEGRATION ADDENDUM

**Status:** Mandatory agent context  
**Scope:** Project GAS UX research integration, frontend/backend authority boundaries, and active Phase 8 implementation  
**Roadmap effect:** None. `ux-research/ROADMAP.md` remains the sole numbered roadmap and existing phase/gate sequencing remains authoritative.

## Purpose

This section is mandatory context for the full Project GAS Codex handoff.

Do not treat the competitive UX research as optional inspiration. Phases 2–5 already converted that research into GAS-owned product laws and implementation patterns.

The job is **not** to copy Fomo, Pump, Stake, Polymarket, Kalshi, Robinhood, OKX, Base or any other product.

The job is to understand what problems those systems solved well, preserve the relevant GAS-owned laws, and implement those laws using Project GAS architecture and branding.

---

## A. REQUIRED RESEARCH READING

Before making substantial UX, frontend, state-model or backend-integration decisions, inspect these repository artifacts.

### Phase 1 — existing frontend/backend architecture

- `ux-research/phase-1/REPO_INVENTORY.md`
- `ux-research/phase-1/COMPATIBILITY_MATRIX.json`
- `ux-research/phase-1/PR66_RECONCILIATION.md`

These files determine what should be:

- `REUSE`
- `REFACTOR`
- `EXTEND`
- `BUILD`
- `RETIRE`

Do not rebuild something simply because a competitor implements it differently.

---

## B. FOMO RESEARCH CORPUS — PRIMARY SOCIALFI REFERENCE

Phase 2 is the deepest single-product teardown in the repository.

Read:

- `ux-research/phase-2/fomo/FOMO_SOURCE_INDEX.md`
- `ux-research/phase-2/fomo/DOCUMENTED_OBSERVATIONS.json`
- `ux-research/phase-2/fomo/FOMO_PRODUCT_TECH_ARCHITECTURE.md`
- `ux-research/phase-2/fomo/FOMO_ACCOUNT_SECURITY_MODEL.md`
- `ux-research/phase-2/fomo/FOMO_TRANSACTION_UX_MODEL.md`
- `ux-research/phase-2/fomo/FOMO_SOCIAL_SYSTEM_MODEL.md`
- `ux-research/phase-2/fomo/FOMO_DESKTOP_MOBILE_PARITY.md`
- `ux-research/phase-2/fomo/FOMO_TRUST_SAFETY_MODEL.md`
- `ux-research/phase-2/fomo/FOMO_FRICTION_SIGNALS.md`
- `ux-research/phase-2/fomo/FOMO_NATIVE_VISUAL_ANATOMY.md`
- `ux-research/phase-2/fomo/FOMO_SCREEN_STATE_CATALOG.json`
- `ux-research/phase-2/fomo/FOMO_MICROINTERACTION_CATALOG.json`
- `ux-research/phase-2/fomo/FOMO_RELEASE_EVOLUTION_MATRIX.json`
- `ux-research/phase-2/fomo/FOMO_TO_GAS_MAP.md`
- `ux-research/phase-2/fomo/SOCIAL_ACTION_BENCHMARK.md`
- `ux-research/phase-2/fomo/ROUTE_STATE_MAP.md`
- `ux-research/phase-2/fomo/JOURNEY_MANIFEST.json`

The files are more authoritative than a short chat summary.

---

## C. FOMO — WHAT GAS IS ACTUALLY TAKING

Fomo’s useful product law is **not**:

- copy their feed;
- copy their cards;
- copy their colors.

The useful architecture is:

```text
CANONICAL IDENTITY
       │
       ├── balance
       ├── positions
       ├── activity
       ├── follows
       ├── performance
       ├── notifications
       └── preferences
              │
        ┌─────┴─────┐
        │           │
      MOBILE      DESKTOP
```

The important invariant is:

> Identity, relationships, economic objects and account state remain canonical even when the presentation changes.

Fomo publicly uses different frontend technology for mobile and web.

That reinforces the GAS decision:

> Do not force identical frontend implementations. Force identical canonical state semantics.

Project GAS already has a Next.js/React web substrate.

Do **not** rewrite GAS into Fomo’s frontend framework merely to imitate Fomo.

---

## D. FOMO — CROSS-DEVICE PRODUCT LAW

Desktop must not become a second application.

The same user should conceptually carry:

- identity;
- profile;
- balance;
- wallet relationships;
- positions;
- follows;
- Crew membership;
- notifications;
- preferences;
- pending financial state;

between surfaces.

For GAS:

```text
MOBILE
Home | Play | Trade | Crews | Account

DESKTOP
Home | Play | Trade | Crews | Reserve
                       +
Search | Notifications | Account
```

The layout changes.

The product ontology does not.

This is especially important during active Phase 8.

---

## E. FOMO — SOCIAL GRAPH LAW

GAS should have one social graph.

Do **not** create separate:

- Play follows;
- Trade follows;
- Crew follows;
- Bracket follows.

Canonical relationship:

```text
USER
  │
  ├── follows USER
  ├── belongs to CREW
  └── interacts with verified ACTIVITY OBJECTS
```

That same graph later spans:

- Play;
- Trade;
- Crews;
- rebase/reserve events;
- future Bracket.

---

## F. FOMO — VERIFIED ECONOMIC SOCIAL OBJECTS

Do not treat social content as ordinary text posts with numbers typed into them.

Canonical GAS activity must separate three things:

```text
PROTOCOL FACT
DERIVED PERFORMANCE
USER COMMENTARY
```

Example GAS Original activity:

```text
Activity ID
Actor ID
Round ID
Mode = REDLINE
Wager = 100 GAS
Result = 8,200 GAS
Multiplier = 82x
Settlement status = SETTLED
Timestamp
Verification/provenance
Optional player commentary
Reactions/comments
Contextual action
```

The UI may format this beautifully.

The backend must retain the authoritative fields.

User commentary must never overwrite protocol facts.

---

## G. GAS SOCIAL ACTION LOOP

Target loop:

```text
PLAY
  ↓
RESULT
  ↓
VERIFIED ACTIVITY OBJECT
  ↓
FEED
  ↓
DISCOVERY
  ↓
VIEW CONFIG
  ↓
TRY CONFIG
  ↓
EXPLICIT IGNITION
```

A social result may preconfigure:

- CRUISE;
- BOOST;
- REDLINE;

and possibly other safe settings.

It may never automatically wager.

The final money action always remains explicit.

---

## H. FOMO — PROFILE / LEADERBOARD LAW

Leaderboards are not merely scoreboards.

They are discovery mechanisms.

Target:

```text
LEADERBOARD
   ↓
PLAYER / CREW
   ↓
VERIFIED PERFORMANCE
   ↓
HISTORY
   ↓
FOLLOW / JOIN
   ↓
FUTURE FEED RELEVANCE
```

A ranking row should lead somewhere useful.

Player profile should eventually expose GAS-native information such as:

- username;
- profile identity;
- Crew;
- favorite mode;
- IGNITIONS;
- biggest verified result;
- historical performance;
- GAS activity;
- follow relationship;
- achievements.

Wallet addresses are secondary technical attributes.

Do not make raw addresses the social identity.

---

## I. FOMO — SOCIAL FEED LAW

Global activity and following activity should be different filters over one event system, not separate applications.

Conceptually:

```text
CANONICAL ACTIVITY STREAM
        │
        ├── GLOBAL / LIVE
        ├── FOLLOWING
        ├── CREW
        └── contextual asset/game filters
```

Backend event storage should not duplicate an event once for every feed.

The frontend determines the view/filter.

---

## J. FOMO — NOTIFICATION LAW

Notifications must deep-link into the exact object/state.

Bad:

> Someone played GAS.

Better:

> @PLAYER hit 82x on REDLINE  
> → `/activity/<id>`

Other examples:

- followed player result;
- Crew event;
- rebase completed;
- deposit credited;
- withdrawal state change;
- round settled;
- permission expiring;
- future Bracket event.

Notification payloads should contain canonical target/object identifiers.

---

## K. FOMO — DESKTOP LAW FOR PHASE 8

Fomo’s desktop lesson is:

> bigger screen = more simultaneous context, not more required actions.

Apply that directly to Phase 8.

Mobile Play:

```text
BALANCE
GAS GAUGE
CRUISE / BOOST / REDLINE
WAGER
IGNITION
RESULT
REPLAY
```

Desktop Play may simultaneously expose:

- round history;
- social activity;
- fairness;
- account status;
- verification;
- advanced information;

around that same loop.

Do **not** add a mandatory desktop-only step.

---

## L. FOMO — ADVANCED DEPTH LAW

Simple does not mean shallow.

Advanced tools belong behind progressive disclosure.

Pattern:

```text
DEFAULT
simple consumer action
        ↓ optional depth
ADVANCED
charts
history
fairness
raw transaction details
odds
market depth
technical data
```

Never force novice users through advanced infrastructure.

Never hide financially material information from advanced users.

---

## M. PUMP — DISCOVERY / CONVERSION RESEARCH

Pump is **not** the primary GAS social benchmark.

Pump is useful for studying:

```text
DISCOVERY
→ INTENT
→ ACTION
```

compression.

Current Pump discovery exposes changing reasons to inspect something, including categories such as:

- Movers;
- Mayhem;
- New;
- Live;
- Market Cap;
- Agents;
- Oldest;
- Last Trade.

The exact categories are Pump-specific.

Do **not** copy them literally.

The transferable law is:

> Discovery should explain why an object is relevant now.

For GAS that may eventually become:

- LIVE IGNITIONS;
- BIG HITS;
- CREW ACTIVITY;
- TRENDING MODES;
- FOLLOWING;
- REBASE EVENT;
- NEW PLAYERS;
- RESERVE EVENT;

only when backed by real data.

Do not fabricate activity simply to make the interface appear alive.

---

## N. PUMP — ACTION PROXIMITY LAW

Pump places execution very close to the context that created intent.

GAS should preserve this law.

Examples:

```text
Feed result
→ View configuration
→ Try configuration

Crew leaderboard
→ Crew profile
→ Join

GAS state
→ Buy

Rebase event
→ Inspect

future Bracket event
→ Position interface
```

Never make the user hunt through unrelated menus after intent already exists.

---

## O. PUMP — MOBILE CONSUMER LAW

Useful Pump mobile characteristics include:

- fast account entry;
- fast asset discovery;
- alerts;
- community/chat adjacency;
- economic action adjacent to discussion.

GAS translation:

- fast GAS account entry;
- fast Play discovery;
- deep-linked notifications;
- Crews/feed context;
- explicit financial action close to social intent.

Do **not** copy:

- ape language;
- memecoin visual grammar;
- pump branding;
- speculative churn incentives.

GAS has its own identity.

---

## P. PUMP — MODERATION WARNING

Pump is also an important cautionary reference.

Financial UGC + comments + livestream/community systems create moderation and provenance requirements that scale with growth.

Therefore moderation is infrastructure, not Phase-11 polish.

Future GAS social backend should support concepts such as:

- report;
- mute;
- block;
- moderation state;
- content provenance;
- rate limits;
- abuse detection;
- appeals/review state where appropriate.

Exact implementation belongs to the relevant later phase.

Do not build social interaction assuming moderation can simply be added afterward.

---

## Q. STAKE ORIGINALS — HIGH-FREQUENCY PLAY RESEARCH

Stake is the strongest current high-frequency interaction reference for the GAS Original game loop.

Transferable primitives:

- few primary controls;
- persistent wager controls;
- risk control adjacent to action;
- hotkeys;
- Instant mode;
- manual/auto separated;
- provably-fair verification available nearby;
- result → next round extremely fast.

GAS translation already chosen:

```text
CRUISE
BOOST
REDLINE
WAGER
IGNITION
```

Presentation preference:

```text
CINEMATIC
INSTANT
REDUCED MOTION
```

These modes must operate on the same canonical round state.

Instant mode must not change probability, economics or settlement.

It only removes presentation latency.

---

## R. STAKE — REPLAY LAW

Target GAS interaction:

```text
RESULT
→ IGNITION AGAIN
```

One user action.

Safe preferences may persist:

- selected risk mode;
- normal wager amount;
- presentation mode.

Dangerous temporary choices should **not** silently persist:

- MAX wager;
- unusual override;
- temporary risk exception.

---

## S. PROVABLY FAIR UX

Fairness belongs close enough to build trust without dominating the primary action.

Target:

```text
RESULT
   ├── IGNITION AGAIN
   ├── SHARE
   └── VERIFY
```

`VERIFY` should eventually lead to canonical round data.

The current prototype must **not** invent cryptographic proof.

Phase 9+ will connect real round/RNG state.

---

## T. POLYMARKET — HUMAN FIRST, MARKET DEPTH SECOND

Future Bracket interfaces should take this product law:

> Translate financial mechanics into human outcome meaning first.

Conceptually:

```text
CHIEFS WIN
63%
```

before exposing:

- order book;
- depth;
- spread;
- limit price;
- partial fill.

Advanced execution should be available.

It should not dominate the default card.

---

## U. KALSHI — PORTFOLIO TRUTH LAW

Never flatten:

```text
CASH
CURRENT POSITION VALUE
EXECUTABLE PROCEEDS
POTENTIAL PAYOUT
```

into one number.

The same applies across GAS.

Canonical categories include:

- AVAILABLE TO USE;
- GAS BALANCE;
- USDC BALANCE;
- LOCKED WAGERS;
- MARKED FUTURE POSITIONS;
- POTENTIAL PAYOUT;
- MONETARY RESERVE;
- GAME BANKROLL.

Each has different semantics.

The frontend may visually aggregate for summary purposes only if the economic distinctions remain legible.

---

## V. ROBINHOOD SOCIAL / OKX ORBIT — VERIFIED SOCIAL FINANCE

Independent research validated the same Fomo law:

> Social financial content is more trustworthy when economic activity/performance is derived from real platform data rather than screenshots or self-report.

Target GAS object therefore distinguishes:

- verified round/trade facts;
- derived historical stats;
- user-written opinion.

The action from social context remains manual.

Do not implement silent copy trading.

---

## W. BASE ACCOUNT — ACCOUNT ABSTRACTION REFERENCE

Base Account is an architecture reference, not a chain decision.

Useful capabilities include:

- Sub Accounts;
- Spend Permissions;
- batch transactions;
- gas sponsorship/paymasters;
- permission-bounded repeated actions.

Potential future GAS relationship:

```text
PRIMARY ACCOUNT
      │
      └── GAS APP / PLAY SUBACCOUNT
               │
               └── bounded spend permission
```

User permission must communicate:

- asset;
- maximum amount / allowance;
- scope;
- period;
- start;
- expiry;
- revocation.

Do not hide permission scope behind Web3 jargon.

The principle is:

> Move repeated confirmation friction to one explicit, bounded, revocable authorization boundary.

Do not implement production spend permissions in Phase 8 unless specifically required for the wallet cleanup.

Phase 9+ owns real session/authorization wiring.

---

## X. HYPERLIQUID — STALE INTENT LAW

Fast money UX introduces a specific danger:

```text
bad network
→ user taps again
→ old request wakes up
→ both execute
```

GAS must prevent this.

Every real financial intent should eventually have:

- intent/request ID;
- nonce/idempotency identity;
- creation time;
- expiry;
- canonical status;
- reconciliation behavior.

Late/stale actions should expire rather than unexpectedly execute.

This matters especially for:

- IGNITION;
- Buy GAS;
- Sell GAS;
- Withdraw;
- future Bracket order.

---

## Y. UNISWAP — RECOVERY LAW

When something fails, the first UX question is not:

> What RPC error happened?

It is:

> DID MY MONEY MOVE?

Recovery UX hierarchy:

1. Financial state.
2. Current canonical action state.
3. Safe next action.
4. Technical detail.

Example:

```text
IGNITION IS STILL RESOLVING
Your 100 GAS wager is registered.
Do not submit another wager.
Round #...
[VIEW ROUND]
```

or:

```text
IGNITION DID NOT START
No funds moved.
You can safely retry.
[TRY AGAIN]
```

Never display raw `execution reverted` as the primary recovery message.

---

## Z. AMPL — REBASE COMMUNICATION RESEARCH

Useful AMPL law:

> A proportional rebase changes visible quantity without requiring a normal transfer.

GAS must explain rebases at the personal level.

Target rebase event:

```text
GAS REBASE
+0.38%
Before
12,400 GAS
After
12,447.12 GAS
Reserve status
Last verified timestamp
[WHY DID MY BALANCE CHANGE?]
```

Exact values above are illustrative only.

Do not fabricate live values.

Deeper layer may explain:

- index;
- shares;
- controller;
- target deviation;
- reserve policy.

---

## AA. CIRCLE — RESERVE TRANSPARENCY RESEARCH

Reserve trust should not be one big number.

Target information architecture:

```text
TOTAL EXTERNAL RESERVE
composition
  ├── stable liquidity assets
  ├── approved short-duration RWA
  └── other approved external assets
required backing
insurance/liquidity floors
freshness timestamp
valuation source
assurance/audit evidence
```

Explicit exclusions:

- GAS;
- wGAS;
- self-issued LP value;
- GameBankroll;
- future Bracket collateral;

must not be represented as external GAS backing.

---

## AB. REFERENCE HIERARCHY

Do not use one competitor as the master template.

Use the strongest reference by problem.

Conceptually:

```text
SOCIAL ACCOUNT / GRAPH
Fomo

DISCOVERY → ACTION
Pump / Fomo

HIGH-FREQUENCY GAME LOOP
Stake Originals

VERIFIED SOCIAL FINANCE
Fomo / Robinhood Social / OKX Orbit

EVENT-MARKET COMPREHENSION
Polymarket

SIMPLE VS ADVANCED EXECUTION
Kalshi / Polymarket

ACCOUNT ABSTRACTION
Base Account / Privy model

RECOVERY
Uniswap + GAS-native integrity rules

STALE ACTION PROTECTION
Hyperliquid

REBASE COMMUNICATION
AMPL

RESERVE TRUST
Circle + GAS-specific firewalls
```

Then normalize into GAS patterns.

Do not mention reference brands in final user-facing code or product copy unless the product actually needs to.

---

## AC. SOURCE OF TRUTH FOR NORMALIZED UX LAWS

After understanding the reference research, implementation should defer to:

- `ux-research/reference-matrix/`
- `ux-research/phase-4/`
- `ux-research/phase-5/`

Read the current files there before implementing a major interaction.

The external research explains **why**.

The GAS Pattern Library defines **what GAS owns**.

---

## AD. FRONTEND ↔ BACKEND ARCHITECTURE LAW

Do not let React components become the authoritative financial system.

Target architecture:

```text
PRESENTATION
React / Next components
        │
        ▼
FEATURE CONTROLLER / QUERY LAYER
hooks / React Query / local presentation state
        │
        ▼
DOMAIN ADAPTER
account
game
trade
social
reserve/rebase
notifications
        │
        ▼
AUTHORITATIVE SOURCES
backend APIs
indexer
database
oracle
onchain contracts
wallet
```

A component should not independently invent financial state.

---

## AE. AUTHORITY LEVELS

Every piece of important GAS data should have an authority/provenance class.

### Canonical / authoritative

Examples later may include:

- transaction receipt;
- round settlement;
- wallet balance;
- reserve contract balance;
- rebase index;
- permission status.

### Backend/indexer derived

Examples:

- feed materialization;
- leaderboard statistics;
- historical aggregates;
- performance;
- Crew ranking;
- search indexes.

### User-authored

Examples:

- profile bio;
- comment;
- thesis;
- reaction;
- Crew description.

### Presentation/prototype

Examples:

- animation;
- loading skeleton;
- illustrative Phase-7 outcome.

The UI must never display a lower-authority value as though it were settled canonical truth.

---

## AF. SERVER-STATE MODEL

React Query is already part of the repo and should remain the standard client/server-state boundary where appropriate.

Queries should expose explicit:

- loading;
- ready;
- stale;
- degraded;
- error.

Financial actions additionally require:

- requesting;
- locking;
- locked;
- resolving;
- settled;
- reconciling;
- failed-safe-to-retry;
- failed-requires-reconciliation.

Avoid generic booleans such as:

- `isLoading`;
- `isDone`;

for complex money-moving state when the domain needs more precision.

---

## AG. ACCOUNT BACKEND / FRONTEND CONNECTION

Current target:

```text
Privy identity
      │
      ├── embedded wallet
      ├── external wallets
      └── authenticated user ID
               │
               ▼
        GAS ACCOUNT DOMAIN
               │
               ├── profile
               ├── balances
               ├── permissions
               ├── preferences
               ├── history
               └── social graph
```

Frontend identity:

> GAS username/profile

Wallet address:

> linked financial credential / asset source

not primary social identity.

Backend account records should use a canonical user/account ID and maintain wallet relationships rather than treating each wallet address as an unrelated person.

Do not silently merge accounts merely because wallets change.

---

## AH. CURRENT REPO BACKEND PRIMITIVES TO PRESERVE

Phase 1 identified reusable generic infrastructure.

Preserve/evaluate before deleting:

- auth routes;
- health routes;
- current-user / me APIs;
- public-data patterns;
- referral/invite primitives;
- RPC abstraction;
- API versioning;
- webhooks;
- Sentry;
- rate limiting;
- audit logging;
- caching;
- Supabase/storage infrastructure.

Old refund-specific domain should be isolated/retired:

- claims;
- receipt image;
- refund submission;
- refund gates;
- old standing logic;
- old receipt verification;

unless a generic utility is extracted first.

---

## AI. SOCIAL BACKEND MODEL

Do not make Feed/Profile/Notifications each store separate representations of the same economic event.

Target:

```text
CANONICAL ACTIVITY OBJECT
          │
          ├── Feed
          ├── Profile activity
          ├── Crew activity
          ├── Notifications
          ├── Search
          └── Deep link
```

Suggested conceptual fields:

```text
activityId
actorId
activityType
subject/object ID
canonical status
timestamp
source/provenance
verified fact payload
derived stats
optional commentary ID
visibility
engagement summary
contextual-action type
```

Exact database schema is a later implementation decision.

Preserve this object grammar.

---

## AJ. GAME FRONTEND ↔ BACKEND CONNECTION

Do not bind GAS Original directly to one smart-contract function from the view.

Preserve adapter separation.

Conceptually:

```text
GasOriginalView
      │
      ▼
GameController
      │
      ▼
GameAdapter
      │
      ├── createIntent
      ├── lockWager
      ├── getRound
      ├── reconcileRound
      └── verifyResult
              │
              ▼
backend / contract / RNG / indexer
```

Current Phase 7 controller uses prototype data.

Phase 9 will replace the prototype adapter.

Do not rewrite the view to make that transition.

---

## AK. GAME ACTION IDENTITY

Real IGNITION must eventually create a canonical identity such as:

- `intentId`;
- `roundId`;

before the user can ambiguously resubmit.

The frontend should acknowledge quickly:

> IGNITION RECEIVED

while canonical settlement can remain:

- LOCKING;
- RESOLVING.

The UI must distinguish:

```text
action acknowledged
≠
funds locked
≠
result settled
```

---

## AL. TRADE FRONTEND ↔ BACKEND CONNECTION

Future GAS trade should expose:

```text
QUOTE
→ USER CONFIRM
→ INTENT
→ SUBMITTED
→ PENDING
→ SETTLED
```

Quote must expose financially material fields such as:

- input;
- estimated output;
- authoritative canonical GAS router fee (bootstrap decision approved 26
  August 2026: 4% buy; 5% base sell plus 0–2% pressure; 7% maximum sell);
- price / rate;
- price impact or equivalent if relevant;
- expiry.

Backend/adapter controls quote validity and settlement.

The view should not calculate authoritative settlement by itself.

---

## AM. RESERVE / REBASE FRONTEND ↔ BACKEND CONNECTION

Reserve/rebase UI should consume a canonical read model assembled from the proper source layer.

Conceptually:

```text
contracts/oracle/custody evidence
             │
             ▼
reserve/rebase backend/indexer
             │
             ├── backing amount
             ├── composition
             ├── freshness
             ├── haircuts
             ├── required reserve
             └── rebase state
                      │
                      ▼
              Home / Reserve UI
```

Frontend must expose freshness.

Never silently render stale reserve data as current.

---

## AN. NOTIFICATION FRONTEND ↔ BACKEND CONNECTION

Notifications are references to canonical objects.

Example backend notification:

```text
notificationId
recipientId
type = ROUND_SETTLED
targetType = ROUND
targetId = <roundId>
actorId
createdAt
readAt
```

Frontend:

```text
notification
→ /round/<id>
```

Do not encode the entire truth only inside notification copy.

The target object remains authoritative.

---

## AO. SEARCH FRONTEND ↔ BACKEND CONNECTION

Unified GAS search eventually spans:

- users;
- Crews;
- games;
- activity;
- transactions;
- future Bracket markets.

Search result should carry typed destination metadata.

Do not force the frontend to infer destination from string content.

Conceptually:

```json
{
  "type": "player",
  "id": "...",
  "route": "/profile/..."
}
```

---

## AP. FRONTEND OPTIMISTIC UX RULE

The interface may optimistically acknowledge that an action was received.

It must not optimistically claim that money has settled.

Allowed:

> IGNITION RECEIVED

Not allowed before confirmation:

> YOU WON 8,200 GAS

if canonical settlement has not occurred.

Use optimistic UX only within the authority level actually known.

---

## AQ. FRONTEND FAILURE RECOVERY

Every money-moving UI should be able to render at least:

- safe to retry;
- not safe to retry yet;
- still pending;
- settled;
- reconciled failure.

If finality is unclear:

> RECONCILE FIRST

Do not perform a blind second action.

---

## AR. FRONTEND DESIGN SYSTEM CONNECTION

Existing repo design primitives should be reused.

Phase 1 identified:

- `tokens.css`;
- `globals.css`;
- IBM Plex Sans;
- IBM Plex Mono;
- Bebas Neue;
- theme variables;
- responsive utilities;
- reduced-motion support.

New GAS feature styles should increasingly live in scoped GAS modules/tokens rather than expanding legacy `globals.css` forever.

Do not perform a wholesale CSS rewrite simply for cleanliness.

Migrate incrementally behind verified routes/tests.

---

## AS. CURRENT BACKEND COMPONENTS ARE NOT ALL LEGACY

Do not confuse:

> old product

with:

> old infrastructure

Some mature infrastructure from GASCOIN may be stronger than a new implementation.

Retain reusable:

- observability;
- rate limits;
- webhook patterns;
- server auth;
- cache infrastructure;
- API conventions;
- error handling;
- testing infrastructure;
- responsive shell primitives;

while retiring refund-domain semantics.

---

## AT. PHASE 8 DESKTOP ADAPTATION MUST USE THIS RESEARCH

During the active desktop phase, specifically apply:

### Fomo

- same account;
- same identity;
- same state;
- more simultaneous context;
- desktop is not a second terminal-only product.

### Pump

- discovery is dynamic;
- intent should have nearby action.

### Stake

- primary Play controls remain compact;
- Instant/hotkey behavior may improve desktop speed.

### Trading references

- advanced data may expand on desktop;
- simple consumer execution remains primary.

Therefore desktop GAS should not become:

```text
chart
order book
ten metrics
wallet controls
RPC controls
then maybe Play somewhere
```

The primary action hierarchy remains:

```text
GAS GAUGE
RISK
WAGER
IGNITION
```

Extra context surrounds the action.

It does not displace it.

---

## AU. RESEARCH MUST BE TRACEABLE TO IMPLEMENTATION

When implementing a meaningful UX behavior derived from research, be able to state:

```text
USER PROBLEM
→ REFERENCE LAW
→ GAS PATTERN
→ EXISTING REPO SURFACE
→ IMPLEMENTATION
→ ACCEPTANCE TEST
```

Example:

```text
Problem:
Returning user wants another round immediately.

Reference:
Stake high-frequency replay.

GAS pattern:
OneActionReplay.

Repo surface:
GasOriginal controller/view.

Implementation:
Settled result retains safe wager/mode and exposes IGNITION AGAIN.

Acceptance:
One click from result to next valid wager.
```

This is how research should enter code.

Not:

> Fomo does this, so add it.

---

## AV. REQUIRED RESEARCH-INTEGRATION CHECK BEFORE PHASE 8 PASS

Before Phase 8 closes, perform a review against:

- `ux-research/phase-2/fomo/FOMO_DESKTOP_MOBILE_PARITY.md`;
- `ux-research/phase-2/fomo/FOMO_TO_GAS_MAP.md`;
- `ux-research/phase-3/CROSS_CATEGORY_FINDINGS.md`;
- `ux-research/phase-3/PHASE_3_REVALIDATION_2026-08-16.md`;
- `ux-research/reference-matrix/REFERENCE_MATRIX.md`;
- GAS Pattern Library (`ux-research/phase-5/GAS_PATTERN_LIBRARY.md`);
- Phase 1 compatibility matrix (`ux-research/phase-1/COMPATIBILITY_MATRIX.json`);
- Phase 6 information architecture (`ux-research/phase-6/GAS_INFORMATION_ARCHITECTURE.md`).

Confirm:

- desktop preserved mobile ontology;
- social/account state remains canonical;
- Play primary action remains dominant;
- advanced depth remains progressive;
- no fake activity exists;
- financial semantics remain truthful;
- backend/frontend authorities are clear;
- no legacy refund ontology re-entered.

Only then may the Phase 8 gate pass.

---

## AW. CODEX REQUIRED FIRST RESEARCH ACTION

Before continuing Phase 8 implementation:

1. Read the Fomo research files listed above.
2. Read Phase 3 cross-category findings and revalidation.
3. Read Phase 1 compatibility matrix.
4. Read Phase 6 information architecture.
5. Inspect current GAS components and APIs.
6. Create an **internal** implementation map:

```text
research law
→ GAS pattern
→ current file/component/API
→ gap
```

Do not create a new roadmap document.

Use the existing phase/gate system.

Then continue the active wallet-cleanup / Phase-8 work from the live branch.

---

## AX. FINAL PRODUCT PRINCIPLE

All research converges on one GAS rule:

> **Maximum sophistication underneath. Minimum cognitive load above.**

Underneath GAS may eventually include:

- elastic monetary mechanics;
- reserve accounting;
- oracles;
- wallet abstraction;
- permissions;
- RNG;
- game bankroll;
- social event indexing;
- trading;
- future Bracket markets;
- multiple asset types.

The normal user should experience:

```text
Enter GAS
Know what I have
Know what is happening
Play / Trade / Connect
See what happened
Share / Follow / Repeat
```

without learning the infrastructure first.

Do not simplify by hiding financial truth.

Simplify by making the infrastructure do its job.
