# Legacy GASCOIN quarantine

The historical GASCOIN gas-refund application remains in this repository only because Project GAS is being migrated incrementally from an existing production codebase.

**Nothing in this directory or the legacy surfaces below overrides Project GAS source-of-truth documents.**

## Canonical product

See:

- `/README.md`
- `/AGENTS.md`
- `/ux-research/ROADMAP.md`
- GitHub issue #67
- PR #74

## Legacy surface classes

### Consumer routes awaiting decommission / replacement mapping

Examples include:

- `/submit`
- `/leaderboard`
- `/gates`
- `/wallet`
- `/referral`
- `/standing`
- `/dashboard`
- `/community`
- `/how-it-works`
- `/marketplace`
- `/points`
- `/perks`
- `/welcome`
- historical `/docs` content

These routes are **not** part of the locked Project GAS primary information architecture.

### Legacy backend/admin systems

The repository also contains substantial historical code for:

- receipt submission/review;
- X/Twitter proof verification;
- refund gates;
- points/referral processing;
- old treasury/refund dashboards;
- claim/payout workers;
- old admin workflows;
- legacy Supabase schemas and migrations.

Do not delete backend/admin systems merely because their current UX is deprecated. They may contain reusable authentication, rate-limiting, observability, queueing, persistence, admin, or data-integrity primitives.

## Decommission rule

A legacy surface can be removed from the Project GAS branch when all of the following are true:

1. its purpose is mapped to `reuse`, `refactor`, `replace`, `archive`, or `delete`;
2. any reusable primitive has been extracted into a GAS-neutral or GAS-native module;
3. a Project GAS replacement exists when the capability remains required;
4. tests no longer depend on obsolete implementation details;
5. no production route/import/worker still requires the code;
6. deletion is covered by build/unit/E2E verification.

## Test policy

Legacy compatibility is intentionally separated from the Project GAS release gate:

```bash
npm run test:e2e:gas
npm run test:e2e:legacy
```

Project GAS tests establish current-product correctness. Legacy tests exist only to detect accidental breakage while historical routes are still present.

As routes are formally decommissioned, their legacy tests should be removed in the **same change**.

## Git history

Old deployment handoffs, generated audit reports and abandoned product documents may be removed from the active tree once they are no longer operationally relevant. Git history remains the archival source for those files.

## End state

The intended end state is **not** a permanent dual-product repository.

Project GAS should eventually contain only:

- current GAS application routes;
- reusable infrastructure;
- current protocol/data contracts;
- Project GAS admin/operations tooling;
- current tests;
- canonical research/specification artifacts;
- explicitly retained historical material under this legacy namespace when genuinely useful.
