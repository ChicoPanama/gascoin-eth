# Phase 7 Gate — Mobile GAS Prototype

**Status:** ACTIVE / NOT PASSED  
**Predecessor:** Phase 6 — PASS / CLOSED

## Objective

Build and verify the first coherent mobile-first Project GAS prototype using the existing GAS React/design-system bones and the canonical Phase 5 pattern contracts / Phase 6 IA.

Required loop:

`SIGN IN -> TRUTHFUL ACCOUNT -> PLAY -> CRUISE/BOOST/REDLINE -> WAGER -> IGNITION -> CANONICAL ACTION STATE -> RESULT -> REPLAY`

## Current implemented surface

### Shell / identity
- Project GAS root Home
- five-destination mobile nav: Home / Play / Trade / Crews / Account
- Search + Notifications utilities
- Reserve one action from Home
- legacy GASCOIN footer/chat suppressed on Project GAS routes
- GAS root metadata/PWA identity
- consumer-first Privy email path + transition legacy auth methods

### GAS Original
- `/play`
- `/play/gas`
- GAS Gauge
- CRUISE / BOOST / REDLINE selector
- GAS/USDC wager composer + safe presets
- IGNITION
- validating -> committing -> locked -> resolving -> result
- Cinematic / Instant / Reduced presentation modes
- settled result -> `IGNITION AGAIN`
- result copy + round verification
- canonical `/round/[id]` route

### Truth / safety
- explicit `prototype / no funds / no live RNG` boundary
- no fabricated reserve ratio/rebase countdown
- no fabricated social activity, crews, rankings or notifications
- canonical request/round IDs
- stale-intent expiry model
- reconcile-before-retry model
- blind retry only when authoritative state says no wager/funds moved
- verified activity contract separating protocol facts and user commentary

### Supporting prototype routes
- `/trade`
- `/crews`
- `/account`
- `/reserve`
- `/search`
- `/notifications`

### Tests
- Project GAS canonical game-state unit tests
- verified live-event unit tests
- rewritten Project GAS Home Playwright tests
- new Project GAS mobile journey Playwright tests

## Gate requirements

Phase 7 passes only when all are true:

1. **Build/unit/E2E:** current `ux-lab` head passes repository CI.
2. **Primary viewport:** core Play loop is usable at 390×844.
3. **Reachability:** risk, amount, IGNITION and settled replay action are reachable without unnecessary scroll; no horizontal overflow.
4. **Replay:** settled result -> next round is one intentional action.
5. **Risk control:** CRUISE/BOOST/REDLINE switch in one action and retain safe wager amount.
6. **State truth:** UI visibly distinguishes ready/locking/locked/resolving/settled/recovery state.
7. **Presentation independence:** Cinematic/Instant/Reduced modes use identical canonical round/result state.
8. **Prototype boundary:** no real-money/RNG/reserve/social claim can be mistaken for live protocol state.
9. **Consumer entry:** ordinary sign-in path does not require RPC/chain configuration knowledge.
10. **Accessibility:** selected state is programmatic, critical state not color-only, reduced-motion mode works, primary targets meet prototype touch-size requirements.
11. **Legacy interference:** old footer/chat/navigation do not overlap the Project GAS mobile shell.
12. **Known limitations:** anything not yet wired to protocol truth is explicitly unavailable/prototype-labeled.

## Verification evidence required before PASS

- successful current-head GitHub Actions run;
- Playwright Project GAS tests green;
- mobile viewport geometry/reachability assertion for IGNITION and result/replay controls;
- no critical console/page errors on core routes;
- final Phase 7 limitations list.

## Current blocker

GitHub Actions runs are currently queued behind prior `ux-lab` PR runs. No failing current-head verification boundary has been observed yet. The phase remains ACTIVE until an authoritative green run exists.

**Do not activate Phase 8 before this file is updated to PASS.**
