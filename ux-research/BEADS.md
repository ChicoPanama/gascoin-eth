# GAS UX — Beads Task Graph

**Purpose:** Persistent, dependency-aware execution memory for the GAS UX program.

The canonical *plan* is `ux-research/ROADMAP.md`. Beads (`bd`) is the canonical *work graph* used by coding/research agents to execute that plan.

## One task system

Once Beads is initialized in the repository:

- Use `bd` for task creation, status, dependencies, discovered work and ready-work selection.
- Do not maintain a second detailed TODO system in Markdown or GitHub Issues.
- GitHub remains the code-review and human visibility layer: branches, commits, PRs, releases and milestone summaries.
- Existing GitHub UX issues #67–#73 are bootstrap/history artifacts. Do not mirror every bead into a GitHub issue.

## Graph model

```text
GAS UX PROGRAM (root epic)
│
├── Phase 0 epic/molecule
│   ├── tasks (parallel where possible)
│   └── PHASE GATE
│
├── Phase 1 epic/molecule  ← blocked by Phase 0
│   ├── tasks
│   └── PHASE GATE
│
├── ...
│
└── Phase 11 epic/molecule ← optimization loop
```

Each numbered roadmap phase is represented by one Beads epic. Work inside the phase is represented by child tasks. Numbering in titles is for human readability; **dependencies, not numbering, control execution**.

## Required agent session protocol

1. Run `bd prime` to load project/task context.
2. Run `bd ready --json` to find unblocked work.
3. Read the selected bead fully with `bd show <id>`.
4. Claim atomically with `bd update <id> --claim --json`.
5. Execute the work and its tests/evidence requirements.
6. If new work is discovered, create a fully documented bead linked with `discovered-from:<current-id>`.
7. Close completed work with a reason.
8. Run `bd ready --json` again instead of inventing the next task from memory.

## Bead quality standard

Every executable bead must contain:

- **Description:** what is being done and why.
- **Design/context:** relevant GAS rules, references and constraints.
- **Acceptance criteria:** objective evidence that closes the bead.
- **Priority:** P0–P4.
- **Parent phase:** every planned UX bead belongs to a phase epic unless it is cross-cutting program infrastructure.
- **Dependencies:** explicit blockers where sequencing is real.

No title-only placeholder beads.

## Priority policy

- **P0:** security/trust/data-loss/incorrect-money-state/blocking failure.
- **P1:** phase-critical deliverable or major core-flow defect.
- **P2:** standard planned work.
- **P3:** polish/optimization that is not currently gating.
- **P4:** future/backlog idea.

## Dependency policy

Use dependency relationships intentionally:

- `blocks`: work cannot safely start until dependency closes.
- `parent-child`: phase hierarchy.
- `discovered-from`: work uncovered while executing another bead.
- `related`: useful context with no sequencing requirement.

Inside a phase, research arms should normally run in parallel. Only introduce blocking edges where an output is genuinely required by another task.

## Phase gates

Each phase has a `PHASE GATE` bead.

The phase gate:

- depends on all mandatory deliverables in that phase;
- verifies the exit criteria from `ROADMAP.md`;
- cannot be closed merely because children exist or code compiles;
- records evidence/links to findings, tests, captures, matrices or implementation;
- is the final readiness check before the phase epic is closed.

The next phase epic remains blocked until the prior phase epic is closed.

## Research bead evidence

A molecular UX research bead must identify its evidence level:

- `observed` — publicly visible behavior;
- `documented` — supported by primary/official documentation;
- `measured` — repeatable browser/Playwright measurement;
- `inferred` — analysis derived from evidence and clearly labeled.

Research beads should produce structured artifacts under `ux-research/`, not only prose in task comments.

## Implementation bead evidence

Implementation beads should normally include:

- affected GAS capability/pattern IDs;
- routes/components touched;
- desktop/mobile behavior;
- money-state/recovery implications;
- unit/E2E tests;
- benchmark impact where relevant;
- screenshots/captures for material visual changes.

## Human decisions

If an agent encounters a genuine product decision that cannot be resolved from the GAS source of truth:

- mark/flag the bead for human decision using the Beads human-decision workflow when available;
- state the exact decision, viable options and downstream blocked beads;
- do not silently pick a new protocol/economic rule.

## Discoveries

Agents are expected to discover better references, defects and missing requirements.

Discovery does **not** rewrite the roadmap automatically. Create a linked bead and classify it:

- belongs inside current phase;
- belongs in a future phase;
- cross-cutting blocker;
- backlog.

A discovery that materially changes the 0–11 roadmap requires an explicit update to `ROADMAP.md`.

## GitHub relationship

Use GitHub for:

- source code;
- branches;
- pull requests;
- CI;
- review discussions;
- high-level release/milestone communication.

Use Beads for:

- agent-ready work;
- task status;
- dependencies;
- phase children;
- discovered work;
- persistent execution memory.

A PR should reference relevant bead IDs in its description/commits where practical.

## Bootstrap

From a local clone after installing `bd`:

```bash
bd init
bd setup codex
python3 scripts/seed-ux-beads.py
bd ready --json
```

The seed script is idempotent by title: rerunning it should reuse existing seeded epics/tasks and only add missing planned relationships.

## Canonical rule

**Roadmap tells us where we are going. Beads tells every agent exactly what is ready to do next. Tests and evidence tell us whether it is actually done.**
