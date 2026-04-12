# GASCOIN Platform — Grok Integration Handoff

_Last updated: 2026-04-06 (America/Los_Angeles)_

## 1) Where the files come from (source of truth)

Primary working source:
- Local workspace on this machine:
  - `/Users/arcadioperalta/.openclaw/workspace/GASCOIN/platform`

Deployment target:
- Vercel project: `chicopanamas-projects/platform`
- Vercel config binding (local): `.vercel/project.json`
  - `projectId: prj_bCmFbQK68K0JfB0Dn01qsmeO2xqy`
  - `orgId: team_i6eeRwnlf6O6wxI0lWHPEALj`
- Current live alias:
  - `https://platform-ebon-nine.vercel.app`

Git state:
- Repo: `ChicoPanama/gascoin` on GitHub
- Branch: `main`
- Remote: `origin` configured and in sync

---

## 2) Current status snapshot

### Nav order (trust-first flow)
```
Submit  Treasury  Community  Leaderboard  Refer  Perks  Gates  Tracker  Docs
```
Identical on homepage (`HomeNav`) and all inner pages (`Nav`).

### Wallet connect / auth UX
- Both `WalletButton` + `AuthNavButton` present on every page (homepage and inner).
- Auth button behavior:
  - loading → disabled `Loading...` placeholder (never null/vanishing)
  - signed out → `Sign in with X`
  - signed in (X only) → `@handle` + `Logout`
  - signed in (X + wallet) → unified `@handle` + truncated wallet + `Logout`
- Wallet button behavior:
  - idle → `CONNECT WALLET`
  - connecting → `CONNECTING...` (15-second timeout)
  - timed out → `RETRY` (resets adapter, reopens modal)
  - connected → truncated address + disconnect
- Auto wallet ↔ X handle linking via `/api/link-x` on both connect.
  - Tracks wallet address to re-link on wallet switch (no stale linkedRef).
  - Retries on network failure.

### Hero page (app/page.tsx)
- 4 tech pipeline sections: AI Receipt Processing → 4-Layer Fraud Detection → X + xAI Intelligence Pipeline → Automated Referral Pipeline
- Tags: `INTEGRATED WITH GROK`, `INTEGRATED WITH GROK`, `X API V2 · xAI-POWERED SCORING · AUTOMATED`
- No algorithm scoring weights exposed to users
- Gate count: 10 (matches `lib/gates.ts`)
- Referrals earn points, not SOL (everywhere)

### Points system
- Engagement: impressions (1), likes (25), retweets (50), quote tweets (500), replies (300), bookmarks (250)
- Content type multipliers: original video 3x, image 1.5x, text 1x, quote 0.5x, link 0.3x, repost 0.1x
- Referral: 100pt welcome bonus + 2% ongoing passive income (capped 10K/month)
- Submission: 1000 points per approved receipt (min $5 amount)
- Streak: 500 per consecutive 30-day window (max 5x)
- Holdings: 100-5,000 per day by tier (Standard 100, Commuter 500, RW 1500, Fleet 5000)
- Caps: 5K/tweet, 10K/day, 50K/month engagement
- Composite score: Holdings 55% + Engagement 25% + Referrals 20%
- All awards pass through AI verification gate (`lib/ai-points-engine.ts`)

### Privy integration
- Client auth flow active. Login method: Twitter only.
- Server verification via `@privy-io/node`.
- Fallback hint path exists (`allowHintFallback`).

### Build/deploy
- Latest build: 0 errors, 0 warnings
- TypeScript: 0 errors (`npx tsc --noEmit`)
- Tests: 145/145 pass (`npx vitest run`)

---

## 3) Key files — auth/wallet/admin

- `app/providers.tsx` — PrivyProvider + SolanaProvider wrapper
- `components/Nav.tsx` — standard nav (all inner pages)
- `components/HomeNav.tsx` — homepage nav
- `components/AuthNavButton.tsx` — sign in / unified identity display
- `components/ui/WalletButton.tsx` — wallet connect with timeout
- `components/PrivySubmit.tsx` — privy-authenticated submission
- `components/AdminQueueClient.tsx` — admin queue
- `app/api/auth/sync/route.ts`
- `app/api/claims/submit/route.ts`
- `app/api/claims/[id]/review/route.ts`
- `lib/integrations/privy.ts`
- `lib/reviewer-auth.ts`

## 3b) Key files — X API + xAI + engagement

