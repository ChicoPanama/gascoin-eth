# PROJECT GAS — EXECUTION STATUS

**Date:** 2026-08-14  
**Staging branch:** `project-gas-ux-source-of-truth`

## Repository-control status

A dedicated new GitHub repository is the intended final home for Project GAS.

Current tooling limitation in this session:

- connected GitHub actions can read/write files, branches, issues and PRs;
- they do not expose repository creation or fork creation;
- the execution runtime also lacks an authenticated `gh` CLI.

Therefore all work is isolated on the staging branch above rather than overwriting `main`.

When dedicated repository creation becomes available, migrate this branch/history/content into `Project-GAS` and preserve `gascoin-eth` as the legacy/template source.

## Completed in this staging pass

### Canonical documentation

- `README.md` — Project GAS repository entry point
- `docs/00_PROJECT_GAS_SOURCE_OF_TRUTH.md`
- `docs/ux/01_UX_DOCTRINE.md`
- `docs/ux/02_INFORMATION_ARCHITECTURE.md`
- `docs/ux/03_GAS_ORIGINAL_GAME_UX.md`
- `docs/ux/04_SOCIAL_AND_LIVE_NETWORK_UX.md`
- `docs/ux/05_DESIGN_SYSTEM_MIGRATION.md`

### Research

- `docs/research/REFERENCE_RESEARCH.md`
  - Fomo
  - ORE
  - Stake Originals
- `docs/research/GAS_TEMPLATE_INVENTORY.md`

### Agent operating system

- `AGENTS.md`
- `agents/ux-orchestrator.md`
- `agents/gas-template-archaeologist.md`
- `agents/fomo-pattern-researcher.md`
- `agents/ore-live-state-researcher.md`
- `agents/stake-originals-researcher.md`
- `agents/game-ux-engineer.md`
- `agents/social-ux-engineer.md`
- `agents/design-system-engineer.md`
- `agents/mobile-performance-qa.md`
- `agents/trust-responsible-play.md`

### Beads graph

- `scripts/seed-beads.sh`
- 1 parent epic
- 30 dependency-aware child work items
- research/specification beads seed as completed
- implementation beads remain blocked/unblocked according to prerequisites

## First ready execution wave after `bd init && bash scripts/seed-beads.sh`

### Wave 1A — design system

**Agent:** `design-system-engineer`  
**Task:** Add Project GAS semantic design tokens

Output:

- GAS energy/gauge/reserve/game semantic tokens;
- dark/light/reduced-motion parity;
- contrast validation.

### Wave 1B — wallet/onboarding contract

**Agent:** `ux-orchestrator`  
**Task:** Define wallet and onboarding UX contract

Output:

- disconnected/connecting/connected/wrong-network/insufficient-balance/returning-user states;
- cross-surface component contract.

### Wave 1C — live event contract

**Agent:** `social-ux-engineer`  
**Task:** Define live network event data contract

Output:

- typed game/trade/rebase/reserve/crew event model;
- authoritative vs derived vs UGC distinction;
- degraded indexer state.

### Wave 1D — game state model

**Agent:** `game-ux-engineer`  
**Task:** Implement GAS Original interaction state model

Output:

- READY -> VALIDATING -> COMMITTING -> LOCKED -> RESOLVING -> RESULT;
- explicit failure/recovery branches;
- duplicate-wager protection contract.

## Wave 2 unlocks

When Wave 1 closes, the graph begins unlocking:

- navigation refactor;
- GAS Gauge;
- CRUISE/BOOST/REDLINE + wager controls;
- Reserve trust surface;
- Home heartbeat;
- IGNITION transaction flow;
- provably-fair verification.

## Execution rule

Do not skip ahead because a later task looks more visually interesting. `bd ready` is the controlling queue.

If implementation discovers a missing prerequisite, create a linked `discovered-from` bead and allow the graph to express the new dependency.

## Final Phase 1 gates

The last integration bead remains blocked until:

- profiles/crews/leaderboards;
- Reserve;
- Trade;
- roulette shell;
- mobile viewport tests;
- money-state/failure E2E;
- accessibility/responsible-play audit;
- performance budgets

are complete.

Only after that should the obsolete refund-product UI be removed from the migrated Project GAS codebase.
