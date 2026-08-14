# GAS UX Phase 1 — Existing Repo Inventory

**Status:** ACTIVE / first parallel inventory pass
**Predecessor:** Phase 0 PASS (`ux-research/phase-0/PHASE_0_GATE.md`)

## Classification vocabulary

- `REUSE` — sound primitive or infrastructure that can carry forward substantially intact.
- `REFACTOR` — valuable structure, but current semantics/IA are tied to old GasCoin.
- `EXTEND` — useful working surface that needs GAS capabilities added.
- `BUILD` — required GAS capability with no adequate existing surface.
- `RETIRE` — old product surface that should not remain in the primary GAS journey.

## Parallel inventory lanes

Phase 1 is being executed as six parallel lanes whose outputs merge into one compatibility matrix:

1. **Routes/navigation** — every App Router segment, redirects, primary/secondary IA, deep-link behavior.
2. **Components/design** — reusable React component families, motion primitives, typography, theme, spacing and responsive behavior.
3. **Account/state** — Privy, wagmi, viem, wallet hooks, query state, persistence, session and chain assumptions.
4. **API/data** — auth/me/public/referral/social/leaderboard/API surfaces and storage/service dependencies.
5. **Recovery/testing** — loading/error boundaries, E2E/unit coverage, failure recovery and mobile/desktop test surfaces.
6. **Compatibility synthesis** — GAS capability → current implementation → action → dependency → acceptance test.

---

## 1. Application shell / platform

| Surface | Evidence | Action | GAS use |
|---|---|---|---|
| Next.js App Router shell | `app/` | REUSE | Primary GAS web application shell |
| React 19 / Next 16 | `package.json` | REUSE | Core UI runtime |
| Root responsive viewport + safe-area/PWA support | `app/layout.tsx` | REUSE | Mobile-first GAS shell |
| Theme pre-hydration | `ThemeProvider` + root layout | REUSE | Preserve flicker-free theme behavior |
| Global footer | `components/GlobalFooter.tsx` | REFACTOR | Secondary protocol/legal/docs surface |
| Global AI/chat agent | `components/GlobalChatAgent.tsx` | DEFER/REVIEW | Do not compete with primary Play/SocialFi UX until value proven |
| Old GASCOIN metadata/refund description | `app/layout.tsx` | RETIRE | Replace with Project GAS identity before visible Phase 7 prototype |

### Finding
The platform shell is mature enough to evolve. We do not need a new framework or a second frontend application.

---

## 2. Provider / account / chain stack

| Surface | Current state | Action | GAS implication |
|---|---|---|---|
| Privy provider | Twitter + external wallet; embedded wallet off | REFACTOR | Account abstraction/session UX needs a new GAS policy |
| wagmi | Existing | REUSE/EXTEND | EVM transaction/account layer |
| viem | Existing | REUSE/EXTEND | Typed EVM reads/writes |
| React Query | Existing | REUSE | Live account/game/social/monetary server state |
| Mainnet-only chain config | Current provider | REFACTOR | Final chain remains OPEN; provider UX cannot hard-code product assumptions |
| Theme-aligned Privy modal | Existing | REUSE | Preserve GAS-native auth styling |

### Important gap
Current auth was optimized for the old refund flow and deliberately disables embedded wallets. GAS needs a Phase 6 account policy covering sign-in methods, embedded/smart account behavior, bounded Play authorization, gas sponsorship, recovery and cross-device continuity. Do not change this during Phase 1; inventory it as a dependency.

---

## 3. Existing route families

### Strong candidates to reuse/refactor

