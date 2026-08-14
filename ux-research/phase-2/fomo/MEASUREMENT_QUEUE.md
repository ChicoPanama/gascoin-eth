# Fomo Measurement Queue

This queue separates what is already documented from what must be directly measured. It prevents the project from turning unobserved assumptions into fake precision.

## P0 measurement targets

### F08 — Social object → economic action
Capture where public access permits:
- social card anatomy;
- trader identity/context shown before action;
- PnL/balance/thesis context;
- number of taps from feed object to asset/action surface;
- whether context survives navigation;
- where explicit trade confirmation occurs;
- back navigation and feed-position recovery.

**GAS benchmark use:** J05 Result → Same Game.

### F05/F06 — Feed → profile → follow
Capture:
- tap count;
- profile transition;
- visible performance/context before follow;
- follow CTA placement;
- acknowledgement state;
- back behavior;
- scroll preservation.

**GAS benchmark use:** J06 Feed → Profile → Follow.

### F07 — Leaderboard → profile → follow
Capture:
- timeframe controls;
- leaderboard row density;
- row → profile action count;
- profile context;
- follow steps;
- return-to-leaderboard state.

**GAS benchmark use:** player/Crew discovery and J06/J07.

## P1 measurement targets

### Feed density
At each accessible standard viewport record:
- visible feed rows/cards above fold;
- primary focal points;
- visible financial numbers per card;
- primary/secondary actions;
- card height/gap/padding;
- sticky controls;
- navigation footprint.

### Asset/detail action density
Record:
- buy/sell CTA geometry;
- chart/social/detail hierarchy;
- default vs advanced-chart disclosure;
- contextual social signals near action.

### Navigation
Record:
- mobile bottom-nav item size/gap/safe area;
- desktop navigation density;
- selected-state behavior;
- number of persistent destinations.

## P2 state/recovery targets

Where observable:
- logged-out gate;
- loading skeletons/spinners;
- empty feed/following state;
- network/data error state;
- failed action state;
- session expiry;
- withdrawal/deposit pending state.

## Measurement outputs

Each direct capture should produce:
1. screenshot artifact;
2. molecular JSON from `scripts/ux-harvest.mjs` or equivalent;
3. observation entries conforming to `ux-research/schemas/observation.schema.json`;
4. journey metrics linked to F01–F14;
5. `observed` or `measured` evidence label;
6. explicit unknown values when a state cannot be accessed.

## Gate rule

Phase 2 requires enough direct/public measurement to validate the most important documented hypotheses. If a state cannot be directly captured, mark its measurement unavailable and retain the documented evidence rather than fabricating it.
