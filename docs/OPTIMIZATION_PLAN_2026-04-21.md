# Full-stack optimization plan — GASCOIN platform

**Date:** 2026-04-21
**Status:** Plan. Nothing in this file is executed yet. Priority order = impact × (1 / risk).
**Context:** Today we shipped 5 backend cost PRs (#32–34 + X-API + AI-Gateway). Beta is live; Crush + 3 other testers are active. This plan covers everything still on the table.

---

## 0. What's already done (reference)

| Layer | State |
|---|---|
| X API | Batched search queries; follower sync 30m → 2h |
| AI Gateway (Gemini/Grok/Claude) | Upstash cache wired on tweet quality; fraud edge cache 30s → 5min; Claude already tuned |
| mem0 | Entity profile cache no longer thrashed; 4 write paths stopped invalidating |
| Supabase | Submit N+1 collapsed; performance_indexes live; wallet-lock enforcement; DRYRUN hidden from leaderboard |
| Redis | Tiered rate limits (IP + global + per-wallet); follower SISMEMBER 6h TTL |
| Beta | Wallet-lock at redemption; `/beta-guide` shipped; 6 unit tests covering Privy + wallet-lock path |
| Docs | 18 gates dynamically derived from `GATE_COUNT` everywhere |

Remaining work below.

---

## Tier 1 — ship this week (high impact, low risk)

### 1.1 Static/ISR the read-only pages

**Files:** `app/leaderboard/page.tsx`, `app/community/page.tsx`, `app/gates/page.tsx`, `app/dashboard/page.tsx`, `app/perks/page.tsx`

All currently `'use client'` at the top with client-side fetching via `useEffect`. These pages are public and non-personalized — they should be SSR + ISR.

**Plan:**
- Convert each to a server component. Move the `'use client'` boundary to leaf interactive pieces (filter buttons, realtime badges) instead of the whole page.
- Add `export const revalidate = N` where N is appropriate:
  - `/leaderboard` → 300 (5 min)
  - `/community` → 120 (2 min, fresher since it's post-approval feed)
  - `/gates` → 600 (10 min, pass rates change slowly)
  - `/dashboard` → 30 (30s, treasury stats)
  - `/perks` → 3600 (1 hour, tier config barely changes)
- For auth-gated personalization inside these pages, use `unstable_cache` + `dynamic` prop.

**Win:** 2–3s FCP on the read-heavy pages, 60%+ reduction in Supabase read volume.

### 1.2 Drop `engagement_scores` — dead table

**Finding:** `engagement_scores` has 0 rows and is fully superseded by `engagement_points` (introduced in `20260404_engagement_points.sql`). RLS enabled, but no writers left in the code.

**Plan:**
```sql
-- New migration
DROP VIEW IF EXISTS engagement_totals CASCADE;
DROP TABLE IF EXISTS engagement_scores;
```
Search the codebase for `engagement_scores` / `engagement_totals` references. Update `lib/docs-content.ts` if it mentions them.

**Win:** Removes one schema confusion; future migrations cleaner.

### 1.3 Swap bare `<img>` → `next/image`

**Finding:** 45 occurrences across `app/page.tsx`, `app/community/page.tsx`, `app/dashboard/page.tsx`, nav, etc. Bare tags bypass AVIF/WebP conversion and CDN optimization.

**Plan:**
- Bulk replace with `next/image`
- `priority={true}` for above-fold (hero, nav logo)
- `sizes="(max-width: 640px) 100vw, 50vw"` for responsive
- Add any new remote hosts to `next.config.js` `images.remotePatterns`

**Win:** 25–30% image bandwidth cut; improved CLS on image-heavy pages.

### 1.4 Add metadata exports to `/submit`, `/points`, `/marketplace`, `/creator/[handle]`

**Plan:**
- Static `export const metadata` on first three
- `generateMetadata({ params })` on `/creator/[handle]` to render dynamic OG cards per creator

**Win:** OG cards on X shares; SEO on creator profiles.

### 1.5 Vacuum tables with high dead-row ratios

**Finding:** `wallet_x_links` 5 live / 16 dead, `scored_tweets` 4 live / 26 dead, `admin_sessions` 1 / 13, `knowledge_base` 58 / 23. `last_vacuum` is null across the board.

**Plan:**
- Run `VACUUM ANALYZE` on those four tables once manually
- Verify the autovacuum tuning from `20260416_pro_security_performance_hardening.sql` (scale_factor 0.05) is actually set. The config may not apply retroactively to tables created after — check with `SELECT reloptions FROM pg_class WHERE relname IN (...)`.
- Add `wallet_x_links`, `scored_tweets`, `knowledge_base` to the autovacuum-tuned list if missing.

**Win:** Faster index scans on high-churn tables; cleaner query plans.

---

## Tier 2 — ship next week (moderate refactor)

### 2.1 Lazy-load Privy + Wagmi providers

**Finding:** `app/providers.tsx` wraps everything with `PrivyProvider` + `WagmiProvider`. Marketing pages (`/`, `/welcome`, `/how-it-works`, `/docs`, `/beta-guide`) ship ~180KB of Privy JS they never use.

**Plan:**
- Split into `AppProviders` (ThemeProvider only) and `AuthProviders` (adds Privy + Wagmi).
- Wrap `/submit`, `/me`, `/wallet`, `/dashboard`, `/referral`, `/perks`, `/admin/*` with `AuthProviders`. Leave rest in `AppProviders`.
- Use `dynamic(() => import('./AuthProviders'), { ssr: false })` for the auth boundary.

**Win:** 35–45% JS bundle reduction for 70% of traffic.

### 2.2 Vercel Runtime Cache on treasury + leaderboard + gate-stats

**Finding:** Deferred from PR #34. Treasury has 30s in-memory cache per-instance; Runtime Cache would dedupe across instances in the same region.

**Plan:**
- Wrap `getTreasuryBalances()` with `getCache().set/get` using tag `treasury`, 60s TTL.
- Wrap `/api/public/leaderboard` response with `cache-tag: leaderboard`, 120s TTL.
- Wrap `/api/public/gates` aggregation with 1h TTL.
- Invalidate via `expireTag('treasury')` on payout success, `expireTag('leaderboard')` on new claim.

**Win:** Cold-cache treasury calls drop near-zero across regions; Alchemy RPC bill halved.

### 2.3 Wire TanStack Query (or SWR) into `useLeaderboard` / `useCommunityFeed` / `useWalletHistory`

**Finding:** Hooks fire raw `fetch()` on mount with no deduping. Multiple mounting components = multiple parallel requests.

**Plan:**
- Install nothing new — `@tanstack/react-query` is already in the tree (used by Wagmi).
- Wrap each hook in `useQuery({ queryKey, queryFn, staleTime: 60_000 })`.
- Supabase Realtime subscriptions invalidate the queryKey instead of doing their own refetch.

**Win:** 70% reduction in Supabase read volume during popular-page bursts.

### 2.4 Collapse `aggregate-intelligence` worker N+1

**Finding:** Daily worker fetches all claims/payouts/points for 24h then filters per-wallet with `.filter()` in JS.

**Plan:**
- Move the aggregation into a Supabase RPC: `get_daily_wallet_activity(since_ts)` returning grouped rows.
- Replace the JS filter loops with a single RPC call.

**Win:** Worker finishes in seconds instead of minutes; avoids Vercel function timeout risk as volume grows.

### 2.5 Add `Cache-Control` headers on public API routes

**Finding:** `next.config.js` sets defaults but public read endpoints (`/api/public/leaderboard`, `/api/public/gates`, `/api/public/treasury`, `/api/public/community/stats`, `/api/public/engagement`) have no explicit cache headers.

**Plan:**
- Return `Cache-Control: public, max-age=300, stale-while-revalidate=3600` on each.
- Pair with `Vercel-CDN-Cache-Control` for granular edge control.
- Combine with Tier 2.2's Runtime Cache.

**Win:** Browser-side cache stops hitting origin; CDN edge can serve repeats.

### 2.6 Subset fonts via `next/font/google`

**Finding:** `app/layout.tsx` loads Bebas Neue + IBM Plex Sans (4 weights) + IBM Plex Mono (4 weights) via bare `<link>`.

**Plan:**
- Switch to `next/font/google` with `subsets: ['latin']` and only the weights we use.
- Drop IBM Plex Mono to lazy load (only used in code blocks/labels).
- `display: 'swap'` to avoid FOIT.

**Win:** ~45KB less blocking render CSS; better LCP.

---

## Tier 3 — larger refactors (post-launch or when we have time)

### 3.1 Full wagmi-only wallet connect (deferred from beta PR #32)

Strip Privy from the wallet connection path. Privy handles X OAuth only; wallet connect via wagmi + RainbowKit-style connector list. Reduces Privy SDK surface area and class-of-bugs like the Privy-DID-vs-X-numeric-ID regression.

Estimated: half-day refactor + full regression test of auth paths.

### 3.2 Wagmi RPC fallback chain

**Finding:** `lib/wagmi-config.ts:14` uses Alchemy URL directly, no fallback.

**Plan:** `fallback([http(ALCHEMY), http(INFURA), http(ANKR)])`. Handle all three via env vars. Removes a single point of failure.

### 3.3 Composite Influence Score v2 rollout

Plan already drafted (see earlier plan file that got overwritten). The `composite_scores` cache table exists with 4 rows from the v1 worker. Still needs the ring-density math + recency decay + trust dampener.

Estimated: ~2 hours (mostly the ring-density BFS + tests).

### 3.4 Unused-index cleanup

**Plan:** Run `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0` after 2 weeks of beta traffic. Drop indexes that never get used. Our `20260415_performance_indexes` migration added several; some may be dead weight.

### 3.5 Decide fate of empty tables

| Table | Status | Action |
|---|---|---|
| `briefs`, `applications`, `payments`, `performance_snapshots` | Marketplace, not launched | Keep, feature-flag UI |
| `certificate_mints` | Reach certs, not launched | Keep, feature-flag UI |
| `api_keys` | Intelligence API, not launched | Keep, feature-flag UI |
| `user_bans` | Auto-ban machinery, not triggered yet | Keep |
| `x_handle_history` | Handle-change detector, nothing changed yet | Keep |
| `gas_city_prices` | Intel, populated by OCR pipeline | Verify OCR pipeline actually writes here |
| `referrals`, `referral_clicks`, `referral_conversions` | Empty; no beta conversions yet | Keep |
| `wallet_token_cache` | Empty; check if on-chain read path writes here | Verify; if dead, drop |
| `performance_snapshots` | Marketplace settlement | Keep |
| `treasury_snapshots`, `market_snapshots` | Intel cron writes these | Verify the `aggregate-intelligence` worker is running |
| `engagement_scores` | **Legacy, superseded** | **DROP** (Tier 1.2) |

### 3.6 In-app `/feedback` form

From beta plan's deferred list. A proper in-app form that posts to an admin queue, ties to wallet/session, and persists screenshots. Current X DM channel works but doesn't scale past Season 1.

---

## Cookies + security posture — audit results

| Cookie | Where set | Flags | Verdict |
|---|---|---|---|
| `gc_gate` | `/api/invites/redeem` | httpOnly ✓, secure ✓, sameSite=lax ✓, maxAge 90d | ✓ correct |
| `privy-token` | Privy SDK (client) | sameSite + secure | ✓ managed by Privy |
| `privy_access_token` | Privy SDK | same | ✓ managed by Privy |
| Vercel analytics | Vercel injection | standard | ✓ |

No action needed.

---

## End-to-end fail points + misalignments

### Frontend ↔ Backend contracts

1. **`/api/invites/redeem` response shape** — added `lockedWallet` + `lockedAt` fields today. SubmitFlow now reads them, but older serviced clients (in-flight requests from cached bundles during deploy window) may not. Low risk — fields are additive.

2. **`/api/claims/submit` error codes** — new `wallet_connect_required`, `wallet_mismatch_with_locked_beta_wallet`, `not_following_gascoin`, `insufficient_followers`, `receipt_below_min_amount`. Make sure `lib/gate-messages.ts` maps all of these to user-friendly strings in SubmitFlow Step 5.

3. **`session.xSubjectId`** — populated from Privy's `linked_accounts.twitter_oauth.subject`. If a tester's Privy record doesn't have that field (older account), the fallback is `getUserByUsername`. Needs a prod watch for 48h for `follows_gascoin` false-negatives re-emerging.

### Worker reliability

4. **`process-claims` every 5 min** — if Vercel function hits the 60s maxDuration on a big claim backlog, partial progress is safe (each claim is its own transaction) but we should monitor. Plan: add a progress counter to the response body + admin alert if it ever reports truncation.

5. **`sync-gascoin-followers` every 2 hours** — single-shot refresh; if it fails twice in a row, the Redis SET goes stale. Add a retry + admin alert.

6. **`recompute-composite` daily at 8:00 UTC** — touches every active wallet. As testers grow, this could hit the 60s function limit. Plan: paginate and checkpoint (resume token in cache).

### Orphaned / dead code

7. **`engagement_scores` / `engagement_totals`** — dead (Tier 1.2).
8. **Several legacy migration files** already marked as legacy stubs after the recent reconciliation (PR #23/#28). Leave in place.

---

## Test coverage gaps

Current: 935 unit tests. Gaps:

- No tests on `/api/recheck-follow` (shipped in PR #24). Easy to add.
- No tests on `/api/beta-guide` page render. Snapshot test + locked-wallet rendering.
- No tests on `InviteGate` 3-step flow (sign-in → wallet → code). React Testing Library + mocked Privy.
- No integration test that proves `metadata.beta=true` survives Claude review path.

**Plan:** Add ~15 tests covering these before Season 1 close.

---

## Launch readiness checklist (pre-Season-1-close)

- [ ] Run `./scripts/go-live.sh` in staging first (spin up a Preview deployment with `NEXT_PUBLIC_GASCOIN_PHASE=live`)
- [ ] Verify `/beta-guide` renders "Season 1 is closed" stub when phase is live
- [ ] Verify nav link is hidden when phase is live
- [ ] Confirm `beta_participants` table has every expected tester (currently: 1 — Crush)
- [ ] Run conversion script to calculate Pioneer Bonus per locked wallet (needs writing)
- [ ] Set treasury with enough ETH for bonus payouts + first 2 weeks of organic refunds
- [ ] Flip `ENABLE_LIVE_PAYOUT=true`
- [ ] Post public launch tweet

---

## Rough effort estimate

| Tier | Estimate |
|---|---|
| Tier 1 (5 items) | ~6 hours |
| Tier 2 (6 items) | ~1.5 days |
| Tier 3 (6 items) | ~3 days |

Biggest single-PR savings: Tier 2.2 (Runtime Cache, $300+/mo) and Tier 2.1 (lazy-load auth providers, user-facing perf).

---

## Order I'd actually execute

If I'm tackling this tomorrow:

1. Tier 1.2 (drop `engagement_scores`) — 10 min, removes confusion
2. Tier 1.1 (ISR public pages) — 2h, biggest UX win
3. Tier 2.5 (Cache-Control headers) — 30 min, compounds with 1.1
4. Tier 2.2 (Runtime Cache) — 2h, hardens 1.1 across regions
5. Tier 1.5 (vacuum dirty tables) — 15 min, free perf
6. Tier 1.3 (next/image sweep) — 1h, mechanical
7. Tier 1.4 (metadata exports) — 30 min
8. Tier 2.6 (next/font subsetting) — 30 min
9. Tier 2.1 (lazy-load auth providers) — 2h, biggest bundle win
10. Tier 2.3 (TanStack Query hooks) — 1h
11. Launch readiness checklist + Season 1 close prep

Tier 3 items are post-launch polish.
