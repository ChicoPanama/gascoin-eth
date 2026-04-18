# GASCOIN — Attack Surface Map (Phase 1)

> **Purpose:** Reconnaissance-only. Documents every entry point, trust boundary, and preliminary security observation. No patches applied. Findings tagged CRITICAL/HIGH/MEDIUM/LOW/INFO.
> **Date:** 2026-04-17 | **Auditor:** Internal adversarial review

---

## 1. HTTP ENDPOINT CATALOG

### Legend
- **Auth** — `none` | `privy` (session) | `reviewer` (admin RBAC) | `cron` (CRON_SECRET) | `admin-cookie` (admin session)
- **RL** — rate limit (limit / window / key)
- **⚠** — preliminary security observation

---

### 1.1 Submission

| Method | Path | Auth | RL | Side Effects |
|--------|------|------|----|-------------|
| POST | `/api/claims/submit` | privy | 12/min/IP + 30/min global AI | OCR (Gemini), X API ×3, Solana RPC, DB writes (claims, gate_results, claim_receipts, audit_logs), Storage upload, mem0 |
| POST | `/api/claims/[id]/review` | reviewer | 60/min/IP (proxy) | DB writes (claims, claim_status_events, audit_logs, user_bans) |

**⚠ submit response returns `hashSha256` + `pHash` to client** — exposes fraud-detection internals. An attacker can engineer near-duplicate receipts that land below the pHash hamming distance threshold.
(`app/api/claims/submit/route.ts:669-670`)

---

### 1.2 Auth

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| GET | `/api/auth/session` | privy | 30/min/IP | Returns PII: xId, xHandle, wallet |
| POST | `/api/auth/sync` | privy | 20/min/IP | Upserts users + wallet_links; wallet-takeover guard present |
| POST | `/api/invites/redeem` | privy | 10/5min/IP | Atomic invite claim; sets httpOnly gate cookie |

---

### 1.3 Verification Utilities

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| POST | `/api/verify/tweet` | **NONE** | 5/min/IP | Runs tweet gates; if `claim_id` provided, **upserts `gate_results` without ownership check** |
| POST | `/api/link-x` | privy | 60/min (proxy) | Upserts `wallet_x_links`; **body `x_handle`/`x_user_id` not validated against Privy session** |

**⚠ CRITICAL: `POST /api/verify/tweet`** — unauthenticated caller with a valid tweet URL and any UUID claim_id can write arbitrary `passed`/`score`/`reason_code` to `gate_results`. (`app/api/verify/tweet/route.ts:26-36`)

**⚠ HIGH: `POST /api/link-x`** — body-supplied `x_handle`/`x_user_id` is trusted over Privy-verified identity. Authenticated user can register any X handle to their wallet in `wallet_x_links`, stealing engagement-point attribution from that handle. (`app/api/link-x/route.ts:23`)

---

### 1.4 Admin

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| GET | `/api/admin/queue` | reviewer | 30/min/reviewer | Returns queued claims with mem0 flags |
| GET/POST | `/api/admin/intelligence` | reviewer | 30/min/reviewer | Intelligence feed read/ack |
| POST | `/api/admin/erase-user` | reviewer + admin-role | none | Hard-deletes across 10 tables; no soft-delete/undo; `scored_tweets` may persist if wallet not resolved |

---

### 1.5 Receipt Image

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| GET | `/api/receipt-image?path=` | reviewer | 30/min/IP | Path-traversal guarded; returns signed URL (3600s) to `receipts-private` |

---

### 1.6 Dashboard / Profile

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| GET | `/api/me` | privy | 60/min (proxy only) | Returns full PII: claims, payouts, referrals, points, tier, leaderboard rank. No per-user sub-limit. O(n) leaderboard scan per call. |
| GET | `/api/chat/profile` | privy | 60/min (proxy) | Wallet context for chat widget |

---

