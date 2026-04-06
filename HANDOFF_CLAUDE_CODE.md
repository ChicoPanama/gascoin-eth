# GASCOIN Platform — Claude Code Handoff

_Last updated: 2026-04-05 (America/Los_Angeles)_

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
- Repo exists locally (`git rev-parse` = true)
- Current branch: `main`
- No git remote is currently configured in this local repo (`git remote -v` returned none)

Meaning:
- Right now, the authoritative editable source is the **local folder + deployed Vercel snapshots**.
- If you want durable version control collaboration, next action is adding a remote and pushing `main`.

---

## 2) Current status snapshot

### Wallet connect / auth UX
- Top-right nav is the single sign-in entrypoint (policy-compliant).
- Auth button behavior:
  - signed out → `Sign in`
  - signed in without linked wallet → `Connect wallet`
  - signed in with wallet → shows identity + wallet + `Logout`
- No inline page login buttons (removed).

### Privy integration
- Client auth flow active.
- Server verification migrated to official `@privy-io/node` path.
- Backend supports Bearer token and Privy cookie parsing.
- Fallback hint path exists for stability in sync/submit/reviewer routes.

### Admin flow
- `/admin` actions moved from form posts to authenticated client fetches.
- Prior `unauthorized_reviewer` bug addressed via tokened admin actions + reviewer lookup hardening.

### Build/deploy
- Latest local build passed.
- Latest production deploy passed and is aliased to `platform-ebon-nine`.

---

## 3) Key files touched for auth/wallet/admin

- `app/providers.tsx`
- `components/Nav.tsx`
- `components/AuthNavButton.tsx`
- `components/PrivySubmit.tsx`
- `components/AdminQueueClient.tsx`
- `app/admin/page.tsx`
- `app/api/auth/sync/route.ts`
- `app/api/claims/submit/route.ts`
- `app/api/claims/[id]/review/route.ts`
- `lib/integrations/privy.ts`
- `lib/reviewer-auth.ts`

## 3b) Key files touched for X API + xAI optimization (2026-04-05)

- `lib/x-api.ts` — Rewritten: base URL fixed (api.x.com), added `XPublicMetrics` type, `searchRecentTweets`, `extractMetrics`, `getUserByUsername`
- `lib/engagement-rewards.ts` — Added `POINTS_PER_BOOKMARK: 150`, bookmarks in all calculations
- `lib/ai-points-engine.ts` — Unchanged, but now receives bookmark data from updated workers
- `app/api/workers/score-engagement/route.ts` — v3: removed 50-handle cap, reads bookmark_count, real wallet trust (batch-fetched), uses x-api helpers
- `app/api/workers/sync-x-handles/route.ts` — **NEW**: detects X handle changes, updates wallet_x_links + scored_tweets, backfills x_user_id, marks stale links
- `app/api/public/engagement/route.ts` — Upgraded: queries scored_tweets + engagement_points, returns points_by_source breakdown + tweet_metrics
- `app/page.tsx` — Merged hero sections 03+04 into unified "X + xAI Intelligence Pipeline" section
- `supabase/migrations/20260405_scored_tweets_bookmarks.sql` — Adds bookmarks column to scored_tweets
- `vercel.json` — Added sync-x-handles cron (daily 3am UTC)

---

## 4) Known open items

1. Re-validate admin Approve/Reject/Ban end-to-end on prod after latest deploy.
2. Configure production scheduler for:
   - `POST /api/workers/process-claims`
3. Token-launch env finalization pending:
   - `GASCOIN_MINT`
   - `GASCOIN_TREASURY_WALLET`
4. Security cleanup:
   - rotate exposed/temporary tokens and normalize deploy auth to one scoped Vercel token.
5. Optional hardening pass:
   - reduce/remove `allowHintFallback` once strict token verification is consistently stable.
6. Run `20260405_scored_tweets_bookmarks.sql` migration on Supabase.
7. Future X API enrichment (when ready):
   - Post Analytics API (`GET /2/tweets/analytics`) — requires user OAuth flow for deeper metrics (link_clicks, profile_visits, detail_expands).
   - Filtered Stream (`GET /2/tweets/search/stream`) — real-time #gascoin tweet detection; supplements (does not replace) 6h rescore cron.
   - X Activity API — subscribe to profile update events for real-time handle change detection (alternative to daily sync worker).

---

## 5) How Claude Code should continue (recommended runbook)

> **After X API optimization (2026-04-05):** Run the bookmarks migration, deploy, then verify `score-engagement` and `sync-x-handles` workers fire correctly on their cron schedules.

1. Open project:
   - `/Users/arcadioperalta/.openclaw/workspace/GASCOIN/platform`
2. Install + verify:
   - `npm install`
   - `npm run build`
3. Smoke critical routes locally:
   - `/`
   - `/submit`
   - `/admin`
   - `/api/auth/sync`
   - `/api/claims/submit`
   - `/api/claims/[id]/review`
4. Validate Privy behavior in browser:
   - top-right sign-in only
   - wallet linking prompts correctly
   - admin review actions succeed with authenticated session
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

---

## 8) Suggested immediate next action

Set git remote + push current `main` so Claude Code handoff is repo-backed (not local-only). Example:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

After that, Claude Code can work with a stable remote history and PR flow.
