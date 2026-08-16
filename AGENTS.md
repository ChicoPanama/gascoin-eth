# Project GAS — Agent Operating Context

This file is the tool-agnostic starting context for coding/research agents working in this repository.

## Active product

**Project GAS** is the active product. The historical GASCOIN gas-refund application is legacy compatibility surface only and must not be treated as the current product architecture.

Project GAS combines:

1. **GAS** — reserve-backed elastic monetary asset;
2. **wGAS** — fixed-share/non-rebasing integration wrapper;
3. **GAS Original** — high-frequency provably-fair game using CRUISE / BOOST / REDLINE and IGNITION;
4. **SocialFi** — profiles, verified economic activity, Crews and social discovery;
5. **Reserve transparency** — backing and rebase state;
6. **future Bracket integration** — separate collateral/settlement domain and separate solvency.

## Canonical roadmap

`ux-research/ROADMAP.md` is the sole numbered UX roadmap.

Current state:

- Phase 0 — feature freeze: PASS
- Phase 1 — repo inventory: PASS
- Phase 2 — Fomo molecular teardown: PASS
- Phase 3 — cross-category teardowns: PASS
- Phase 4 — Reference Matrix: PASS
- Phase 5 — GAS Pattern Library: PASS
- Phase 6 — GAS information architecture: PASS
- Phase 7 — Mobile GAS prototype: PASS
- **Phase 8 — Desktop adaptation: ACTIVE**
- Phases 9–11 are not active until their gates open.

Pre-work is allowed; gate-skipping is not.

## Source of truth

Read these before making product-level decisions:

- `ux-research/ROADMAP.md`
- `ux-research/phase-0/GAS_UX_FEATURE_FREEZE.md`
- `ux-research/reference-matrix/REFERENCE_MATRIX.md`
- `ux-research/phase-5/GAS_PATTERN_LIBRARY.md`
- `ux-research/phase-6/GAS_INFORMATION_ARCHITECTURE.md`
- `ux-research/phase-7/PHASE_7_GATE.md`
- `ux-research/phase-8/PHASE_8_GATE.md`
- GitHub issue #67 for high-level status
- PR #74 for the current integration workbench

## Locked UX shell

Primary mobile navigation:

```text
Home | Play | Trade | Crews | Account
```

Reserve is one action from Home and persistent on larger desktop layouts. Search and Notifications are utilities, not permanent mobile bottom-nav destinations.

## Financial invariants

Never collapse or cross-subsidize these accounting domains:

```text
GAS monetary reserve != GAS game bankroll != future Bracket collateral
```

Additional invariants:

- external assets only count as GAS reserve backing;
- GAS/wGAS/self-issued LP value cannot back GAS;
- game losses cannot call ReserveVault;
- wGAS must remain exactly share-backed;
- future Bracket must function without GAS and cannot create circular solvency;
- financial state shown to users must distinguish spendable cash, locked wagers, marked positions and protocol reserves.

## Current prototype truth boundary

The verified Phase 7 GAS Original implementation remains an interaction prototype while Phase 8 adapts the same product model to desktop:

- no funds move;
- no live RNG/VRF;
- illustrative results are labeled;
- no fabricated reserve/rebase/social data;
- real settlement, bankroll, oracle and RNG adapters enter later.

Do not convert illustrative prototype data into claims of live protocol behavior.

## Deprecated concepts

Do not reintroduce without an explicit new decision:

- old receipt/gas-refund GASCOIN product as the primary application;
- CORE/pressure user-facing branding;
- CALM/LIVE/WILD or STABLE/SURGE/BREACH mode naming;
- Index-Settled CCA, SEAL, CRACK;
- reserve-backed gambling liabilities;
- mandatory Bracket dependency in Phase 1;
- mandatory GAS Bracket collateral;
- literal competitor code/assets/trade-dress copying.

## Research policy

Public products may be studied for observable UX behavior, information architecture, interaction patterns, state machines and measurable journeys. Normalize useful behavior into GAS-owned patterns before implementation.

Never fabricate measurements that were not directly observed. Mark inaccessible/native/authenticated measurements unavailable when necessary.

## Engineering conventions

- Next.js App Router / React / TypeScript.
- Prefer GAS-native feature modules under `components/gas/` and protocol/state contracts under `lib/project-gas/`.
- Keep view components separate from protocol/adaptor/state orchestration where practical.
- Money-moving flows must use explicit states and reconciliation before retry when finality is uncertain.
- Avoid `networkidle` as an E2E readiness primitive on apps with polling/live connections; assert deterministic UI readiness instead.
- No hidden wallet/RPC/network jargon in normal consumer flows.
- Minimum primary mobile touch target: 44px.
- Core Play action/replay must remain reachable above the fixed nav at 390×844.
- Phase 8 must preserve the same routes, state semantics and primary action model on desktop rather than inventing a terminal-only second product.

## Test commands

```bash
npm run test
npm run test:e2e:gas
npm run test:e2e:legacy
npm run build
```

`Project GAS CI` separates Unit, Production Build, Project GAS E2E and Legacy Compatibility E2E.

## Task/control model

- **Roadmap** = sequencing and phase gates.
- **Beads** = detailed dependency-aware agent work graph when available.
- **GitHub issue #67** = high-level human-visible status.
- **PR #74 / ux-lab** = current code/research workbench.
- **Tests/benchmarks** = objective acceptance.

Do not create a competing roadmap or source-of-truth document.

## Merge discipline

`ux-lab` is intentionally exploratory and may contain many small commits. When the canonical integration is approved, prefer **squash merge** into `main` so main receives one intentional Project GAS change set rather than research/workbench history.
