# Phase 1 Gate — Existing Repo Inventory

**Status:** PASS
**Roadmap:** `ux-research/ROADMAP.md`
**Primary inventory:** `ux-research/phase-1/REPO_INVENTORY.md`
**Machine-readable matrix:** `ux-research/phase-1/COMPATIBILITY_MATRIX.json`
**Prior-work reconciliation:** `ux-research/phase-1/PR66_RECONCILIATION.md`

## Gate conclusion

Phase 1 is complete for UX-planning purposes. The existing `gascoin-eth` platform has been classified deeply enough that downstream pattern/IA/prototype work can decide whether each required GAS capability should reuse, refactor, extend, build or retire an existing surface instead of rediscovering the repository.

## Verified reusable foundations

- Next.js 16 / React 19 App Router shell
- Privy provider and wallet/auth UI primitives, with legacy account policy explicitly flagged for refactor
- wagmi / viem connector and EVM infrastructure, including multi-provider RPC fallback
- TanStack React Query server-state foundation
- existing black/off-white design-token, typography, theme and reduced-motion system
- adaptive navigation/auth/theme mechanics
- dashboard/live-state display primitives
- leaderboard + community-feed + profile/wallet drilldown prior art
- referral/invite/current-user/public-data API patterns
- health/Sentry/global-error/observability foundations
- generic API versioning/webhook/RPC infrastructure
- Vitest/Testing Library/MSW unit-test stack
- Playwright desktop + mobile E2E stack and new UX benchmark instrumentation

## Verified surfaces requiring semantic replacement/refactor

- legacy refund/receipt/claim/gates/standing product journey
- current primary navigation destinations and GASCOIN branding/copy
- Twitter/external-wallet/mainnet-only Privy policy
- treasury presentation that does not yet express the new ReserveVault/POL/GameBankroll semantics
- leaderboard Points/refund metrics
- old Home marketing/refund hierarchy

## Explicit new-build capabilities

- GAS Original Play surface
- GAS Gauge / IGNITION interaction layer
- unified GAS account semantics
- GAS Trade flow
- Reserve + rebase surfaces
- GAS-native social result objects / Crews / following behavior where not already present
- game/settlement recovery layer
- future Bracket position/account extension points

## Prior branch reconciliation

PR #66 is treated as prior-art/prototype evidence, not a competing roadmap. Its deeper template inventory, UX specifications, semantic token prototype, typed live-event contract and GAS Original state machine are preserved as candidate inputs for Phases 5–9. Its older Beads graph must not be initialized alongside the canonical Phase 0–11 graph.

## Gate test against roadmap exit criterion

Roadmap criterion:

> Every Phase 5–9 GAS component can be mapped to an existing implementation surface or an explicit new-build requirement.

**Result: PASS.** `COMPATIBILITY_MATRIX.json` provides that mapping with dependency, protocol-constraint and acceptance-test fields.

## Phase transition

**Phase 1: CLOSED / PASS**

**Active phase: Phase 2 — Fomo molecular teardown**

Phase 2 now becomes the official execution phase. Phase 3 open-ended research may continue as parallel pre-work, but Phase 2 must produce the deepest single-product measured SocialFi/application-shell corpus before Phase 4 synthesis.
