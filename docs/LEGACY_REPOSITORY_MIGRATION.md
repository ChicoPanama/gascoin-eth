# GASCOIN Legacy Repository Migration

## Decision

Legacy GASCOIN code will **not** be deleted as part of the Project GAS migration.

The transition repository will be split into two independently recoverable repositories:

1. `ChicoPanama/Project-GAS`
   - source: `project-gas-ux-source-of-truth`
   - purpose: canonical Project GAS protocol/product repository

2. `ChicoPanama/gascoin-legacy`
   - source: `legacy-gascoin-preservation`
   - purpose: preserve the complete prior GASCOIN application, legacy routes, APIs, tests, deployment history, and reusable implementation reference

The existing `ChicoPanama/gascoin-eth` repository is a transition source only. It should not be destructively rewritten or archived until both destination repositories are verified from clean clones.

## Why this is better than deleting legacy code

- preserves rollback and forensic history;
- prevents obsolete product routes and dependencies from bloating Project GAS;
- keeps useful legacy implementation available for selective reuse;
- gives legacy production/deployment fixes an isolated maintenance surface;
- prevents migration cleanup from becoming irreversible;
- makes security and dependency review materially easier because each repo has one product purpose.

## Preservation point

The branch `legacy-gascoin-preservation` was created directly from the current legacy `main` before the Project GAS transition branch is promoted.

## Migration mechanism

Use:

```bash
bash scripts/split-project-gas-and-legacy.sh <project-public|project-private> <legacy-public|legacy-private>
```

The script refuses to:

- guess repository visibility;
- overwrite an existing destination repository;
- proceed without authenticated `gh` and `git`;
- proceed if either required source branch is missing.

## Verification gates

Do not archive `gascoin-eth` until all are true:

- Project GAS destination commit matches the intended Project GAS branch head;
- legacy destination commit matches the preservation branch head;
- both repositories can be cloned independently;
- Project GAS unit/build/E2E CI has an explicit result;
- legacy GASCOIN can build from a clean environment or any known build blocker is documented;
- Vercel/deployment linkage is pointed at the correct destination repository;
- secrets are separated rather than copied indiscriminately;
- Project GAS Beads/agent system exists in the new repository;
- the legacy repository README clearly states that it is archived/maintenance-only and is not the current protocol.

## Rule for reuse

Legacy code may be selectively ported into Project GAS when it is genuinely reusable, but Project GAS should not import the legacy application wholesale merely to preserve history. History belongs in `gascoin-legacy`; current product code belongs in `Project-GAS`.
