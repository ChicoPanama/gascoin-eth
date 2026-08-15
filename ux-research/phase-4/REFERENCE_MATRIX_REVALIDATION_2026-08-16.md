# Phase 4 — Reference Matrix Revalidation

**Date:** 2026-08-16  
**Canonical matrix:** `REFERENCE_MATRIX.json`

## Result

The existing 18-law Reference Matrix remains valid against the completed Phase 2 Fomo corpus and the revalidated Phase 3 cross-category evidence. J01–J18 remain completely covered.

The matrix therefore does **not** need to be rebuilt around competitor names. Its abstraction boundary is correct: user problem → normalized law → tradeoff → GAS target.

## Evidence upgrades after Phase 3

### RM02 — `BoundedFrictionlessSession`
Existing references: Base Spend Permissions, Base Sub Accounts, high-frequency game cadence.

**Upgrade:** Hyperliquid's explicit `Don't show this again` confirmation preference independently supports the product law that repetitive confirmation friction may be reduced only after an explicit user choice. GAS still uses a stronger bounded authorization model because game spending has a known token/amount/scope.

### RM06 — `VerifiedActionableSocialObject`
Existing references: Fomo, Robinhood Social, OKX Orbit.

**Revalidated:** current Robinhood Social and OKX Orbit material independently reinforce the Fomo finding that verified economic context, identity, discussion and manual action can coexist inside one financial social object.

### RM09 — `TruthfulUnifiedPortfolio`
**Revalidated:** Kalshi's current portfolio/quick-sale model continues to separate cash, fluctuating marked/current position value, estimated executable proceeds and potential payout. The GAS law remains stronger because monetary reserve, GameBankroll and future Bracket collateral are also separate accounting domains.

### RM10/RM11 — `QuickDefaultAdvancedDepth` / `PriceProbabilityTranslation`
**Revalidated:** Polymarket and Kalshi continue to validate a simple human-facing execution path with deeper order-book/limit-order detail available progressively. Market-implied probability must not be presented as objective truth.

### RM15 — `CanonicalPendingState`
Original matrix treated this primarily as a GAS-native requirement.

**New external support:**
- Hyperliquid stale-action expiry demonstrates the importance of refusing delayed financial intent after a short validity window rather than allowing retries to execute unexpectedly later.
- Uniswap cross-chain recovery demonstrates preserving multi-step transaction state and continuing from the failed step.

**Law remains:** immediate intent acknowledgement is allowed, but canonical status stays explicit through locked/submitted/resolving/settled/failed/recoverable. Retry must be idempotent.

### RM16 — `HumanRecoveryState`
Original matrix treated this as a GAS-native requirement.

**New external support:** Uniswap error/recovery material demonstrates two useful conventions: explain the transaction state before infrastructure detail and give the smallest safe continuation/retry path. GAS keeps a stronger requirement: every financial failure message first answers whether money moved.

### RM17 — `CrossDeviceCanonicalState`
**Revalidated:** Fomo Phase 2 evidence continues to support one identity/balance/positions/social graph across mobile and web while presentation density changes by device.

## Candidate additional implementation constraint — stale intent protection

This does not need a nineteenth Phase 4 law because it is a **technical acceptance condition under RM15/RM16**:

- every money-moving intent has a unique canonical ID/non-replayable nonce;
- intent can have an explicit validity/expiry window where appropriate;
- a UI retry reconciles existing intent before creating another;
- reconnect never blindly replays a stale local action;
- user-facing recovery distinguishes `still pending`, `failed — safe to retry`, and `settled`.

## Phase 4 gate check

Every J01–J18 journey points to one or more normalized laws in `REFERENCE_MATRIX.json` containing:
- problem;
- evidence/reference or GAS-native requirement;
- law;
- why it works;
- tradeoff;
- GAS journey use;
- GAS-owned acceptance target;
- confidence.

**Result: PASS.**

Implementation phases should reference the GAS law/pattern name, not competitor names.
