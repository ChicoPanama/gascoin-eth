# PROJECT GAS — EXECUTION STATUS

**Date:** 2026-08-14  
**Staging branch:** `project-gas-ux-source-of-truth`

## Repository-control status

A dedicated new GitHub repository is the intended final home for Project GAS.

Current tooling limitation in this session:

- connected GitHub actions can read/write files, branches, issues and PRs;
- they do not expose repository creation or fork creation;
- the execution runtime has `git` but no authenticated `gh` CLI and no direct repository-create action.

Therefore all work is isolated on the staging branch above rather than overwriting `main`.

When dedicated repository creation becomes available, migrate this branch/history/content into `Project-GAS` and preserve `gascoin-eth` as the legacy/template source.

## Completed foundation work

### Canonical documentation

- `README.md` — Project GAS repository entry point
- `docs/00_PROJECT_GAS_SOURCE_OF_TRUTH.md`
- `docs/ux/01_UX_DOCTRINE.md`
- `docs/ux/02_INFORMATION_ARCHITECTURE.md`
- `docs/ux/03_GAS_ORIGINAL_GAME_UX.md`
- `docs/ux/04_SOCIAL_AND_LIVE_NETWORK_UX.md`
- `docs/ux/05_DESIGN_SYSTEM_MIGRATION.md`
- `docs/ux/06_WALLET_ONBOARDING_STATE_MODEL.md`

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

## Wave 1 implementation status

### Wave 1A — semantic design system

**Agent:** `design-system-engineer`  
**Bead:** Add Project GAS semantic design tokens  
**Status:** implementation landed; CI verification pending

Landed:

- `app/tokens.css` now includes GAS energy, gauge, live, reserve, game-bankroll, rebase and safe-area semantic roles;
- light/dark aliases preserve existing token architecture;
- core money states reuse existing pass/fail semantic roles rather than proliferating raw colors.

### Wave 1B — wallet/onboarding contract

**Agent:** `ux-orchestrator`  
**Bead:** Define wallet and onboarding UX contract  
**Status:** specification landed

Landed:

- disconnected/connecting/connected/wrong-network/session-expired model;
- action-specific funding states;
- first-use vs returning-user paths;
- explicit money-action state language;
- disconnect-after-commit recovery behavior;
- no auto-wager/auto-trade after reconnect/deep link.

### Wave 1C — live event contract

**Agent:** `social-ux-engineer`  
**Bead:** Define live network event data contract  
**Status:** implementation + unit tests landed; CI verification pending

Landed:

- `lib/project-gas/live-events.ts`
- `tests/unit/lib/project-gas-live-events.test.ts`

The contract separates game results, trades, rebases, reserve events and crew milestones; distinguishes on-chain/indexer/user authority; uses exact decimal strings for economic values; and exposes live/degraded/offline feed health.

### Wave 1D — GAS Original state model

**Agent:** `game-ux-engineer`  
**Bead:** Implement GAS Original interaction state model  
**Status:** implementation + unit tests landed; CI verification pending

Landed:

- `lib/project-gas/game-state.ts`
- `tests/unit/lib/project-gas-game-state.test.ts`

The state model covers:

`READY -> VALIDATING -> COMMITTING -> LOCKED -> RESOLVING -> RESULT`

with explicit failure branches and the critical retry invariant:

> Blind retry is only allowed when the system knows no funds moved and no wager was created.

Unknown submission state or a known locked wager prevents unsafe resubmission.

## Verification status

The repository's existing GitHub Actions workflow runs unit tests, a Next.js build check, and Playwright on pull requests to `main`.

A staging/draft PR may be used solely to obtain CI evidence. No staging branch should be merged into the legacy product until Project GAS migration strategy is explicitly finalized.

## Wave 2 unlocks after Wave 1 verification

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
