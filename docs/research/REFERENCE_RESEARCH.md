# PROJECT GAS — UI/UX REFERENCE RESEARCH

**Research date:** 2026-08-14  
**Rule:** Extract interaction principles. Do not copy proprietary source code, artwork, text, trade dress, or branded assets.

---

## 1. Fomo — social/discovery/execution reference

### Official sources

- Fomo Web announcement: https://fomo.family/blog/announcing-fomo-web
- February 2026 feed redesign: https://fomo.family/blog/february-2026-recap/
- App navigation guide: https://fomo.family/blog/learn/navigating-your-fomo-app
- Social feature guide: https://fomo.family/blog/learn/leveraging-fomos-social-features
- TradingView integration: https://fomo.family/blog/tradingview-partnership/
- November 2025 redesign: https://fomo.family/blog/november-2025-recap
- October 2025 dynamic PnL/social update: https://fomo.family/blog/october-2025-recap/
- September 2025 friends feed/Base launch: https://fomo.family/blog/september-2025-recap

### Observed product principles

Fomo explicitly positions its web experience as **not a trading terminal**. It retains intuitive mobile journeys while using desktop space for richer context.

High-value patterns:

1. **One identity across devices** — same profile, balance, positions, following, and settings.
2. **Unified balance** — execution complexity is hidden from the top-level experience.
3. **Social at the center** — feed, profiles, leaderboards, theses, top holders/traders.
4. **Quick actions** — fast buys from discovery context.
5. **Feed scanability** — the 2026 feed redesign emphasizes faster parsing during high activity.
6. **Economic context inside social objects** — theses can show PnL/balance context.
7. **Following/friends segmentation** — users can filter activity to trusted social graphs.
8. **Shareable wins/fumbles** — outcomes become social content.
9. **Professional depth is optional** — TradingView exists inside the product without making every screen a professional terminal.

### GAS translation

Use these principles for:

- GAS Home as a live/social feed rather than static marketing page;
- result cards as action objects;
- profiles and crews;
- leaderboards;
- one identity/balance across Play/Trade/Social;
- `TRY THIS MODE` from a result card;
- optional deeper charts on Trade, not required for basic execution.

### Do not copy

- Fomo visual trade dress;
- proprietary layout code;
- exact copy/text;
- branded iconography;
- unique card styling.

---

## 2. ORE — live shared-state / protocol-presence reference

### Official/open-source sources

- ORE protocol: https://github.com/regolith-labs/ore
- ORE app: https://github.com/regolith-labs/ore-app
- ORE app package metadata/license: `Cargo.toml` declares Apache-2.0.
- ORE mining page: https://github.com/regolith-labs/ore-app/blob/master/src/pages/mine.rs
- ORE core protocol README: https://github.com/regolith-labs/ore/blob/master/README.md

### Observed architecture

The current ORE protocol tracks explicit shared state such as:

- Board
- Round
- Miner
- Treasury
- Automation

Mining instructions include deploy, checkpoint, claim, reset, and automation-related operations.

The ORE app exposes dedicated pages for Mine, Trade, Stake, Transfer and related account flows. The mining UI centers a small set of user-facing state such as rewards, status, controls, and time rather than forcing users to inspect protocol internals.

### High-value principles

1. **Shared round state makes the protocol feel alive.**
2. **Simple protocol language** beats deep infrastructure explanation.
3. **Rewards and current state are visible near the primary action.**
4. **Dedicated functional pages** keep each action understandable.
5. **The live protocol is itself content.**

### GAS translation

Use ORE-inspired live-state thinking for:

- live IGNITION activity;
- real round IDs;
- current protocol/rebase state;
- reserve events;
- real participant/result activity;
- clear status transitions.

Do not copy ORE's mining metaphor or 5x5/board mechanic for GAS Original.

### License note

The ORE app declares `Apache-2.0`. If any source code is ever reused directly, preserve required notices/attribution and run license review. Default approach remains a clean-room TypeScript/Next.js implementation because GAS already has a stronger native frontend stack.