| Route/surface | Action | Future role |
|---|---|---|
| `/dashboard` | REFACTOR | Account/home state or protocol dashboard primitives |
| `/leaderboard` | EXTEND | Social ranking / activity / player discovery |
| `/community` | RETIRE AS ROUTE / preserve redirect compatibility | Social should be integrated; route already redirects to leaderboard Recent tab |
| `/creator` | REVIEW/EXTEND | Possible creator/profile/crew tools later |
| `/marketplace` | REVIEW | Not assumed to survive; evaluate against GAS Trade/Play IA |
| `/docs` | REUSE AS SECONDARY | Protocol/docs disclosure, not primary nav |
| `/gates` | RETIRE/REPURPOSE | Old verification-gate semantics are not a primary GAS concept |
| `/how-it-works` | REFACTOR | Progressive protocol education, secondary |
| `/admin` | REUSE/REVIEW | Operations only; outside consumer IA |

### Old-product surfaces
Receipt/refund/submission/beta-guide and claim-verification journeys are not part of the new primary GAS product. Preserve only infrastructure primitives that remain useful.

### New GAS routes likely required
- `/play`
- `/play/gas`
- `/play/roulette`
- `/trade`
- `/crews`
- `/profile/[identity]` or equivalent identity route
- `/reserve`
- `/account` / wallet surface

Exact routing is a **Phase 6 information-architecture decision**, not a Phase 1 commitment.

---

## 4. Navigation

Existing navigation primitives include:
- `components/Nav.tsx`
- `components/HomeNav.tsx`
- `components/NavActionsMenu.tsx`
- `components/AuthNavButton.tsx`

**Classification: REFACTOR.**

Why: the implementation primitives, responsiveness and account-aware actions are valuable, but the destination hierarchy belongs to old GasCoin. Phase 6 will rebuild navigation around GAS Home / Play / Trade / Social-Crews / Reserve / Account with mobile bottom-navigation behavior benchmarked against references.

---

## 5. Social / leaderboard bones

Existing assets include:
- `/leaderboard` server/client split;
- `LeaderboardHeader`;
- `LeaderboardStatsStrip`;
- `PodiumSection`;
- `RankingsTable`;
- `WalletDrillDown`;
- `PointsDashboard`;
- `CommunityFeed`;
- `useLeaderboard`;
- `useGascoinWallet`.

The current Leaderboard client already:
- preserves tab state in the URL;
- handles browser back/forward changes;
- switches tabs without scroll reset;
- exposes a Recent/community feed inside the same shell;
- includes explicit loading/error surfaces.

**Classification: EXTEND / HEAVY REFACTOR.**

This is valuable prior art for GAS SocialFi. Phase 2 Fomo research should be mapped directly against these existing components instead of designing a disconnected replacement.

Potential reuse:
- rankings/podium mechanics → player/Crew rankings;
- Recent feed shell → global/following GAS activity;
- wallet drilldown → player profile/activity detail pattern;
- query-state/error/loading handling → social data resilience.

Do not retain old points/refund metrics without a new GAS rationale.

---

## 6. Existing live/dashboard primitives

Identified components include:
- `DashboardLive.tsx`
- `LiveTreasuryBar.tsx`
- `CinematicIntro.tsx`

Classification:
- `DashboardLive`: REFACTOR/EXTEND — potential Home live-state substrate.
- `LiveTreasuryBar`: REFACTOR — potential Reserve/rebase/network-status primitive, but old treasury semantics must not be confused with GAS external backing.
- `CinematicIntro`: REVIEW — motion primitive may inform experiential mode; do not force intro friction.

---

## 7. Design system / styling

Current assets:
- `app/globals.css` (~255 KB; major existing visual system)
- `styles/me-sidebar.css`
- `styles/wallet-override.css`
- IBM Plex Sans
- IBM Plex Mono
- Bebas Neue
- theme variables / dark-light support
- skip navigation and accessible root structure

**Classification: REUSE + NORMALIZE.**

Phase 1 must extract the existing tokens/primitives from the oversized global stylesheet into a documented GAS design-token map. Phase 5 may later convert those primitives into the canonical GAS Pattern Library.

Do not replace the established GAS black/off-white/industrial visual identity with reference-product colors.

---

## 8. API/backend route families

Current `app/api` includes route families for:
- admin
- auth
- chat
- claims
- health
- invites
- X linking
- current-user (`me`)
- public data
- receipt image
- follow recheck
- referral
- RPC
- versioned API (`v1`)
- verify
- webhooks

