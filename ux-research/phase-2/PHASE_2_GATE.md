# Phase 2 Gate — Fomo Molecular Teardown

**Status:** OPEN
**Active phase:** Phase 2
**Roadmap:** `ux-research/ROADMAP.md`

## Completed

- documented Fomo product model;
- documented evolution/repeated-optimization analysis;
- structured Fomo journey matrix;
- GAS translations for account abstraction, social activity, profiles, feed, navigation, progressive disclosure, trust and cross-device continuity;
- explicit evidence taxonomy separating documented / observed / measured / inferred facts.

## Molecular capture still required before PASS

The following must be directly observed or measured with repeatable capture before Phase 2 closes:

### Mobile shell
- bottom-navigation destinations/order;
- selected/unselected states;
- primary touch-target geometry;
- search placement/behavior;
- safe-area behavior;
- screen-to-screen persistence.

### Desktop shell
- navigation layout;
- primary/secondary column structure;
- account/balance placement;
- social/feed placement;
- how desktop adds context without changing primary mobile journeys.

### Feed
- card/row geometry;
- visible information hierarchy;
- cards per viewport / density;
- insertion/update behavior;
- Global vs Following transition;
- scroll-position behavior;
- social action placement;
- activity -> underlying context path.

### Profile / leaderboard
- profile header hierarchy;
- performance/portfolio/context placement;
- follow control placement;
- leaderboard row hierarchy and timeframe selection;
- leaderboard -> profile journey.

### Action / funding
- quick-buy interaction path;
- amount preset/control behavior;
- confirmation mechanics;
- visual acknowledgement and post-action state;
- funding flow hierarchy;
- withdrawal/security flow hierarchy.

### Resilience
- loading states;
- empty states;
- public error states where observable;
- back navigation and feed-position retention;
- reconnect/stale-state behavior where testable without privileged access.

### Responsive transformation
- mobile -> tablet -> desktop component changes;
- which controls move versus remain conceptually fixed;
- information that is added/removed at each viewport.

## Pass requirements

Phase 2 passes only when:

1. `FOMO_JOURNEY_MATRIX.json` contains sufficient `observed` / `measured` entries to establish reliable comparison targets for core SocialFi/application-shell journeys;
2. every numeric GAS benchmark derived from Fomo is labeled as either measured reference data or an independently chosen GAS target;
3. Phase 2 produces a concise `FOMO_TO_GAS.md` handoff for Phase 4 Reference Matrix synthesis;
4. no proprietary asset/code is introduced into GAS;
5. Phase 3 remains available for stronger patterns if another reference beats Fomo on a particular journey.

## Current conclusion

Fomo is already validated as the deepest single-product SocialFi/application-shell benchmark, but Phase 2 is **not yet allowed to claim molecular measurement completeness**.