---

## 3. Stake Originals — interaction-economy reference

### Official sources

- Stake Originals hub: https://stake.com/casino/group/stake-originals
- Limbo: https://stake.com/casino/games/limbo
- Limbo guide: https://stake.com/blog/how-to-play-limbo-on-stake
- Plinko: https://stake.com/casino/games/plinko
- Plinko guide: https://stake.com/blog/how-to-play-plinko-on-stake
- Mines: https://stake.com/casino/games/mines
- Dice: https://stake.com/casino/games/dice

### Limbo

Limbo demonstrates radical control reduction. The core decision is essentially:

- bet amount;
- target payout;
- Bet.

Stake documents hotkeys and an Instant Bet option that speeds repeated play.

**GAS use:** keep the primary wager flow extremely small; offer Instant Mode; support safe hotkeys.

### Plinko

Plinko demonstrates a strong visual mapping between volatility controls and payoff distribution. Stake exposes adjustable risk and rows; higher settings change payout spread. Stake also documents Autobet, hotkeys, and Instant Bet.

**GAS use:** CRUISE / BOOST / REDLINE should visibly change the perceived distribution/volatility before the user presses IGNITION.

### Mines

Mines demonstrates dynamic risk/reward feedback after actions. Stake surfaces current profit and profit on next tile, making the risk decision visible without requiring probability calculations.

**GAS use:** show the relevant risk/payout context at the moment of choice. Do not force users into math-heavy screens.

### Dice

Dice demonstrates precise but compact probability control: chance/multiplier/pacing can change without making the base game hard to learn.

**GAS use:** advanced probability detail can exist under progressive disclosure while the default mode selector remains simple.

### Cross-game principle

Stake's strongest Originals are understandable quickly and support repeated rounds with minimal friction.

Project GAS should use:

- one primary action;
- stable control placement;
- fast repeat;
- Instant Mode;
- hotkeys where safe;
- provably-fair verification;
- visual volatility communication.

### Do not copy

- Stake proprietary game source;
- casino visual trade dress;
- exact art/animation;
- branded text/assets;
- proprietary payout tables.

GAS payout tables must be derived independently from the canonical GAS economics.

---

## 4. Existing GAS template — primary implementation foundation

Repository: `ChicoPanama/gascoin-eth`

The current codebase already provides a modern application stack:

- Next.js 16.2.2
- React 19
- TypeScript
- Privy
- wagmi / viem
- TanStack Query
- Framer Motion
- Supabase
- Sentry
- Vitest
- Playwright

Design system:

- `app/tokens.css`
- `app/globals.css`

Notable existing components/surfaces include:

- `components/HomeNav.tsx`
- wallet/auth controls
- mobile menu / adaptive nav
- `DashboardLive.tsx`
- leaderboard components
- community components
- referral components
- wallet tracker components
- `HeroStagger`
- `ScrollReveal`
- global providers/error shell

### Migration decision

**Refactor this codebase. Do not restart from a blank frontend.**

The largest rewrite is information architecture and product copy, not the underlying UI technology.

---

## 5. Synthesis matrix

| Reference | Primary lesson | GAS implementation |
|---|---|---|
| Existing GAS | Owned design + engineering foundation | Reuse/refactor |
| Fomo | Social context + action coexist | Feed, profiles, leaderboards, actionable result cards |
| ORE | Shared protocol state feels alive | Live activity, rounds, reserve/rebase state |
| Limbo | Minimal controls | Mode + wager + IGNITION |
| Plinko | Visual volatility control | CRUISE/BOOST/REDLINE distribution preview |
| Mines | Contextual risk feedback | Show risk/payout context at decision time |
| Dice | Precise advanced control under simple shell | Progressive disclosure |

## 6. Clean-room design rule

A reference pattern is acceptable when the team can describe the underlying user problem independently, then build a GAS-specific solution using our own components, copy, animation, visual identity, and code.

If the proposed implementation is recognizable because it reproduces another product's unique visual expression rather than solving the shared user problem, redesign it.
