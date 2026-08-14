# EXISTING GAS TEMPLATE — REUSE INVENTORY

Repository reviewed: `ChicoPanama/gascoin-eth`  
Branch used as migration base: `main`

## 1. Stack inventory

From `package.json`:

- Next.js 16.2.2
- React 19
- TypeScript
- Privy React/Auth + Node
- wagmi + viem
- TanStack Query
- Framer Motion
- Supabase
- Sentry
- Upstash Redis / rate limiting
- Vercel Edge Config / Functions
- Vitest
- Testing Library
- Playwright

**Decision:** retain this stack for Project GAS unless a bead proves a concrete reason to replace a dependency.

## 2. Design-system inventory

### `app/tokens.css`

Strong reuse candidate.

Existing capabilities:

- black dark mode / white light mode;
- off-white and discrete gray text hierarchy;
- semantic card/background tokens;
- button/nav/hero tokens;
- glass system;
- status pass/fail/pending/warn/info;
- spacing scale;
- Bebas / IBM Plex Sans / IBM Plex Mono roles;
- fluid typography;
- transition/easing tokens;
- reduced motion.

**Action:** preserve neutrals/type/spacing/motion foundation; add GAS energy/gauge/reserve/game semantic tokens.

### `app/globals.css`

Large mature global stylesheet. Must be audited before deletion/refactor to avoid breaking existing responsive behavior.

**Action:** do not rewrite wholesale in one bead. Introduce Project GAS component classes/tokens and remove legacy styles incrementally with route deletion.

## 3. App shell

### `app/layout.tsx`

Reuse provider/layout metadata structure after product naming cleanup.

### `app/providers.tsx`

Reuse application provider composition where compatible with new protocol connection needs.

### `app/global-error.tsx`

Reuse error boundary pattern.

### `components/HomeNav.tsx`

Current navigation is technically useful but informationally obsolete.

Existing behavior:

- Next Link/path active state;
- Privy auth awareness;
- adaptive/compact navigation;
- wallet button;
- auth button;
- mobile menu;
- actions menu;
- theme toggle.

Legacy links currently include How It Works, Submit, Treasury, Leaderboard, Standing, Gates, and Tracker.

**Action:** refactor shell to Home / Play / Trade / Crews / Reserve and add mobile bottom-nav architecture while retaining wallet/auth behavior.

## 4. Existing route inventory relevant to reuse

Observed routes include:

- `/community`
- `/dashboard`
- `/leaderboard`
- `/me`
- `/referral`
- `/wallet`
- `/presale`
- `/docs`
- `/how-it-works`
- `/gates`
- `/standing`
- `/submit`
- `/welcome`

### Likely reuse value

**High:**

- wallet
- me/profile
- community infrastructure
- leaderboard infrastructure
- referral infrastructure
- dashboard data-card/layout patterns
- presale pieces after economics rewrite

**Medium:**

- welcome/onboarding
- docs shell
- generic admin utilities

**Low / legacy-product-specific:**

- submit receipt flow
- gates UI
- standing tied to old refund program
- old how-it-works content

No deletion should occur until the owning bead identifies imported utilities and shared dependencies.

## 5. Existing component inventory relevant to Project GAS

Observed reusable families:

- `HomeNav`
- `AuthNavButton`
- `NavActionsMenu`
- `WalletButton`
- `MobileMenu`
- adaptive-nav hook
- `ThemeToggle`
- `DashboardLive`
- `LiveTreasuryBar`
- leaderboard components
- community components
- referral components
- wallet-tracker components
- `HeroStagger`
- `ScrollReveal`
- global chat/agent components if later useful

## 6. Home page migration

Current `app/page.tsx` is substantial and tightly coupled to the old refund mission.

Legacy hero:

- gas-refund positioning;
- Tweet / Post / Submit / paid-back flow;
- receipt verification;
- beta claims/testers;
- old treasury display assumptions.

Useful technical patterns inside it:

- server-side/live metric loading;
- fallbacks;
- animated hero primitives;
- stats cards;
- section layout;
- responsive structure.

**Action:** rebuild the content tree for Project GAS while salvaging generic layout/data-loading patterns only where they reduce risk.

## 7. New Project GAS components required

Create under coherent domain namespaces rather than accumulating one-off components.

Suggested:

```text
components/gas/
  GasGauge.tsx
  IgnitionButton.tsx
  RiskSelector.tsx
  WagerControls.tsx
  GameResult.tsx
  GameStatus.tsx

components/live/
  LiveActivityTape.tsx
  ActivityRow.tsx
  NetworkStatus.tsx

components/social/
  ResultCard.tsx
  CrewCard.tsx
  ProfileChip.tsx
  LeaderboardRow.tsx

components/monetary/
  GasPrice.tsx
  RebaseClock.tsx
  ReserveMeter.tsx
  BackingBreakdown.tsx
  ReserveAssetRow.tsx

components/provably-fair/
  ProvablyFairSheet.tsx
  RoundVerification.tsx

components/navigation/
  DesktopAppNav.tsx
  MobileBottomNav.tsx
```

Existing component paths can be migrated gradually rather than reorganized in one high-risk change.

## 8. Test assets to retain

`package.json` already exposes:

- unit tests;
- coverage;
- Playwright E2E;
- full test aggregate.

Project GAS should build its UX quality gates into existing test infrastructure rather than creating a parallel harness.

Required new E2E suites eventually include:

- mobile core Play viewport;
- IGNITION state machine;
- transaction rejection/retry;
- repeated play;
- Instant Mode;
- reduced motion;
- result verification;
- result deep link;
- wallet disconnect/reconnect;
- reserve degraded data state;
- live feed empty/degraded state.

## 9. Migration risk controls

1. Do not delete legacy routes and styles in the same bead that builds the new core game.
2. Keep new Project GAS routes feature-isolated until smoke tests pass.
3. Move navigation only after destination routes exist.
4. Replace old Home only after new Home passes responsive and loading-state tests.
5. Remove legacy database/API dependencies only after reference search proves they are no longer imported.
6. Keep protocol contracts/accounting work separate from presentation-layer refactors.

## 10. Conclusion

The existing repository is not a throwaway prototype. It is a useful application platform whose **product model is obsolete but engineering shell is reusable**.

The Project GAS migration should therefore be executed as controlled replacement of domain surfaces on top of retained infrastructure, not as a greenfield UI rewrite.