### 1.7 Chat

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| POST | `/api/chat` | optional privy | 20/min/IP | OpenRouter/AI Gateway; 60s timeout; mem0 writes; `body.wallet` used if session missing |

**⚠ MEDIUM: chat `body.wallet`** — if no session, wallet context is taken from the request body. An unauthenticated user can supply any wallet to query its chat profile. Confirm scope of tool calls against `buildChatTools`.

---

### 1.8 Public Reads

| Method | Path | Auth | RL | Returns |
|--------|------|------|----|---------|
| GET | `/api/public/treasury` | none | 10/min/IP | SOL + GASCOIN balances, wallet address, capacity |
| GET | `/api/public/treasury/history` | none | none | 7-day SOL balance history |
| GET | `/api/public/claims` | none | 30/min/IP | Last 100 payouts + X handles (PII) — **claim UUIDs exposed** |
| GET | `/api/public/gates` | none | 20/min/IP | Gate pass-rate stats |
| GET | `/api/public/engagement?wallet=` | none | 20/min/IP | Tweet metrics + point breakdown for any wallet |
| GET | `/api/public/market` | none | none | Price snapshot |
| GET | `/api/public/gas-prices` | none | none | Hardcoded array |
| GET | `/api/public/points-summary` | none | 20/min/IP | All-wallet engagement stats; full table scan |
| GET | `/api/public/community/stats` | none | 20/min/IP | Payout aggregates + countries |
| GET | `/api/public/memory/context` | none | 20/min/IP | Static JSON from `public/` |

**⚠ INFO: `/api/public/claims` returns claim UUIDs.** Combined with `POST /api/verify/tweet` (no auth), these UUIDs can be used to write to `gate_results` for any claim.

**⚠ INFO: `/api/public/treasury` exposes treasury wallet address.** Expected for transparency, but combined with on-chain data allows mapping treasury SOL flow.

---

### 1.9 Referral

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| GET | `/api/public/referrals?wallet=` | none | 10/min/IP | Read referrals for any wallet |
| POST | `/api/public/referrals` | **NONE** | 5/min/IP | **Creates referral row with wallet validation only** |
| POST | `/api/referral/click` | none | 10/min/IP | Inserts referral click; `/24` IP prefix fingerprint — easily rotated |

**⚠ MEDIUM: `POST /api/public/referrals`** — unauthenticated, wallet-format-only validation. An attacker can pre-claim a referral slot for a victim wallet before the victim signs up, potentially blocking or hijacking their referral attribution. No per-wallet rate limit.

---

### 1.10 Solana RPC Proxy

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| POST | `/api/rpc` | **NONE** | 100/min/IP | Proxies allowlisted methods (read + **sendTransaction**) through Helius |

**⚠ MEDIUM: `sendTransaction` is proxied.** Any user can submit arbitrary signed transactions to the blockchain through GASCOIN's paid Helius endpoint. Not a treasury-draining vector (requires caller's own private key), but allows unlimited Helius RPC cost-abuse within the 100/min rate limit.

---

### 1.11 Webhooks

| Method | Path | Auth | RL | Notes |
|--------|------|------|----|-------|
| POST | `/api/webhooks/mem0` | Bearer `MEM0_WEBHOOK_SECRET` | 1h Redis dedup | Writes audit_logs + intelligence_entries |
| GET | `/api/webhooks/mem0` | none | — | Returns `{ secret_configured: bool }` |

**⚠ LOW: `GET /api/webhooks/mem0`** leaks whether `MEM0_WEBHOOK_SECRET` is configured.
**⚠ LOW: mem0 secret comparison** uses plain `!==` — not timing-safe. Other comparisons in codebase use `timingSafeEqual`. (`app/api/webhooks/mem0/route.ts:86`)

---

### 1.12 Workers / Crons

All use `isAuthorizedCron` (Bearer `CRON_SECRET`, timing-safe, fail-closed when unset).

