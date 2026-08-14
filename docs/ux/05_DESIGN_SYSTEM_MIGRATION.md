# PROJECT GAS — DESIGN SYSTEM MIGRATION

## Objective

Preserve the strongest existing GASCOIN visual/interaction system, then retune it for Project GAS rather than introducing a generic new Web3 theme.

## Existing foundation to retain

Current `app/tokens.css` already establishes:

- pure-black dark canvas;
- off-white primary text;
- discrete X-like gray hierarchy;
- card and hover surfaces;
- semantic status colors;
- glass tokens;
- spacing scale;
- Bebas display type;
- IBM Plex Sans body;
- IBM Plex Mono technical/label type;
- fluid typography;
- motion timing tokens;
- reduced-motion fallback;
- light-mode token overrides.

These are valuable and should remain the starting point.

## New GAS visual signature

Target feeling:

**industrial instrument panel + premium fintech + live social network**

Avoid:

- generic purple/blue Web3 gradients;
- slot-machine chrome;
- faux-retro gas-station kitsch;
- excessive glassmorphism;
- dense Bloomberg-terminal defaults.

## Palette direction

### Core

- `GAS Black` — main canvas
- `Instrument Off-White` — primary text
- `Steel Gray` — structure / secondary state
- `Gas Amber` — primary active brand energy / IGNITION
- `Signal Green` — positive/confirmed state
- `Signal Red` — loss/error/high-risk state

### Important rule

REDLINE cannot rely only on red for meaning. Mode/risk must also be communicated with labels, shape, position, and distribution graphics.

## Proposed semantic tokens

Do not hard-code these until contrast/brand testing is completed, but add semantic roles:

```css
--gas-energy
--gas-energy-strong
--gas-energy-soft
--gas-gauge-track
--gas-gauge-safe
--gas-gauge-hot
--gas-gauge-redline
--gas-live
--gas-profit
--gas-loss
--gas-reserve
--gas-game-bankroll
--gas-rebase-positive
--gas-rebase-negative
```

Reuse current neutral and status tokens wherever possible instead of duplicating colors.

## Typography

Retain:

- Bebas Neue for large numeric/brand display moments where legibility holds;
- IBM Plex Sans for primary UI/body;
- IBM Plex Mono for balances, round IDs, labels, metrics, verification detail.

Do not use display type for dense controls or long text.

## GAS Gauge visual language

The Gauge is a system-level brand component.

States:

- idle / mode preview;
- committing;
- resolving;
- win;
- loss;
- exceptional hit;
- degraded/delayed;
- reduced motion.

Gauge design must:

- work on black background;
- scale from ~300px mobile width to desktop hero size;
- remain readable without glow;
- avoid misleading physics implying live random determination by the visible needle;
- allow exact numeric result to dominate after settlement.

## Buttons

### Primary

`IGNITION`

- strongest visual weight in Play;
- GAS amber / energy treatment;
- large mobile touch target;
- distinct pending/locked state;
- never changes position between rounds.

### Secondary

- Buy GAS
- Share
- Verify
- Join Crew
- Reserve details

Secondary buttons must not compete with IGNITION on Play.

## Cards

Existing glass-card approach can survive but should become less decorative on high-frequency surfaces.

Use cards for:

- social result object;
- reserve summary;
- crew summary;
- profile metric group;
- protocol warning.

Avoid boxing every line item.

## Navigation migration

Existing `HomeNav` is a reusable shell but its link model is obsolete.

Replace legacy primary links:

- How It Works
- Submit
- Treasury
- Leaderboard
- Standing
- Gates
- Tracker

with:

- Home
- Play
- Trade
- Crews
- Reserve

Wallet/Profile remains an action cluster.

Mobile should move toward fixed bottom navigation for primary app surfaces rather than only a collapsed hamburger.

## Motion system

Retain Framer Motion / existing animation primitives.

Define motion classes:

1. **Navigation motion** — subtle and fast.
2. **Network motion** — feed insertions/ticker, restrained.
3. **Game anticipation motion** — deliberate, short.
4. **Result motion** — outcome emphasis.
5. **Exceptional-hit motion** — rare stronger effect.

Never make routine navigation wait for cinematic animation.

## Reduced motion

Existing reduced-motion global fallback is a good base.

GAS-specific components must additionally define intentional reduced-motion states rather than relying only on near-zero animation duration.

## Icons

Move away from arbitrary Unicode glyphs as core navigation semantics when implementation begins.

Use a consistent icon set already compatible with the stack, with accessible text labels where ambiguity exists.

The brand `G` mark may remain a first-class identity element.

## Data visualization

Reserve/trade charts should be precise and restrained.

Game risk graphics are not financial charts and should be visually distinct.

Never use the same green/red treatment for:

- investment price movement;
- game win/loss;
- reserve health;

without accompanying semantic labels.

## Mobile tokens

Define explicit safe-area and touch spacing variables:

```css
--safe-top
--safe-bottom
--mobile-nav-height
--play-control-gap
--touch-target-min
```

Core Play must be tested against real viewport heights, not only widths.

## Component migration strategy

### Reuse/refactor

- `HomeNav`
- wallet/auth buttons
- theme provider/toggle
- mobile menu infrastructure where useful
- Hero/ScrollReveal primitives only where they do not slow app use
- leaderboard/community/referral infrastructure
- dashboard data-card patterns
- global error and provider shells

### Replace

- old refund hero copy/layout
- receipt CTA hierarchy
- receipt verification/gates UI as primary product surfaces
- old navbar destinations

### New primitives

- `GasGauge`
- `IgnitionButton`
- `RiskSelector`
- `WagerControls`
- `GameResultCard`
- `LiveActivityTape`
- `RebaseClock`
- `ReserveMeter`
- `BackingBreakdown`
- `CrewIdentityCard`
- `ProvablyFairSheet`
- `MobileBottomNav`

## Accessibility acceptance

- all text meets contrast targets;
- amber primary states remain readable in light and dark modes;
- no critical state relies on glow/color alone;
- focus ring is visible over black/amber surfaces;
- gauge has textual equivalent;
- touch targets and spacing work on compact phones;
- reduced-motion state is intentionally designed.
