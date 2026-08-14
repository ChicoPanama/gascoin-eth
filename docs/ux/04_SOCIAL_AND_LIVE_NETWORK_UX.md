# PROJECT GAS — SOCIAL + LIVE NETWORK UX

## Purpose

The game itself should function as a social network around GAS.

The objective is not to bolt chat onto a casino. The objective is to make **real protocol and player activity discoverable, attributable, shareable, and actionable**.

## Core social loop

```text
PLAY
  -> VERIFIED RESULT
  -> RESULT CARD / FEED
  -> DISCOVERY BY ANOTHER USER
  -> TRY THIS MODE
  -> EXPLICIT WAGER + IGNITION
  -> NEW VERIFIED RESULT
```

## Home activity feed

Feed object types:

### Game Result

Fields:

- profile / display identity;
- game;
- CRUISE / BOOST / REDLINE;
- wager asset and amount;
- multiplier;
- payout delta;
- timestamp;
- verification state;
- reactions/comments if enabled;
- `TRY MODE` CTA.

### Trade

Fields:

- profile if user opted to expose social trading activity;
- BUY / SELL;
- GAS amount / quote amount;
- timestamp;
- optional price/PnL context.

### Rebase

Fields:

- rebase direction/amount;
- index before/after;
- timestamp;
- backing context;
- protocol link.

### Reserve Event

Fields:

- external asset added/removed/rebalanced;
- USD value;
- resulting backing ratio;
- source transaction / governance reference.

### Crew Milestone

Examples:

- rank change;
- verified total ignitions milestone;
- verified biggest hit;
- streak;
- member milestone.

## Feed filters

Candidate filters:

- For You / Following
- Live
- Big Hits
- Crews
- Protocol

Do not launch with too many filters. Default should be a useful mixed feed.

## Result cards

A result card is the primary social object.

### Required

- identity;
- mode;
- wager;
- result/payout;
- time;
- `TRY THIS MODE`;
- Verify.

### Optional

- comment;
- reaction count;
- crew identity;
- streak;
- achievement badge.

### Privacy

- use profile identity where possible rather than raw full wallet;
- wallet address exposure should follow user/privacy settings;
- sharing a result must not expose unrelated balances or private transaction metadata.

## Profiles

Profile should answer:

- who is this user?
- what do they play?
- what crew are they in?
- what verified performance/activity is visible?
- can I follow them?

Metrics must be clearly labeled and not mix:

- handle;
- wins;
- losses;
- net P/L;
- biggest hit;
- total ignitions;
- GAS holdings if voluntarily public.

Avoid vanity metrics that imply skill where the metric is mostly wager size.

## Crews

Crews are competitive social groups.

### Crew card

- name / image;
- member count;
- rank;
- activity trend;
- biggest verified hit;
- short identity/tagline.

### Crew page

- rank;
- members;
- 24h/7d verified activity;
- total ignitions;
- handle where appropriate;
- biggest hit;
- streak;
- top members;
- recent feed;
- join/share.

### Crew leaderboard

Rank formulas must be defined explicitly and resistant to trivial wash-volume gaming.

Potential ranking categories should remain separate:

- activity;
- verified net performance;
- largest hit;
- participation streak;
- social growth.

Never collapse these into one opaque number without documented weighting.

## Leaderboards

Candidate boards:

- Biggest Hits — 24h / 7d / all-time
- Most Active — verified ignitions
- Crew Rankings
- Streaks

If net P/L leaderboards are used, define realized/unrealized semantics precisely.

## Live activity tape

Desktop can expose a compact tape adjacent to Play:

```text
IGNITION   250 GAS   BOOST     2.81x
BUY        $4,200    GAS       @ price
IGNITION    80 GAS   REDLINE   0x
REBASE     +0.42%    protocol
IGNITION   500 GAS   REDLINE   31.2x
RESERVE    +$84,921  USDC
```

Mobile can expose a collapsed ticker / drawer.

### Truth requirement

Only verified/authoritative data enters the live tape. If the indexer is degraded, show a degraded-state badge and pause rather than inventing continuity.

## Notifications

Candidate notifications:

- someone followed you;
- result reaction/comment;
- crew milestone;
- crew invitation;
- rank movement;
- protocol/rebase event;
- settlement issue requiring attention.

Avoid manipulative "someone just won, play now" push notifications unless compliant with applicable responsible-gaming requirements and user preferences.

## Referrals

Referral UX should be social infrastructure, not spam infrastructure.

Expose:

- referral link/code;
- verified referred users;
- reward state;
- eligibility rules;
- anti-abuse status;
- payout history.

Exact economics remain protocol OPEN until approved.

## Real-time architecture implications

The UX assumes an indexed event layer capable of powering:

- live game results;
- trade events;
- reserve events;
- rebase events;
- crew aggregation;
- leaderboards.

The UI layer must distinguish:

- authoritative on-chain event;
- indexed/derived metric;
- social user-generated content.

## Anti-manipulation principles

- no fake counters;
- no fake recent wins;
- no fake online-user counts;
- no undisclosed paid/promoted social activity;
- protect ranking algorithms from volume-only gaming;
- expose verification for economically meaningful claims.

## Acceptance tests

- verified result appears in live activity after indexing target latency;
- result card deep-links to correct mode without auto-wagering;
- Verify opens correct round;
- privacy settings prevent unwanted wallet disclosure;
- feed handles empty/degraded states cleanly;
- crew and leaderboard metrics match documented formulas;
- mobile social layer does not obscure the core Play controls.
