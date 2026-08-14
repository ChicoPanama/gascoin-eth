# PROJECT GAS

**Canonical product, protocol, and UX staging branch**

This branch is the migration source for the dedicated **Project GAS** repository. It deliberately reuses the strongest engineering bones from the existing `gascoin-eth` frontend while replacing the old gas-refund product with the new GAS monetary protocol, game, social, and reserve experience.

> Branch: `project-gas-ux-source-of-truth`
>
> Dedicated repository target: `Project-GAS` / `project-gas` once repository-creation access is available.

## Product in one sentence

GAS is a reserve-backed elastic monetary protocol with a high-frequency, provably-fair game and social layer, designed so monetary complexity builds trust underneath while the consumer UX stays extremely simple.

## UX doctrine

The front end should combine four proven interaction ideas without copying proprietary code or assets:

1. **Existing GAS template** — retain the black/off-white industrial visual system, responsive shell, wallet/auth, animation primitives, dashboard infrastructure, and testing stack.
2. **Fomo** — adopt social-first discovery, unified identity/balance, profiles, feeds, leaderboards, fast action CTAs, and mobile-first simplicity.
3. **ORE** — adopt the feeling of a live communal protocol: visible rounds/state/activity, obvious participation, and simple protocol language.
4. **Stake Originals** — adopt ruthless interaction efficiency: minimal controls, risk selection, one-action play, hotkeys, instant mode, live result feedback, and provably-fair verification.

The product must feel GAS-native, not like a collage of reference products.

## Primary product surfaces

- **Home** — GAS price, rebase clock, reserve health, network activity, social feed, quick Play / Buy actions.
- **Play** — GAS Original first; roulette second.
- **Trade** — simple GAS buy/sell flow.
- **Crews** — social identity, group performance, referrals, competition.
- **Reserve** — monetary transparency and backing.
- **Wallet** — balances, history, settings, provably-fair records.

### GAS Original

The signature loop is:

`CRUISE / BOOST / REDLINE -> bet amount -> IGNITION -> GAS GAUGE -> result -> repeat/share`

A first-time user must understand the game and initiate a wager within **10 seconds** of opening Play. A returning user must be able to initiate the next round with **one primary action**.

## Source of truth

Read in this order:

1. `docs/00_PROJECT_GAS_SOURCE_OF_TRUTH.md`
2. `docs/ux/01_UX_DOCTRINE.md`
3. `docs/ux/02_INFORMATION_ARCHITECTURE.md`
4. `docs/ux/03_GAS_ORIGINAL_GAME_UX.md`
5. `docs/ux/04_SOCIAL_AND_LIVE_NETWORK_UX.md`
6. `docs/ux/05_DESIGN_SYSTEM_MIGRATION.md`
7. `docs/research/REFERENCE_RESEARCH.md`
8. `docs/research/GAS_TEMPLATE_INVENTORY.md`
9. `AGENTS.md`
10. `scripts/seed-beads.sh`

## Beads task system

This project uses **Beads (`bd`)** as the canonical task graph for coding agents. Do not create a second Markdown TODO system.

After cloning locally:

```bash
# Install once (see https://github.com/gastownhall/beads)
bd init
bash scripts/seed-beads.sh
bd ready --json
```

Agents must:

1. run `bd ready --json`;
2. claim exactly one ready bead;
3. load the role prompt named in that bead;
4. make the smallest coherent change;
5. test it;
6. record newly discovered work as linked beads;
7. close the bead only when acceptance criteria are satisfied.

## Agent workstreams

The repository defines specialist roles for:

- UX orchestration
- existing GAS-template archaeology
- Fomo social/discovery research
- ORE live-state research
- Stake Originals interaction research
- GAS game interaction design
- social/crew design
- mobile UX
- design-system engineering
- wallet/onboarding UX
- reserve/trust UX
- accessibility/performance QA
- responsible-play UX and risk controls

See `AGENTS.md` and `agents/`.

## Clean-room reference policy

- **Existing GAS code is ours and may be directly reused/refactored.**
- **ORE app is Apache-2.0**, but Project GAS should still prefer clean-room reimplementation of useful interaction ideas in the existing Next.js stack unless a specific reusable module provides clear value and attribution/license obligations are satisfied.
- **Fomo and Stake are product references only.** Do not copy proprietary source, artwork, trade dress, text, or unique branded assets. Extract interaction principles and implement them independently.

## Existing engineering stack retained

The current template already provides:

- Next.js 16 / React 19 / TypeScript
- Privy authentication
- wagmi + viem
- TanStack Query
- Framer Motion
- Sentry
- Supabase
- Vitest
- Playwright E2E
- responsive design tokens
- light/dark themes
- existing wallet/navigation/community/leaderboard/referral components

We refactor this foundation rather than restart the application.

## Phase 1 UX acceptance gates

Phase 1 does not pass until:

- mobile Play works without vertical scrolling on common phone sizes for the core wager loop;
- a connected returning user can place the next GAS Original wager with one primary action;
- keyboard Space can trigger IGNITION on desktop when safe and focused appropriately;
- Instant Mode materially shortens repeated-play animation without changing settlement;
- CRUISE / BOOST / REDLINE communicate relative variance visually before the user reads documentation;
- the live activity layer makes the protocol feel populated without fabricating users or results;
- every displayed game result can reach a provably-fair verification surface;
- Reserve clearly distinguishes backing from game bankroll;
- social result cards can lead directly back into the same playable configuration;
- all transaction states have explicit pending / success / failure / retry UX;
- reduced-motion and accessibility preferences are respected;
- performance budgets and Playwright flows pass on mobile and desktop.

## Current status

The protocol source of truth and UX research architecture are being established first. Implementation should proceed bead-by-bead rather than by broad uncontrolled rewrites.