| Path | Schedule | Key Operations |
|------|----------|----------------|
| `POST /api/workers/process-claims` | `*/5 * * * *` | Auto-approve `ready_for_dispatch`, Claude oversight, create payout_jobs, dispatch payouts |
| `POST /api/workers/verify-referrals` | `*/15 * * * *` | Ring detection, referral point award |
| `POST /api/workers/score-engagement` | `0 * * * *` | Tweet scoring, AI points |
| `POST /api/workers/sync-gascoin-followers` | `*/30 * * * *` | Rebuild Redis follower SET |
| `POST /api/workers/award-points` | `0 6 * * *` | Daily points, flash-loan balance check |
| `POST /api/workers/flush-receipts` | `0 3 * * 0` | Delete receipts >90 days |
| `POST /api/workers/sync-x-handles` | `0 3 * * *` | Handle-change detection |
| `GET /api/workers/pre-payout-verify` | `55 23 * * *` | Re-verify approved claims; reverts to `needs_review` |
| `POST /api/workers/aggregate-intelligence` | `0 7 * * *` | Daily mem0 + Grok summary |
| `POST /api/workers/payout` | on-demand (no cron) | Body-driven: `{ claimId, wallet, amountSol }` → payout_jobs |

**⚠ HIGH: `pre-payout-verify` bypasses verification** for any claim whose `decision_reason` begins with `admin_` (`app/api/workers/pre-payout-verify/route.ts:57-61`). Default admin dispatch sets `decision_reason='admin_dispatched'`. Any reviewer can set a custom note starting with `admin_` to skip this nightly re-check.

**⚠ INFO: `/api/workers/health`** — no auth. Returns cron schedules, `live_payout_enabled` flag, `gascoin_mint_valid`, worker last-run times. Useful attacker timing intel (e.g., schedule an attack in the 5-minute window between `pre-payout-verify` at 23:55 and `process-claims` at 00:00).

**⚠ INFO: `/api/health`** — no auth. Returns Supabase/Redis/mem0/Helius health + latency + build SHA + region + `mode: 'dry-run'|'live'`.

---

## 2. SERVER ACTIONS

All server actions live under `app/actions/`.

### 2.1 `app/actions/wallet-tracker.ts`

| Action | Auth | Returns |
|--------|------|---------|
| `getOwnSubmissions(wallet)` | **NONE** | Full claim history: gate failures, decision_reason, `storage_path_private`, risk scores, Claude confidence |
| `getPublicSubmissions(wallet)` | none | Paid payouts only (intentional) |
| `getWalletSummary(wallet)` | none | Tier, points, cooldown |
| `getCooldownStatus(wallet)` | none | Next eligibility |

**⚠ CRITICAL: `getOwnSubmissions` performs no auth check.** Returns full PII submission history including `storage_path_private` for any supplied wallet address. Any visitor can enumerate another user's full claim history. (`app/actions/wallet-tracker.ts:33`)

---

### 2.2 `app/actions/receipts.ts`

| Action | Auth | Returns |
|--------|------|---------|
| `getSignedReceiptUrl(storagePath)` | **NONE** | Signed URL (1h) to `receipts-private` bucket path |
| `getBatchSignedUrls(paths[])` | **NONE** | Array of signed URLs |

**⚠ CRITICAL: `getSignedReceiptUrl` has no auth and no path validation.** Any caller can mint a signed URL for any `receipts-private/*` path. Combined with `getOwnSubmissions` above (which returns `storage_path_private`), every receipt image in storage is effectively world-readable. The Route Handler `/api/receipt-image` requires reviewer auth; the server action bypasses this entirely. (`app/actions/receipts.ts:5`)

---

### 2.3 `app/actions/token-gating.ts`

| Action | Auth | Notes |
|--------|------|-------|
| `refreshTokenBalance(walletAddress)` | **NONE** | Forces Solana RPC balance fetch + Redis cache write for any wallet |
| `getCachedTokenData(walletAddress)` | none | Read-only Redis lookup |

