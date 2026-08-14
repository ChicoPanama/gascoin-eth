# PROJECT GAS — AGENT OPERATING INSTRUCTIONS

This repository uses **Beads (`bd`) for all task tracking**.

Do not use Markdown TODO lists, ad-hoc checklists, or untracked broad rewrites as a substitute for Beads.

## 1. Mandatory startup sequence

Before changing code:

```bash
bd prime
bd ready --json
```

Then:

1. select exactly one ready bead;
2. read the bead completely;
3. load the specialist role named in `Agent role` from `agents/`;
4. read the required source-of-truth files;
5. claim the bead atomically:

```bash
bd update <id> --claim --json
```

6. implement only the bead scope;
7. run its acceptance tests;
8. create discovered work as linked Beads rather than silently expanding scope;
9. close only when acceptance criteria are satisfied.

## 2. Source-of-truth reading order

All agents must begin with:

1. `docs/00_PROJECT_GAS_SOURCE_OF_TRUTH.md`
2. `docs/ux/01_UX_DOCTRINE.md`

Then read task-specific docs.

UX workers should also read:

- `docs/ux/02_INFORMATION_ARCHITECTURE.md`
- `docs/ux/03_GAS_ORIGINAL_GAME_UX.md`
- `docs/ux/04_SOCIAL_AND_LIVE_NETWORK_UX.md`
- `docs/ux/05_DESIGN_SYSTEM_MIGRATION.md`
- `docs/research/REFERENCE_RESEARCH.md`
- `docs/research/GAS_TEMPLATE_INVENTORY.md`

## 3. Canonical product rules

Never violate these while implementing UX:

- Protocol name is GAS.
- Primary Phase 1 asset is GAS; wGAS is the wrapper; GSD remains reserved/open.
- GAS trade fee is 2.00%: 1.50% protocol / 0.50% team.
- Game economics are a separate rail from trading fees.
- Game bankroll and monetary reserve are financially firewalled.
- Signature game is CRUISE / BOOST / REDLINE -> IGNITION -> GAS GAUGE.
- USDC and GAS are accepted game inputs.
- Provably-fair roulette is the first secondary conventional game.
- Bracket is not a Phase 1 dependency.
- Live/social metrics must never be fabricated.

If code or old copy conflicts with this list, the old code/copy is legacy.

## 4. Specialist roles

Use the role assigned by the bead. Role prompts live in `agents/`.

Available roles:

- `ux-orchestrator`
- `gas-template-archaeologist`
- `fomo-pattern-researcher`
- `ore-live-state-researcher`
- `stake-originals-researcher`
- `game-ux-engineer`
- `social-ux-engineer`
- `design-system-engineer`
- `mobile-performance-qa`
- `trust-responsible-play`

Do not impersonate another role to broaden bead scope. If another specialization is required, create a linked bead.

## 5. Beads workflow

### Find ready work

```bash
bd ready --json
```

### Inspect

```bash
bd show <id> --json
```

### Claim

```bash
bd update <id> --claim --json
```

### Discovered work

```bash
bd create "Found work" \
  --description="What was discovered and why it is outside the current bead" \
  -t task -p 2 \
  --deps discovered-from:<current-id> \
  --json
```

### Complete

```bash
bd close <id> --reason "Acceptance criteria satisfied; tests passed" --json
```

## 6. Scope discipline

Each bead should produce the smallest coherent change that satisfies its acceptance criteria.

Do not:

- redesign unrelated pages;
- delete legacy code simply because it looks old;
- alter protocol economics from a UX bead;
- add a new dependency without documenting the need;
- merge research and implementation into one huge uncontrolled change;
- create fake data to make a screen look busy.

## 7. Research / clean-room rules

### Existing GAS repository

Owned code may be reused/refactored directly.

### ORE

ORE app metadata declares Apache-2.0. Direct reuse still requires license/notice compliance and a clear technical reason. Prefer clean-room reimplementation in the existing Next.js stack.

### Fomo and Stake

Treat as product references only.

Do not copy:

- source code;
- unique branded assets;
- exact copy;
- trade dress;
- proprietary game tables.

Translate the underlying UX problem into an independent GAS implementation.

## 8. Engineering standards

The existing stack is the default:

- Next.js / React / TypeScript
- Privy
- wagmi / viem
- TanStack Query
- Framer Motion
- Supabase where appropriate
- Vitest
- Playwright

A bead must justify replacing foundational technology.

## 9. UI standards

- mobile first;
- accessible keyboard/focus behavior;
- no critical information encoded by color alone;
- respect `prefers-reduced-motion`;
- explicit pending/success/failure states;
- user must know whether funds moved after every error;
- no deceptive countdowns or fake scarcity;
- no fabricated activity;
- one dominant primary action on GAS Original.

## 10. Testing expectation

For UI implementation beads:

- unit/component tests where logic exists;
- Playwright for critical user journeys;
- at least one mobile viewport and one desktop viewport;
- reduced-motion coverage for animation-heavy components;
- transaction failure/rejection coverage for money actions;
- empty/degraded data coverage for live feeds.

Run the narrowest relevant suite during iteration and the required acceptance suite before closing.

## 11. Commit/PR discipline

Preferred unit:

`one bead -> one coherent branch/commit series -> one reviewable PR`

PR description should include:

- Bead ID
- agent role
- scope
- acceptance criteria
- tests run
- screenshots/recordings for visual changes where available
- discovered follow-up bead IDs

## 12. Human-decision boundary

Mark a bead for human decision rather than guessing when work requires:

- new protocol economics;
- final legal/regulatory policy;
- irreversible deletion/migration;
- final brand asset approval;
- new custody/onramp provider;
- final payout tables;
- final chain choice;
- permission to reuse third-party code beyond normal clean-room referencing.

## 13. Definition of done

A bead is done only when:

1. scope is implemented;
2. acceptance criteria pass;
3. tests pass;
4. no known blocker is hidden;
5. newly discovered work is tracked;
6. source-of-truth docs are updated if the implementation changes an approved specification.