### Initial classification

`REUSE/EXTEND` candidates:
- auth;
- health;
- invites;
- me/profile;
- public-data patterns;
- referral;
- RPC abstraction;
- versioning/webhook infrastructure where generic.

`RETIRE/ISOLATE` candidates:
- claims;
- receipt-image;
- old verification/follow/refund-specific flows unless a generic primitive is reused.

`REVIEW`:
- chat/AI surface — retain only if it improves a measured GAS journey.

Phase 1 must inspect route internals before final classification; this table is the first-pass ownership map.

---

## 9. Library / service layer

The `lib/` tree is substantial and includes account quality, admin auth, AI points, API gating, attribution, audit logging, auto-ban, caching, chat context/security/tools/profile and other operational services.

### Principle
Do not delete infrastructure merely because the old product semantics are obsolete. Classify each service by whether it is:
1. generic platform/security infrastructure;
2. reusable identity/social infrastructure;
3. old refund-specific domain logic;
4. potentially dangerous conceptual carryover.

Security/rate-limit/audit/cache primitives should generally be preserved unless superseded.

---

## 10. Testing / recovery baseline

Existing E2E suite contains:
- homepage tests;
- navigation tests;
- page tests;
- responsive tests;
- fixtures;
- global setup;
- page objects;
- new `e2e/ux` benchmark utilities.

Playwright already runs:
- Desktop Chrome;
- Pixel-class mobile Chrome;
- iPhone-class mobile Safari.

Existing configuration retains traces on retry, screenshots on failure and failure videos.

**Classification: REUSE + EXTEND.**

Phase 10 benchmark work should extend this suite rather than create a parallel runner.

Missing GAS-specific tests to add later:
- IGNITION/replay;
- refresh mid-round;
- double-submit protection;
- permission expiry;
- connectivity/RPC degradation;
- delayed RNG/settlement;
- Buy/Sell GAS;
- rebase comprehension;
- social result → matching game;
- accessibility/touch-target checks.

---

## 11. Phase 1 build/reuse summary

### REUSE
- Next/React application shell
- PWA/safe-area root behavior
- core typography and theme mechanism
- wagmi/viem/React Query foundations
- Playwright/Vitest infrastructure
- generic security/cache/audit infrastructure subject to deeper service audit

### REFACTOR / EXTEND
- Privy/account policy
- navigation
- dashboard/live state
- leaderboard/recent feed
- profile/wallet drilldown concepts
- referrals/invites
- treasury presentation
- public/me/auth API surfaces

### BUILD
- GAS Original Play surface
- GAS Gauge + IGNITION state machine
- unified GAS account semantics
- Trade GAS flow
- Reserve/Rebase product surfaces
- Crews and following graph where missing
- canonical GAS social result object
- game/settlement state recovery layer
- future Bracket position shell

### RETIRE FROM PRIMARY PRODUCT
- receipt/refund/claim submission IA
- old community-as-separate-destination mental model
- refund-specific hero/metadata
- old verification-gate consumer journey

---

## 12. Phase 1 gate work remaining

The first pass is committed, but Phase 1 stays open until the six parallel lanes reconcile into a complete matrix. The next agent-ready work is:

- recursively enumerate App Router segments and classify every consumer route;
- enumerate component subdirectories and detect generic primitives versus old-domain components;
- extract design tokens/breakpoints/motion primitives from CSS into structured JSON;
- inspect wallet hooks, wagmi config and persistence/error behavior;
- inspect auth/me/public/referral/social/leaderboard endpoints and their service dependencies;
- enumerate loading/error boundaries and current resilience coverage;
- merge findings into `compatibility-matrix.seed.json` and remove `seed` status at gate.

### Phase 1 gate
Phase 1 passes only when the above are merged into a machine-readable compatibility matrix:

`GAS capability -> current path/component/service -> reuse action -> dependency -> protocol constraint -> acceptance test`

**Current phase remains Phase 1 until that matrix is complete.**