**⚠ HIGH: `refreshTokenBalance` has no auth.** An attacker can trigger Solana/Helius RPC calls at will for arbitrary wallets. At 10k wallets the cost is 10k Helius read units; combined with the 0-auth surface this is a paid-RPC amplification attack. Also allows cache poisoning if there is any trust in cached tier data at submission time. (`app/actions/token-gating.ts:7`)

---

### 2.4 `app/actions/admin-auth.ts`

| Action | Auth | Notes |
|--------|------|-------|
| `createAdminSession(walletAddress, timestamp)` | **No signature verification inside the action** | Grants 8h admin cookie to any caller who passes an admin wallet string + current timestamp |
| `createAdminSessionViaPrivy(xUserId, xHandle)` | **No Privy verification inside the action** | Grants 8h admin cookie if xUserId or xHandle matches an `admin_users` row |
| `verifyAdminSession()` | cookie | Reads session cookie + DB |

**⚠ CRITICAL (UNVERIFIED): `createAdminSession`** — grants an 8-hour admin cookie to any server action caller who passes a wallet string matching `ADMIN_WALLET_ADDRESSES`. There is no cryptographic signature verification inside the action body. Whether the UI enforces a signature challenge before invoking this action must be confirmed in `app/admin/login/page.tsx`. If the action can be directly invoked (all server actions are POST-able to `/_next/action` endpoints), an attacker needs only the public wallet address to become admin. (`app/actions/admin-auth.ts:9`)

**⚠ CRITICAL (UNVERIFIED): `createAdminSessionViaPrivy`** — passes `xUserId`/`xHandle` as bare strings with no internal Privy verification. The three-try `OR` fallback logic is broad. Same surface as above. (`app/actions/admin-auth.ts:44`)

---

### 2.5 `app/actions/admin/submissions.ts`

All guarded by `requireAdmin()`. Assuming that holds:

| Action | Notes |
|--------|-------|
| `approveSubmission(claimId, solAmount, note?)` | Creates payout_job; **no SOL amount cap enforced** before worker-side tier check; sets `decision_reason` to note (defaulting to `'admin_dispatched'`) which **skips pre-payout re-verification** |
| `rejectSubmission(claimId, reason)` | Standard |
| `overrideGate(claimId, gateName, passed, reason)` | Arbitrary gate result manipulation |
| `flagReceiptRedaction`, `setFeatured` | Standard |

**⚠ HIGH: `approveSubmission` default note `'admin_dispatched'`** causes `pre-payout-verify` to skip the claim. An admin approving a claim with any note containing `'admin_'` bypasses the nightly re-verification window entirely. (`app/actions/admin/submissions.ts` + `app/api/workers/pre-payout-verify/route.ts:57`)

---

### 2.6 `app/actions/admin/referrals.ts`

| Action | Notes |
|--------|-------|
| `markReferralDispatched(conversionId, txSignature)` | Sets `reward_status='dispatched'` with no on-chain tx verification |
| `skipReferralReward(conversionId, reason)` | Standard |

---

## 3. SUPABASE SCHEMA + RLS SUMMARY

### 3.1 Client initialization
- All server code uses `getSupabaseAdmin()` — service-role key (`BYPASSRLS`).
- No anon-key client in server code.
- RLS is **defense-in-depth only** — a bug in server code bypasses it automatically.

### 3.2 RLS Status

