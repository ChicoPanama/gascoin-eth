# Project GAS

Project GAS is an EVM-oriented consumer crypto product combining:

- **GAS** — a reserve-backed elastic monetary asset;
- **GAS Original** — a high-frequency provably-fair game layer;
- **SocialFi** — profiles, activity, Crews and verified economic events;
- **reserve transparency** — backing/rebase state without exposing protocol complexity;
- **future Bracket integration** — a separate-solvency event-market system that may use GAS utility later.

This repository is the current Project GAS implementation workspace. The historical GASCOIN gas-refund product remains present only where migration/compatibility work has not yet been retired; it is not the active product direction.

## Canonical UX roadmap

`ux-research/ROADMAP.md` is the only numbered UX roadmap.

0. GAS feature freeze for UX — **PASS**
1. Existing repo inventory — **PASS**
2. Fomo molecular teardown — **PASS**
3. Specialized cross-category teardowns — **PASS**
4. Reference Matrix — **PASS**
5. GAS Pattern Library — **PASS**
6. GAS information architecture — **PASS**
7. Mobile GAS prototype — **PASS**
8. Desktop adaptation — **PASS**
9. Vertical-loop implementation — **ACTIVE**
10. Automated comparison / benchmarking
11. Destroy friction

Phases 9–11 repeat until GAS meets or exceeds approved UX benchmarks.

## Current Project GAS surfaces

Primary consumer shell:

```text
Home | Play | Trade | Crews | Account
```

Additional first-class surfaces:

- `/reserve`
- `/search`
- `/notifications`
- `/round/[id]`

Current GAS Original prototype:

```text
       USDC entry
            ↓
automatic GAS sourcing
            ↓
CRUISE / BOOST / REDLINE
        ↓
 GAS-native wager
        ↓
     IGNITION
        ↓
LOCKING → LOCKED → RESOLVING → SETTLED
        ↓
 GAS payout → IGNITION AGAIN
```

Direct player-facing GAS entry is superseded. The current prototype keeps the player boundary fixed to USDC while preserving separate internal GAS wager/payout accounting; its sourcing credit remains illustrative until an authoritative Game Entry Router is connected.

## Prototype truth boundary

The Phase 7 interaction prototype is deliberately **not** a live-money game.

- no funds move;
- no live RNG/VRF;
- illustrative results are labeled;
- no fabricated reserve ratio or rebase countdown;
- no fabricated player activity, Crews or rankings;
- real account, bankroll, oracle, RNG and settlement adapters enter in later implementation phases.

## Financial invariants

Project GAS preserves explicit accounting firewalls:

```text
GAS monetary reserve != GAS game bankroll != future Bracket collateral
```

The UX may present one understandable consumer account, but financially different balances/positions must never be collapsed into misleading accounting.

## Repository map

```text
app/                         Next.js application routes
components/gas/              GAS-native product components
lib/project-gas/             canonical GAS state/contracts/helpers
ux-research/                 UX source of truth and research artifacts
e2e/                         Playwright release/regression tests
.github/workflows/            CI and UX research workflows
```

High-value source-of-truth files:

- `ux-research/ROADMAP.md`
- `ux-research/phase-0/GAS_UX_FEATURE_FREEZE.md`
- `ux-research/reference-matrix/REFERENCE_MATRIX.md`
- `ux-research/phase-5/GAS_PATTERN_LIBRARY.md`
- `ux-research/phase-6/GAS_INFORMATION_ARCHITECTURE.md`
- `ux-research/phase-7/PHASE_7_GATE.md`
- `ux-research/phase-8/PHASE_8_GATE.md`

## Development

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

Unit tests:

```bash
npm run test
```

Project GAS browser gate:

```bash
npm run test:e2e:gas
```

Legacy compatibility regression lane:

```bash
npm run test:e2e:legacy
```

All Chromium E2E checks:

```bash
npm run test:e2e:chromium
```

## CI model

`Project GAS CI` separates concerns into four explicit jobs:

1. **Unit Tests**
2. **Production Build**
3. **Project GAS E2E**
4. **Legacy Compatibility E2E**

The production build artifact is reused by both browser lanes. Superseded PR runs are cancelled automatically so CI does not waste capacity on stale commits.

## Branch / merge policy

- `main` is protected conceptually as the stable integration branch.
- `ux-lab` is the current Project GAS workbench and draft PR branch.
- PR #74 is the canonical integration PR for the current UX program.
- superseded research/staging PRs are closed rather than left as competing sources of truth.
- when the canonical program is ready for integration, use a **squash merge** so `main` receives a clean intentional history rather than the workbench's exploratory commit stream.

## Reference research policy

Public products may be studied for observable UX behavior, information architecture, interaction patterns and measurable journeys. Project GAS implements its own components, code, assets and product identity.

Reference evidence is normalized into GAS-owned patterns before implementation; competitor brand names are not implementation requirements.

## Current status

Phases 0–7 are closed. Phase 8 — Desktop adaptation — is active. See GitHub issue **#67** and draft PR **#74** for the current phase/gate status.
