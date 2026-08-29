# Phase 2 — Fomo Public Research Saturation Check

**Status:** PUBLIC/DOCUMENTED LANE SATURATED FOR CURRENT PASS  
**Important:** **Phase 2 itself remains ACTIVE / NOT PASSED.** Direct user-driven capture M01–M18 is still pending.

## What “saturated” means here

The research has reached diminishing returns from additional ordinary web search over current public Fomo material. Major current first-party UX surfaces, product updates, published visuals, store state, public technical disclosures, terms/risk constraints and outside validation have been indexed and normalized.

It does **not** mean:
- the live app has been fully measured;
- authenticated states are known;
- exact geometry/timing is known;
- failure/pending states are known;
- current historical conflicts have been resolved;
- Phase 2 gate is passed.

## Public evidence coverage

### Account/onboarding — SATURATED DOCUMENTED / VISUAL
Covered:
- consumer sign-in hierarchy;
- embedded/non-custodial wallet model;
- gas sponsorship;
- Apple Pay/debit/crypto funding;
- biometric sensitive-action protection;
- cross-device identity/balance/social continuity.

Remaining live questions: M11/M12/M16.

### Mobile navigation / Home / Search — SATURATED DOCUMENTED / VISUAL
Covered:
- five-destination bottom shell in published guide imagery;
- Home account/funding/discovery hierarchy;
- Search supports tokens and users;
- historical filter evolution.

Remaining live questions: M04/M05/M06 and current-state conflict register.

### Feed / SocialFi — SATURATED DOCUMENTED / VISUAL
Covered:
- global/following/Friends concepts;
- feed economic-event grammar;
- high-activity scan redesign;
- thesis/comments/reactions;
- PnL/balance context;
- profile/follow relationship;
- token/profile/leaderboard/social graph integration;
- social graph expansion into perpetuals.

Remaining live questions: M01/M03/M07/M15.

### Leaderboard / profile / performance — SATURATED DOCUMENTED / VISUAL
Covered:
- Friends + Leaderboard shared destination;
- self-rank before global rankings;
- 24h/7d/30d/All historical timeframe controls;
- profile identity/Follow/social/behavioral stats;
- performance chart;
- Cash balance separate from Open positions;
- position transaction drilldown.

Remaining live questions: M02/M08/M09.

### Transaction / Buy / Sell — SATURATED DOCUMENTED / VISUAL
Covered:
- unified USD balance;
- dollar presets;
- slide-to-buy detailed flow;
- fee/risk context evolution;
- transaction simulation toggle;
- balance at decision point;
- Buy Again/Sell Again iteration;
- gas sponsorship;
- portfolio/PnL update after execution;
- current contractual service fee floor (0.50%, $0.95 minimum).

Remaining live questions: M03/M10/M14 and exact fee/slippage/current gesture state.

### Funding / withdrawal — SATURATED DOCUMENTED
Covered:
- Apple Pay/debit/crypto deposit paths;
- bank/crypto withdrawal docs;
- network/address correctness;
- QR withdrawal historical feature;
- step-up authentication;
- public friction hypotheses.

Remaining live questions: M12/M13/M14.

### Notifications — SATURATED DOCUMENTED / VISUAL
Covered:
- master enabled state;
- Price/Friends/Trending/Top Traders/Announcements/New Followers families;
- Friends trade-size/per-user customization;
- price-since-entry/deposit signals;
- cross-device notification-setting continuity.

Remaining live questions: M15/M16 and notification deep-link behavior.

### Trust/safety — SATURATED DOCUMENTED
Covered:
- verification badge;
- volatility/scam/honeypot warnings;
- unlocked-liquidity/spoofing warnings;
- transaction simulation;
- external Telegram warning;
- biometric security;
- content moderation on social transfers;
- liquidity/holders/slippage education.

Remaining live questions: M10/M13/M18.

### Desktop web — SATURATED DOCUMENTED / VISUAL
Covered:
- left discovery rail;
- global search;
- large TradingView workspace;
- social chart overlays;
- lower Holders/Trades/Thesis context;
- persistent right execution rail;
- same account/social state as mobile;
- explicit non-terminal product philosophy.

Remaining live questions: M16/M17.

### Public frontend/product architecture — SATURATED CURRENT DISCLOSURE
Covered from Fomo Labs public hiring:
- mobile = Expo;
- web = React Router + Vite;
- backend services = TypeScript;
- social/new order types/new asset classes planned as extensions to existing product surfaces;
- brand/design system intentionally documented/evolved.

No proprietary implementation details were sought or inferred.

### Current-store freshness — CHECKED
Apple indexed store state as of the refresh shows:
- version 1.81.0 as latest visible release, about six days old;
- continued dense bug/performance release cadence through July/August;
- no detailed new feature notes in those releases.

Fomo's public blog index has no indexed July/August product-feature recap after June 2026.

**Implication:** current live UI must be treated as potentially newer than the feature blog/screenshots.

## Public evidence artifacts now available

- `FOMO_SOURCE_INDEX.md`
- `FOMO_NATIVE_VISUAL_ANATOMY.md`
- `FOMO_RELEASE_EVOLUTION_MATRIX.json`
- `FOMO_ACCOUNT_SECURITY_MODEL.md`
- `FOMO_SOCIAL_SYSTEM_MODEL.md`
- `FOMO_TRANSACTION_UX_MODEL.md`
- `FOMO_DESKTOP_MOBILE_PARITY.md`
- `FOMO_TRUST_SAFETY_MODEL.md`
- `FOMO_MICROINTERACTION_CATALOG.json`
- `FOMO_CURRENT_STATE_CONFLICTS.md`
- `FOMO_SCREEN_STATE_CATALOG.json`
- `FOMO_EXTERNAL_VALIDATION.md`
- `FOMO_PRODUCT_TECH_ARCHITECTURE.md`
- `FOMO_FRICTION_SIGNALS.md`
- existing route/journey/documented-observation/GAS-map artifacts.

## What remains genuinely high-value

Additional generic web searching is now lower value than direct ordinary-use capture.

The remaining high-value unknowns are exactly the M01–M18 tasks:
- current live labels/IA;
- current authenticated actions;
- tap/action counts;
- current card/row anatomy;
- exact user-driven transition timings;
- published-vs-live geometry;
- context restoration;
- current quote/fee/risk display;
- pending/error/recovery states;
- cross-device parity;
- accessibility.

## Gate discipline

**Do not interpret this file as a Phase 2 PASS.**

It only closes the **public research lane** for this pass. The active Phase 2 dependency is the manual/OpenClaw capture queue. Phase 3 remains blocked/pre-work-only until `PHASE_2_GATE.md` is explicitly changed to PASS after reconciliation.