| Table | RLS On | Policies |
|-------|--------|----------|
| `users` | ✅ | anon: SELECT (id, x_handle) only |
| `wallet_links` | ✅ | service-role only |
| `claims` | ✅ | anon: SELECT (id, tweet_url, status, created_at, user_id) on paid/approved only |
| `claim_receipts` | ✅ | no anon policy (was public; dropped in 20260416) |
| `gate_results` | ✅ | no anon policy (was public; dropped in 20260416) |
| `payouts` | ✅ | service-role only |
| `payout_jobs` | ✅ | service-role only |
| `idempotency_keys` | ✅ | service-role only |
| `admin_users` | ✅ | service-role only |
| `admin_sessions` | ✅ | service-role only |
| `audit_logs` | ✅ | immutable trigger; service-role only |
| `claim_status_events` | ✅ | immutable trigger; service-role only |
| `wallet_x_links` | ✅ | anon: SELECT granted but no permissive policy → blocked |
| `scored_tweets` | ✅ | same |
| `engagement_points` | ✅ | legacy anon GRANT SELECT/INSERT; blocked by RLS (no policy) |
| `engagement_scores` | ✅ | added in 20260416 |
| `wallet_token_cache` | ✅ | added in 20260416 |
| `knowledge_base` | ✅ | service_all policy dropped in 20260416 |
| `intelligence_entries` | ✅ | service_all policy dropped in 20260416 |
| `invite_codes` | ✅ | service_all policy dropped in 20260416 |
| `referrals`, `referral_conversions`, `referral_clicks` | ✅ | anon INSERT granted; blocked by RLS without policy |
| `user_bans`, `user_metrics_history`, `x_handle_history` | ✅ | service-role only |
| `treasury_snapshots`, `market_snapshots` | ✅ | service-role only |

**Storage bucket `receipts-private`:**
- Policy `deny_anon_receipts_private` blocks anon + authenticated reads/writes.
- Signed URLs (service-role generated) are the only access path.
- **⚠ CRITICAL: server action `getSignedReceiptUrl` mints signed URLs with no auth** (see §2.2).

### 3.3 Views (all `SECURITY INVOKER`)
`public_claims_feed`, `wallet_points_view`, `engagement_totals`, `referral_counts`, `submission_queue_view`, `leaderboard_view`, `gate_stats_view` — grant SELECT to anon. Column access constrained to what the underlying table anon grants allow.

### 3.4 Immutability Guards
- `audit_logs`: trigger `prevent_audit_log_mutation` blocks UPDATE/DELETE even for service-role.
- `claim_status_events`: same pattern.

---

## 4. SOLANA / TREASURY

| Component | Detail |
|-----------|--------|
| Treasury signer | Hot wallet via `TREASURY_PRIVATE_KEY_B58` env var; pubkey verified against `GASCOIN_TREASURY_WALLET` at startup |
| RPC provider | `SOLANA_RPC_URL` → Helius (`HELIUS_API_KEY`) → `api.mainnet-beta.solana.com` |
| Transaction type | `SystemProgram.transfer` only (SOL, not tokens) |
| Dry-run switch | `ENABLE_LIVE_PAYOUT !== 'true'` → returns `DRYRUN_<timestamp>` hash silently |
| Tier cap enforcement | Enforced in `processQueuedPayout`: `amount_sol ≤ tier.max_sol_refund + 0.0001` |
| Balance floor alert | `< 1 SOL` triggers `intelligence_entries` high/critical |
| Payout guards | mem0 ring flag check, tweet re-verify, follower re-check, quality re-check, min-gascoin check |
| Retry logic | Exponential backoff `60s × 2^min(attempts, 6)`; `max_attempts` per `payout_jobs` row |
| Audit trail | `payouts` row + `audit_logs` entry + mem0 write per payout |

**⚠ CRITICAL: single-signer hot wallet.** `TREASURY_PRIVATE_KEY_B58` in a single Vercel env var — one secret leak = full treasury drain. No multisig, no HSM, no cold-to-hot top-up architecture documented.

**⚠ HIGH: dry-run mode is a silent boolean.** If `ENABLE_LIVE_PAYOUT` is accidentally unset or set to anything other than `'true'`, the system marks claims `paid` and writes `DRYRUN_*` tx hashes to the DB. Intelligence entry fires after the fact, not before. No pre-flight assertion.

**⚠ MEDIUM: no per-day treasury spend cap** beyond the tier cap per individual claim. A burst of Fleet-tier legitimate claims (or attacker-created ones) can drain the treasury up to whatever SOL is available, one 1-SOL payout at a time.

