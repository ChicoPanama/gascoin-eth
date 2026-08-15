# Phase 5 Gate — GAS Pattern Library

**Status:** PASS / CLOSED  
**Next active phase:** Phase 6 — GAS Information Architecture

## Gate criterion

Every important GAS interaction must reference a GAS-owned pattern rather than an external product name.

Patterns must be implementation-grade enough to constrain downstream IA/code, including:
- purpose/intent;
- canonical states;
- persistence/sensitive-state rules;
- protocol/financial truth constraints;
- existing-repo mapping;
- reuse/refactor/build action;
- measurable acceptance tests;
- canonical journey coverage.

## Canonical artifacts

- `PATTERNS.json` — 24 machine-readable GAS pattern contracts.
- `PATTERN_LIBRARY.md` — composition rules, universal constraints and implementation notation.

## Coverage

`PATTERNS.json` explicitly maps every J01–J18 canonical journey to one or more GP pattern IDs.

Core pattern families:
- consumer account/security;
- Play/wager/IGNITION/result;
- canonical action/recovery state;
- SocialFi/identity/Crews;
- quick Trade/progressive market depth;
- rebase/reserve trust;
- search/re-entry;
- future Bracket event/position.

## Important outcome

Competitor names are no longer required to specify implementation behavior.

For example, downstream work should say:
- `GP03 BoundedPlayPermission`, not “make wallet UX like X”;
- `GP11 ResultActionRail`, not “copy a casino result panel”;
- `GP12 VerifiedEconomicObject`, not “make a Fomo card”;
- `GP20 ReserveTrustSurface`, not “make a Circle page”;
- `GP21 HumanRecoveryNotice`, not “copy Uniswap errors.”

## Universal rules frozen by Phase 5

- one primary action per state/screen;
- immediate acknowledgement without invented finality;
- consumer language first;
- distinct financial/accounting semantics;
- bounded/revocable authorization;
- safe preference persistence only;
- reconcile before retry;
- verified facts separate from commentary;
- no fake activity;
- exit parity;
- progressive disclosure;
- accessible/programmatic state.

## Gate result

Every important GAS interaction can now be described through GAS-owned pattern contracts with protocol and acceptance constraints.

**Phase 5: CLOSED / PASS**

**Phase 6: ACTIVE — GAS Information Architecture**
