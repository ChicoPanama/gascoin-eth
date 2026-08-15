# Phase 6 Gate — GAS Information Architecture

**Status:** PASS / CLOSED  
**Next active phase:** Phase 7 — Mobile GAS Prototype

## Gate criterion

Phase 6 passes when:
1. the product has one coherent primary navigation model;
2. canonical routes/objects are defined;
3. truthful account/portfolio semantics are defined;
4. Play/Social/Trade/Rebase/Reserve/Recovery architecture is deterministic;
5. future Bracket can join without another identity/account/social shell;
6. every J01–J18 journey has a deterministic route/state path;
7. every state/screen has one defined primary action.

## Canonical artifacts

- `INFORMATION_ARCHITECTURE.md`
- `JOURNEY_ROUTE_MAP.json`
- Phase 5 `PATTERNS.json`

## Locked shell for the prototype

### Mobile bottom navigation
1. Home
2. Play
3. Trade
4. Crews
5. Account

### Desktop primary navigation
`Home | Play | Trade | Crews | Reserve`

Utility/account cluster:
`Search | Notifications | Account`

Reserve remains a first-class trust surface on Home and a persistent desktop destination rather than consuming a sixth mobile bottom-nav slot.

## Canonical consumer routes

- `/`
- `/play`
- `/play/gas`
- `/play/roulette`
- `/trade`
- `/crews`
- `/crews/[slug]`
- `/profile/[handle]`
- `/account`
- `/reserve`
- `/search`
- `/notifications`
- `/activity/[id]`
- `/round/[id]`
- `/transaction/[id]`
- `/rebase/[id]` where addressable

Secondary docs/security/settings remain outside primary consumer navigation.

## Financial semantics locked

`Available to use` is distinct from broader user-owned portfolio value.

The UI never presents any of the following as interchangeable:
- spendable GAS/USDC;
- locked wagers;
- marked future Bracket positions;
- potential payout;
- monetary ReserveVault;
- GameBankroll;
- future Bracket collateral/settlement funds.

## Play architecture locked for Phase 7

Primary mobile loop:

`ACCOUNT -> RISK/AMOUNT -> IGNITION -> CANONICAL ACTION STATE -> RESULT -> REPLAY`

The wager/IGNITION/result loop must fit the approved primary mobile viewport without required vertical scrolling.

## Social architecture locked

One product-wide social graph and canonical activity stream. Verified protocol facts, derived statistics and user commentary are separate data concepts. A social result can configure a game but cannot submit a wager.

## Future Bracket compatibility

Bracket reuses the GAS account, identity, activity, social, notification and portfolio shell while preserving financial firewall:

`GAS monetary reserve != GameBankroll != Bracket collateral/settlement`

## Journey test

`JOURNEY_ROUTE_MAP.json` maps J01–J18 to:
- route/state sequence;
- primary action at each step;
- Phase 5 pattern contracts.

**Result: PASS.**

## Phase transition

**Phase 6: CLOSED / PASS**

**Phase 7: ACTIVE — Mobile GAS Prototype**