- `lib/x-api.ts` — X API v2 client (api.x.com), search, metrics, user lookup
- `lib/engagement-rewards.ts` — points config + calculation (incl. bookmarks)
- `lib/ai-points-engine.ts` — 4 AI modules: tweet quality, ring detection, wallet trust, audit narrator + pre-award gate
- `app/api/workers/score-engagement/route.ts` — v3: all handles, real trust data, bookmarks
- `app/api/workers/sync-x-handles/route.ts` — daily handle change detection
- `app/api/public/engagement/route.ts` — full engagement data endpoint
- `lib/integrations/x.ts` — tweet verification + oEmbed fallback
- `supabase/migrations/20260405_scored_tweets_bookmarks.sql` — bookmarks column

## 3c) Key files — audit fixes (2026-04-05/06)

- `app/page.tsx` — gate count 11→10, hero sections merged, algorithm weights removed, fraud detection tag
- `app/admin/referrals/page.tsx` — SOL→Points throughout (stats, table, approve button, pipeline description)
- `app/referral/page.tsx` — SOL→Points (header, monthly meter)
- `components/community/ReceiptModal.tsx` — hardcoded 11→GATES.length
- `app/gates/page.tsx` — hardcoded 10→GATES.length
- `components/SubmitFlow.tsx` — window globals gated to dev-only with cleanup
- `e2e/01-homepage.spec.ts` — fixed Playwright toHaveCount API usage

---

## 4) Known open items

1. Re-validate admin Approve/Reject/Ban end-to-end on prod after latest deploy.
2. Token-launch env finalization pending:
   - `GASCOIN_MINT`
   - `GASCOIN_TREASURY_WALLET`
3. Security cleanup:
   - rotate exposed/temporary tokens and normalize deploy auth to one scoped Vercel token.
4. Optional hardening pass:
   - reduce/remove `allowHintFallback` once strict token verification is consistently stable.
5. Run `20260405_scored_tweets_bookmarks.sql` migration on Supabase.
6. Future X API enrichment (when ready):
   - Post Analytics API (`GET /2/tweets/analytics`) — requires user OAuth flow.
   - Filtered Stream (`GET /2/tweets/search/stream`) — real-time #gascoin tweet detection.
   - X Activity API — profile update events for real-time handle change detection.

---

## 5) How Grok integration should continue (recommended runbook)

> **After latest changes (2026-04-06):** Run the bookmarks migration, deploy, verify `score-engagement` and `sync-x-handles` workers fire on cron, confirm nav order renders correctly on all pages.

1. Open project:
   - `/Users/arcadioperalta/.openclaw/workspace/GASCOIN/platform`
2. Install + verify:
   - `npm install`
   - `npm run build`
3. Smoke critical routes locally:
   - `/` — hero, nav order, tech pipeline
   - `/submit` — full submit flow
   - `/dashboard` — treasury stats
   - `/admin` — admin actions
4. Validate auth behavior in browser:
   - `Sign in with X` button visible on homepage and inner pages
   - wallet connect → shows address, no freeze
   - both connected → unified `@handle` + wallet display
5. Deploy:
   - `vercel --prod`
6. Post-deploy smoke:
   - live alias checks + admin action retest.

---

## 6) Worker schedule (vercel.json crons)

| Worker | Schedule | Purpose |
|--------|----------|---------|
| `process-claims` | `*/5 * * * *` | Transition claims, process payout queue |
| `verify-referrals` | `*/15 * * * *` | Auto-verify referrals, ring detection |
| `score-engagement` | `0 */6 * * *` | Scan X for #gascoin tweets, AI score, award points |
| `award-points` | `0 6 * * *` | Daily submission/streak/holdings points + AI audit |
| `flush-receipts` | `0 3 * * 0` | Weekly receipt cleanup |
| `sync-x-handles` | `0 3 * * *` | Daily handle change detection + wallet link repair |

---

## 7) Operational guardrails (keep)

- Keep site availability first; rollback quickly if auth changes break runtime.
- Do not reintroduce inline login buttons on pages.
- Keep login entrypoint in top-right nav only.
- Keep `ENABLE_LIVE_PAYOUT=false` until launch checks are complete.
- Referrals earn POINTS, never SOL. SOL payouts are for gas receipts only.
- Do not expose algorithm scoring weights in user-facing copy.
- Gate count must use `GATES.length`, never hardcoded numbers.
