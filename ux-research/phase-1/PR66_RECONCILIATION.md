# Phase 1 Reconciliation — Prior Project GAS UX Staging Work

## Purpose

PR #66 (`project-gas-ux-source-of-truth`) predates the canonical `ux-lab` Phase 0–11 roadmap but contains substantial valid prior work. This document prevents duplicate research/engineering and states how that work is credited without allowing PR #66 to become a competing roadmap.

## Authority

- Canonical phase numbering and task execution: `ux-research/ROADMAP.md` + Beads graph on `ux-lab`.
- PR #66: prior-art/staging evidence and reusable implementation source.
- No staging branch is silently merged wholesale into the legacy product.

## Prior work credited

### Phase 0 — feature freeze
PR #66 contains `docs/00_PROJECT_GAS_SOURCE_OF_TRUTH.md` and UX doctrine documents that independently confirm the key GAS decisions now normalized in `ux-research/phase-0/GAS_UX_FEATURE_FREEZE.md`.

**Disposition:** evidence/reconciliation only. Canonical Phase 0 artifact remains under `ux-research/phase-0/`.

### Phase 1 — repo inventory
PR #66 contains `docs/research/GAS_TEMPLATE_INVENTORY.md`, including:
- Next/React/Privy/wagmi/viem/React Query/Framer/Supabase/Sentry/Vitest/Playwright stack inventory;
- design-token and global-style assessment;
- app shell and navigation assessment;
- route reuse classification;
- social/leaderboard/community/referral reuse candidates;
- dashboard/live-state primitives;
- test/migration risk controls;
- proposed Project GAS component namespaces.

**Disposition:** credited as the deeper archaeology pass and normalized into `REPO_INVENTORY.md` and `COMPATIBILITY_MATRIX.json`.

### Phase 5/6 pre-work
PR #66 contains UX doctrine, information architecture, game UX, social/live-network UX, design-system migration and wallet/onboarding state-model documents.

**Disposition:** retain as strong candidate inputs when Phases 5 and 6 officially activate. Do not treat those phases as passed merely because pre-work exists.

### Phase 7–9 pre-work
PR #66 contains:
- Project GAS semantic token additions in `app/tokens.css`;
- `lib/project-gas/live-events.ts` plus tests;
- `lib/project-gas/game-state.ts` plus tests.

**Disposition:** implementation prototypes/prior art. Before porting, revalidate them against the Phase 2–6 evidence and canonical pattern/IA decisions. They are not discarded and should be preferred over reimplementation when still valid.

## Specific implementation value preserved

### Game state machine
The prior model covers:
`READY -> VALIDATING -> COMMITTING -> LOCKED -> RESOLVING -> RESULT`
with explicit failure branches and a strong safety invariant:

> Blind retry is allowed only when the system knows no funds moved and no wager was created.

This should be considered a high-value candidate for Phase 9 resilience implementation.

### Live event contract
The prior model distinguishes:
- game results;
- trades;
- rebases;
- reserve events;
- crew milestones;
- onchain/indexer/user authority;
- pending versus confirmed state;
- live/degraded/offline feed health;
- exact decimal-string economic values.

This should be considered a high-value candidate for Phase 6 social/live architecture and Phase 9 implementation.

### Semantic tokens
The prior design-token patch adds GAS energy, gauge, reserve, bankroll, rebase, safe-area and touch-target roles while preserving the existing neutral/light-dark foundation.

This should be reconsidered during Phase 5 Pattern Library/design-system synthesis rather than recreated from scratch.

## Agent-role reconciliation

PR #66 defined specialist roles such as template archaeologist, Fomo researcher, ORE researcher, Stake researcher, game UX engineer, social UX engineer, design-system engineer, mobile QA and trust/responsible-play.

The canonical `ux-lab` swarm is broader and phase-oriented. These older roles remain useful execution personas and can be attached to Beads when their expertise matches the work. They do not introduce a second phase plan.

## Beads reconciliation

PR #66 contains an older 30-task Beads graph aimed at a direct Phase 1 product build. `ux-lab` now owns the canonical Phase 0–11 Beads graph.

**Rule:** do not initialize both graphs in the same Project GAS execution repository. Port useful acceptance criteria/tasks from PR #66 as `related`/`discovered-from` beads inside the canonical phase rather than seeding the older graph.

## Repository split note

PR #66 recommends eventually separating the legacy GASCOIN application from Project GAS. That migration remains sensible, but this UX phase does not make an irreversible repository-creation/visibility decision. Until a dedicated destination is established and verified, `ux-lab` remains the canonical UX execution branch in the transition repository.

## Conclusion

PR #66 is not abandoned work. It is a substantial evidence and prototype library. The canonical plan will harvest it deliberately at the phase where each artifact becomes authoritative, avoiding both duplicate effort and accidental premature implementation.
