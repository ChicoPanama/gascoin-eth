# GAS UX Pattern Library

**Phase:** 5  
**Canonical machine-readable contracts:** `PATTERNS.json`

## Purpose

This library is the boundary between research and implementation.

From this phase forward, implementation requirements use **GAS pattern names/IDs**, not competitor names. A developer should be able to build the GAS product without knowing which external product originally contributed evidence to a law.

The library preserves three things simultaneously:

1. consumer simplicity;
2. protocol/financial truth;
3. measurable acceptance criteria.

## Pattern families

### Account & security
- `GP01 ConsumerAccountEntry`
- `GP02 TruthfulUnifiedAccount`
- `GP03 BoundedPlayPermission`
- `GP04 SensitiveActionStepUp`
- `GP05 ContextualOnboarding`

### Play
- `GP06 RiskModeSelector`
- `GP07 WagerComposer`
- `GP08 IgnitionControl`
- `GP09 CanonicalActionState`
- `GP10 DualSpeedPresentation`
- `GP11 ResultActionRail`

### Social
- `GP12 VerifiedEconomicObject`
- `GP13 GlobalFollowingFeed`
- `GP14 IdentityPerformanceCard`
- `GP15 CrewMembershipCard`
- `GP16 ContextPreservingDrilldown`

### Trade / market
- `GP17 QuickTradeSheet`
- `GP18 ProgressiveMarketDepth`

### Monetary trust
- `GP19 PersonalRebaseMoment`
- `GP20 ReserveTrustSurface`

### Recovery / re-entry
- `GP21 HumanRecoveryNotice`
- `GP22 UnifiedDiscovery`
- `GP23 DeepLinkedNotification`

### Future Bracket
- `GP24 BracketOutcomeCard`

---

# Universal GAS pattern rules

These apply to every pattern even when not repeated in the individual contract.

## U1 — One primary action
Every screen/state has one visually dominant next action. Secondary actions may exist, but should not compete with the decision the user came to make.

## U2 — Immediate acknowledgement, honest finality
A tap may acknowledge immediately. It may not claim financial/game settlement before the canonical state confirms it.

## U3 — Consumer language first
Normal users should not need to understand RPCs, chain IDs, nonce mechanics, wallet connector taxonomy or internal accounting domains to complete ordinary flows.

Technical details remain available where they affect security, custody, recovery, verification or advanced users.

## U4 — Financial semantics never collapse
The UI may create one coherent account mental model, but it must never imply equality between:
- spendable GAS/USDC;
- locked wager;
- marked position value;
- potential payout;
- GameBankroll;
- monetary ReserveVault;
- future Bracket collateral.

## U5 — Bounded authorization
Convenience never justifies invisible scope expansion. Any persistent financial permission has explicit token/scope/expiry and a revocation path.

## U6 — Safe preference memory
May persist:
- normal wager amount within policy;
- CRUISE/BOOST/REDLINE preference;
- Instant/Cinematic/Reduced Motion preference;
- benign filters/timeframes.

Must not silently persist:
- MAX;
- one-time permission expansion;
- sensitive approval;
- unsafe exceptional overrides.

## U7 — Retry means reconcile first
A user asking to retry does not automatically mean “submit another transaction.” GAS reconciles the existing canonical intent first.

## U8 — Social facts vs commentary
Verified protocol activity, derived statistics and user-authored commentary are separate fields in the data model and separate visual concepts.

## U9 — No fake activity
Live feeds, player counts, wins, treasury metrics and network status must derive from real canonical or explicitly labeled simulated/test data.

## U10 — Exit parity
Sell/withdraw/leave/revoke paths must be discoverable and understandable. GAS does not deliberately make exits harder than entries.

## U11 — Progressive disclosure
Advanced probability math, reserve composition, rebase control law, order-book depth and verification data should be available without dominating the primary consumer action.

## U12 — Accessibility is state architecture
Important state cannot be communicated by color only. Patterns define programmatic selected/pending/disabled/error state and support reduced motion.

---

# Core compositional flows

## Core Play composition

Phase 1 player entry is fixed to USDC. `GP07` collects the USDC entry amount; the authoritative game adapter/router sources or credits GAS invisibly; the locked wager, bankroll liability and payout remain GAS-native. Direct player-facing GAS entry is superseded.

```text
GP01 ConsumerAccountEntry
        ↓
GP02 TruthfulUnifiedAccount
        ↓
GP03 BoundedPlayPermission
        ↓
GP07 WagerComposer
   ├── GP06 RiskModeSelector
   └── GP10 DualSpeedPresentation preference
        ↓
GP08 IgnitionControl
        ↓
GP09 CanonicalActionState
        ↓
GP11 ResultActionRail
        ├── Replay → GP08
        ├── Share → GP12 VerifiedEconomicObject
        └── Verify → canonical round detail
```

## Social replay composition

```text
GP13 GlobalFollowingFeed
        ↓
GP12 VerifiedEconomicObject
        ↓
GP16 ContextPreservingDrilldown
        ↓
GP14 IdentityPerformanceCard
        ├── Follow
        └── Result/config
               ↓
        GP07 WagerComposer
               ↓
        explicit GP08 IGNITION
```

The social object may configure a game. It never submits a wager.

## Trade composition

```text
Account / Home / Discovery
        ↓
GP17 QuickTradeSheet
        ├── simple path
        └── GP18 ProgressiveMarketDepth
        ↓
GP04 SensitiveActionStepUp (only when policy requires)
        ↓
GP09 CanonicalActionState
        ↓
GP02 TruthfulUnifiedAccount
```

## Rebase / reserve composition

```text
Home
 ├── GP19 PersonalRebaseMoment
 └── GP20 ReserveTrustSurface
          ↓
      one-level deeper verification/detail
```

## Recovery composition

```text
any money-moving action
        ↓
GP09 CanonicalActionState
        ↓ interruption/failure
GP21 HumanRecoveryNotice
        ↓
reconcile / retry-safe / reauthorize / settled
```

---

# Existing repo mapping rule

`PATTERNS.json` includes `repoMapping` and `action` for each pattern:

- `REUSE` — keep implementation substantially intact;
- `REFACTOR` — keep technical primitive, replace semantics/IA;
- `BUILD` — no adequate existing GAS surface;
- combined values indicate a new GAS pattern built on an existing primitive.

Phase 5 does **not** yet change production UI. It provides the implementation contract that Phase 6 IA and Phase 7+ code must reference.

---

# Required implementation notation

New GAS UX code/spec work should annotate the relevant pattern where practical, e.g.:

```text
Play page
- GP06 RiskModeSelector
- GP07 WagerComposer
- GP08 IgnitionControl
- GP09 CanonicalActionState
- GP10 DualSpeedPresentation
- GP11 ResultActionRail
```

This prevents later agents from re-litigating basic interaction architecture or returning to competitor-specific instructions.

---

# Change control

A pattern can change when:
1. protocol truth changes;
2. user testing disproves the pattern;
3. a stronger reference/measurement produces a better law;
4. accessibility/security review requires a change.

A pattern does **not** change merely because a different product becomes fashionable.

Any change must preserve its linked canonical journeys and update acceptance criteria.