---

## 5. ADMIN ACCESS MODEL

### 5.1 Admin authentication paths

| Path | Mechanism | Verification |
|------|-----------|-------------|
| Wallet-based | Wallet in `ADMIN_WALLET_ADDRESSES` env | **UI performs signature challenge; server action does NOT verify signature** |
| Privy-based | x_user_id/x_handle in `admin_users` DB table | **Server action does NOT call Privy internally; trusts caller** |
| Break-glass | `REVIEWER_API_TOKEN` header | Timing-safe; grants `role=admin` |

### 5.2 Admin session
- 8h httpOnly cookie `gascoin_admin_session`
- 32-byte random token stored in `admin_sessions` table
- No revocation mechanism besides token expiry

### 5.3 Admin capabilities
- `approveSubmission` — creates payout_job with caller-specified SOL amount
- `rejectSubmission`, `overrideGate` — arbitrary gate manipulation
- `erase-user` — hard-delete across 10 tables
- `requireReviewer` role minimum for all admin API routes

---

## 6. MIDDLEWARE

File: `proxy.ts` (Next.js 16)

| Applies to | Behavior |
|------------|----------|
| All paths except `_next/*` | Global 60 req/min rate limit on `/api/*` (except `/api/rpc` at 100/min) |
| Browser paths only | Site-gate cookie check when `SITE_GATE_ENABLED=true`; redirects to `/welcome` |

**`/api/` is explicitly in `GATE_BYPASS_PREFIXES`** — the site-gate does not protect API endpoints. API security relies entirely on per-route auth.

HMAC gate cookie: 90-day TTL, `Secure; SameSite=lax; HttpOnly`.

---

