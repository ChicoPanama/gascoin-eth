# PROJECT GAS — INFORMATION ARCHITECTURE

## Objective

Replace the old marketing-first gas-refund site structure with an app-first product hierarchy centered on live GAS state, Play, Trade, social discovery, and reserve transparency.

## Primary routes

```text
/
/play
/play/gas
/play/roulette
/trade
/crews
/crews/[slug]
/reserve
/me
/wallet
/verify/[roundId]
```

Secondary routes:

```text
/protocol
/protocol/docs
/protocol/audits
/protocol/contracts
/protocol/governance
/responsible-play
/settings
```

## Home `/`

### Purpose

Home is the network heartbeat, not a long explanatory landing page.

### Above the fold

1. GAS identity / price / reference state
2. next rebase countdown or status
3. reserve/backing headline
4. `PLAY GAS` primary CTA
5. `BUY GAS` secondary CTA
6. live network activity / social feed start

### Feed object types

- verified game result
- GAS buy/sell event
- rebase event
- reserve inflow/outflow/policy event
- crew milestone
- leaderboard move
- protocol announcement

Every feed item must expose its type clearly and avoid mixing wager volume with trading volume.

## Play `/play`

### Purpose

Small lobby, not a giant casino catalog.

Phase 1 cards:

1. **GAS Original** — primary / featured
2. **Roulette** — secondary

Future games remain hidden until ready.

## GAS Original `/play/gas`

### Desktop layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ NAV / BALANCE / PROFILE                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│             GAS GAUGE / RESULT ARENA             LIVE ACTIVITY       │
│                                                                      │
│      CRUISE             BOOST             REDLINE                    │
│                                                                      │
│                     WAGER CONTROLS                                   │
│                                                                      │
│                       IGNITION                                       │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ MY BETS              ALL BETS              HIGH ROLLERS              │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile layout

```text
GAS BALANCE                         PROFILE

              GAS GAUGE
              RESULT

   CRUISE       BOOST       REDLINE

              100 GAS
          1/2   2x   MAX

            [ IGNITION ]

 MY BETS      ALL BETS      HIGH ROLLERS
```

Core wager controls should fit in one viewport where safe-area constraints permit.

## Trade `/trade`

### Objective

Simple conversion, not terminal-first trading.

Default:

- Pay asset
- Receive GAS
- amount
- expected receive
- fee disclosure
- price impact / route detail when material
- confirm

Advanced chart/market detail may be expandable, not required for first trade.

## Crews `/crews`

Discovery page:

- your crew
- top crews
- trending crews
- friends/following activity
- create/join controls if enabled

Crew detail:

- identity/banner
- member count
- rank
- verified activity
- biggest hit
- streak
- top members
- recent feed
- join/share

## Reserve `/reserve`

### Objective

Make monetary trust understandable in under 30 seconds.

Headline cards:

- external reserve value
- backing ratio
- protocol-controlled liquidity
- game bankroll shown separately
- asset composition
- next/last rebase

Must visually and semantically separate:

- external backing
- GAS/wGAS liabilities
- POL
- GameBankroll
- team revenue

Detailed tables and contract links can follow below.

## Wallet / Me

Unify user identity and money state where possible.

Sections:

- GAS / wGAS / USDC balances
- game balance if separately represented
- recent activity
- wagers and results
- trade history
- referrals
- crew
- achievements/leaderboard stats
- settings
- security
- responsible-play limits/history

## Verify `/verify/[roundId]`

Result verification page/sheet includes:

- round ID
- mode
- wager asset/amount
- commitment / seed information as applicable
- randomness source
- outcome derivation
- payout
- settlement transaction
- copy/share verification link

Use progressive disclosure: plain-language verdict first, cryptographic detail second.

## Navigation rules

### Desktop

Primary nav:

`Home | Play | Trade | Crews | Reserve`

Right cluster:

`Balance | Wallet/Profile`

### Mobile

Bottom bar:

`Home | Play | Trade | Crews | Wallet`

Reserve trust status appears on Home and links to Reserve.

## Content hierarchy rules

1. action before explanation;
2. live truthful state before marketing claims;
3. plain-language summary before technical detail;
4. user balance before protocol metrics on Play;
5. risk and payout context before IGNITION;
6. repeat action before share/details after a result;
7. docs/audits/contracts remain easy to reach but do not dominate primary navigation.

## Legacy route migration

Old routes such as `/submit`, `/gates`, `/standing`, old refund dashboard, and receipt verification are not part of Project GAS primary IA.

During migration they must be:

- removed;
- redirected;
- or isolated behind legacy feature flags;

only after confirming no required reusable infrastructure is lost.