## 7. TRUST BOUNDARY MAP

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (browser / attacker)                                    │
│  • Can call: all public API routes, POST /api/verify/tweet      │
│  • Can call: all server actions (POST /_next/action)            │
│  • Cannot forge: Privy JWT, CRON_SECRET, REVIEWER_API_TOKEN     │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────────┐
│  VERCEL EDGE / PROXY (proxy.ts)                                 │
│  • Rate-limits 60/min per IP on /api/*                          │
│  • Site-gate cookie check (browser only)                        │
│  • Injects x-real-ip (trusted; Vercel-controlled)               │
└──┬──────────────────┬──────────────────────┬────────────────────┘
   │                  │                      │
   ▼                  ▼                      ▼
Next.js           Route Handlers        Server Actions
App Router        (auth per-route)      (auth per-action — GAPS)
   │                  │                      │
   └──────────────────┴──────────────────────┘
                         │
          ┌──────────────┴──────────────────────────────┐
          │              │              │                │
          ▼              ▼              ▼                ▼
     Supabase         Solana        X API v2          AI Gateway
   (service-role)   (Helius RPC)  (Bearer token)  (Gemini/Grok/Claude)
          │
     ┌────┴──────────┐
     │               │
   Upstash         mem0 API
   (Redis)
```

### Outbound trust inventory

| Destination | Credential | Location | Trust Notes |
|-------------|-----------|----------|-------------|
| Supabase (DB + Storage) | `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Bypasses RLS; all app bugs get service-role blast radius |
| Solana RPC (read) | `HELIUS_API_KEY` | Server-only | Results trusted for balance/tier gating |
| Solana RPC (write) | `TREASURY_PRIVATE_KEY_B58` | Server-only | Signs payouts; single point of compromise |
| X API v2 | `X_BEARER_TOKEN` | Server-only | Tweet proof trusted; follower count trusted |
| AI Gateway | `VERCEL_OIDC_TOKEN` (auto) | Vercel platform | OIDC; 12h local TTL |
| OpenRouter | `OPENROUTER_API_KEY` | Server-only | Chat only |
| mem0 | `MEM0_API_KEY` | Server-only | Long-term wallet memory; inbound via `MEM0_WEBHOOK_SECRET` |
| Upstash | `UPSTASH_REDIS_REST_URL` + token | Server-only | Fail-open to in-memory; rate limits degrade if Redis unavailable |
| Privy | `PRIVY_APP_SECRET` | Server-only | Token verification; identity anchor |
| Helius (payout) | `HELIUS_API_KEY` | Server-only | Same key for reads and `sendTransaction` proxy |

---

## 8. CRON / WORKER SECURITY MODEL

All workers gated by `isAuthorizedCron` (Bearer `CRON_SECRET`, `timingSafeEqual`, fail-closed when unset). Vercel injects the Authorization header on scheduled invocations.

`/api/workers/payout` is NOT in vercel.json crons — it is an on-demand endpoint accepting body `{ claimId, wallet, amountSol }`. Requires CRON_SECRET. A leaked CRON_SECRET would allow queuing arbitrary payout jobs (though `processQueuedPayout` re-checks claim status and tier cap).

---

## 9. ENVIRONMENT VARIABLES — SECRET INVENTORY

| Variable | Classification | Server-only? |
|----------|---------------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (by design) | ❌ Client-exposed |
| `PRIVY_APP_SECRET` | Secret | ✅ Yes |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Public (by design) | ❌ Client-exposed |
| `TREASURY_PRIVATE_KEY_B58` | Critical secret | ✅ Yes |
| `GASCOIN_TREASURY_WALLET` | Semi-public | ✅ Server-only |
| `GASCOIN_MINT` | Semi-public | ✅ Server-only |
| `HELIUS_API_KEY` | Secret | ✅ Yes |
| `SOLANA_RPC_URL` | Secret | ✅ Yes |
| `X_BEARER_TOKEN` / `X_API_BEARER_TOKEN` | Secret | ✅ Yes |
| `MEM0_API_KEY` | Secret | ✅ Yes |
| `MEM0_WEBHOOK_SECRET` | Secret | ✅ Yes |
| `OPENROUTER_API_KEY` | Secret | ✅ Yes |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | Secret | ✅ Yes |
| `CRON_SECRET` | Secret | ✅ Yes |
| `REVIEWER_API_TOKEN` | Secret | ✅ Yes |
| `ADMIN_WALLET_ADDRESSES` | Sensitive config | ✅ Yes |
| `ADMIN_BYPASS_IPS` | Sensitive config | ✅ Yes |
| `ENABLE_LIVE_PAYOUT` | Critical flag | ✅ Yes |
| `SITE_GATE_ENABLED` | Config | ✅ Yes |
| `INVITE_GATE_DISABLED` | Config | ✅ Yes |
| `DEV_ALLOW_MOCK_AUTH` | Config | ✅ Yes (non-production only) |
| `VERCEL_OIDC_TOKEN` | Short-lived (auto-managed) | ✅ Yes |

No critical secrets observed with `NEXT_PUBLIC_` prefix.

---

## 10. PRELIMINARY FINDINGS SUMMARY

> Full exploit scenarios, evidence citations, and remediations will appear in `SECURITY_AUDIT.md` (Phase 4).

| # | Severity | Component | Title |
|---|----------|-----------|-------|
| F01 | **CRITICAL** | Server Action | `getOwnSubmissions` — no auth; full claim PII for any wallet |
| F02 | **CRITICAL** | Server Action | `getSignedReceiptUrl` — no auth; signed URLs for any receipt in private bucket |
| F03 | **CRITICAL (UNVERIFIED)** | Server Action | `createAdminSession` — no signature verification; admin cookie for known wallet address |
| F04 | **CRITICAL (UNVERIFIED)** | Server Action | `createAdminSessionViaPrivy` — no Privy verification inside action |
| F05 | **CRITICAL** | Treasury | Single-signer hot wallet key in Vercel env — one secret leak = full drain |
| F06 | **HIGH** | API Route | `POST /api/verify/tweet` — unauthenticated write to `gate_results` for any claim_id |
| F07 | **HIGH** | API Route | `POST /api/link-x` — body-supplied X identity not validated against Privy session |
| F08 | **HIGH** | Server Action | `refreshTokenBalance` — no auth; Helius RPC amplification + cache poisoning |
| F09 | **HIGH** | Worker | `pre-payout-verify` skips re-check for any claim with `decision_reason` prefixed `admin_` |
| F10 | **HIGH** | Treasury | `ENABLE_LIVE_PAYOUT` unset → silent dry-run; claims marked paid with fake tx hashes |
| F11 | **HIGH** | API Route | `POST /api/public/referrals` — unauthenticated; pre-claim victim wallet referral slots |
| F12 | **MEDIUM** | API Route | `POST /api/rpc` — no auth; `sendTransaction` proxied through Helius at cost to operator |
| F13 | **MEDIUM** | API Route | `GET /api/me` — O(n) leaderboard scan per call; no per-user rate limit |
| F14 | **MEDIUM** | API Route | `POST /api/chat` — `body.wallet` used without session; cross-wallet chat context query |
| F15 | **MEDIUM** | Admin | `approveSubmission` — no server-side SOL cap; typo allows 10× over-payout (worker catches) |
| F16 | **MEDIUM** | Treasury | No per-day treasury spend cap; sustained Fleet-tier payout burst unbound |
| F17 | **MEDIUM** | API Route | Submit response returns `hashSha256` + `pHash`; aids receipt-duplication evasion |
| F18 | **MEDIUM** | Public Route | `POST /api/public/referrals` — `referral_clicks` fingerprint `/24` IP prefix rotatable |
| F19 | **LOW** | Webhook | `mem0` webhook secret comparison not timing-safe |
| F20 | **LOW** | Health | `/api/health` + `/api/workers/health` expose infra inventory + live/dry-run mode |
| F21 | **LOW** | Admin | Admin `erase-user` may not delete all PII if `wallet` not resolved |
| F22 | **INFO** | Config | Dual CSPs (next.config.js + vercel.json) — drift risk if one updated independently |
| F23 | **INFO** | Sybil | No Captcha/PoW on submission; Sybil cost = invite code procurement only |
| F24 | **INFO** | Sybil | Referral click farming via IP rotation + UA rotation trivially bypasses `/24` fingerprint |

---

## 11. FILES REQUIRING DEEPER INSPECTION (Phase 2)

- `app/admin/login/page.tsx` — confirm whether signature challenge happens before `createAdminSession` call (**F03 verification**)
- `lib/chat-tools.ts` — confirm `buildChatTools` scopes tool calls to session wallet not body wallet (**F14 verification**)
- `app/api/chat/route.ts` full read — wallet sourcing logic
- `app/submit/page.tsx` + client hooks — confirm which UI components call `getOwnSubmissions` / `getSignedReceiptUrl` and how they are invoked
- `lib/integrations/ocr.ts` — Gemini prompt-injection surface via `ocr_text` field stored in DB and fed back to AI
- `lib/auto-ban.ts` — auto-ban trigger conditions and reversibility
- `lib/gate-cookie.ts` — HMAC secret source; rotation process
- `lib/idempotency.ts` — `request_hash` construction; bypass via body manipulation
- `lib/fraud.ts` + `lib/ai-points-engine.ts` — scoring gameability; ring detection completeness
- `lib/integrations/x.ts` — `verifyTweetProof`: retweet/quoted-tweet handling; text-injection in tweet content fed to AI
- `supabase/migrations/` — confirm no remaining over-permissive policies not visible in migration files (check Supabase dashboard directly)

---

*Phase 2 (Threat Modeling) will take the findings above and enumerate exploit paths per actor class. Phase 3 will drill into each finding with step-by-step PoC scenarios. Phase 4 will produce `SECURITY_AUDIT.md`.*
