# The Gas Network — Implementation Plan

> Roadmap phase IV. Verified creator intelligence layer built on top of GASCOIN's gas-refund pipeline. Executed in 6 dependency-ordered pieces, one at a time.

## Context

GASCOIN already has a working verification pipeline: receipts → 17 automated gates → Claude oversight → ETH payouts. Every submission produces rich telemetry: scored X posts, wallet-linked identity, engagement metrics, on-chain payouts. That telemetry is already queryable — it's just not exposed as a product.

The Gas Network productizes that telemetry: wallet-linked creator profiles with AI-scored engagement, tweet-level content-impact scoring (prove what each post drove), an API for brands to query verified audience data, soulbound reach certificates, and eventually a performance-pay creator marketplace.

**Why now:** ETH migration + presale are done. The next revenue surface needs to hang off the existing submission data. Everything below reuses pipelines we already shipped.

## Foundation (reuse, don't rebuild)

What already exists and will be consumed by every piece:

| Asset | File | What it gives us |
|---|---|---|
| `wallet_x_links` table | `supabase/migrations/20260405_wallet_x_mapping.sql` | wallet ↔ X handle ↔ metadata (followers, bio, account age, protected status, avg quality score, profile_image_url) |
| `scored_tweets` table | same | every #gascoin tweet with metrics (impressions, likes, retweets, replies, bookmarks, quote_tweets), raw_points, adjusted_points, quality_score, content_type, content_hash, metrics_history |
| `engagement_points` ledger | `supabase/migrations/20260404_engagement_points.sql` | normalized earn records keyed by wallet + source |
| `user_metrics_history` | `supabase/migrations/20260410_metrics_history.sql` | follower + tier + quality snapshots over time |
| `scoreTweetQuality()` | `lib/ai-points-engine.ts:45-154` | AI quality score + spam/bot flags + 0.1–1.5× multiplier |
| `calculateWalletTrust()` | `lib/ai-points-engine.ts:237-269` | 0–100 trust score across all signals |
| `detectReferralRing()` | `lib/ai-points-engine.ts:166-200` | BFS cycle detection + chain-farm heuristic |
| X API layer | `lib/x-api.ts` | paginated fetches, rate-limit aware, 900s cache |
| Cron workers | `vercel.json:12-38` | score-engagement (hourly), award-points (daily), sync-x-handles (daily) |
| Payout → claim → tweet linkage | `claims.tweet_url` + `claims.referral_code` | canonical SQL join path documented below |

## Dependency graph

```
Piece 1: Verified Creator Profiles     ─┐
         (foundation — standalone)      │
                                        ▼
Piece 2: Content Impact Scoring        ─┐
         (joins scored_tweets +         │
          payouts + referrals)          │
                                        ▼
Piece 3: Intelligence API              ─┐
         (paywalled read by             │
          GASCOIN balance)              │
                                        ▼
Piece 4: Verified Reach Certificates    ─┐ (in parallel with 5)
         (soulbound ERC-721)             │
                                         ▼
Piece 5: Conversion Attribution        ─┐
         (content → audience → action)   │
                                        ▼
Piece 6: Creator Marketplace
         (escrow contract + UIs)
```

## Canonical content-impact join

Reused by pieces 2, 3, 5. Documented once here:

```sql
SELECT
  st.tweet_id, st.tweet_url, st.wallet, st.x_handle,
  COALESCE(SUM(p.amount_eth), 0) AS total_payout_eth,
  COUNT(DISTINCT p.id)           AS payout_count,
  COUNT(DISTINCT rc.referred_wallet) AS referred_signups,
  COALESCE(SUM(rc.reward_eth), 0)    AS referral_rewards_earned,
  st.likes, st.retweets, st.replies, st.quote_tweets,
  st.impressions, st.adjusted_points
FROM scored_tweets st
LEFT JOIN claims c               ON st.wallet = c.wallet AND st.tweet_url = c.tweet_url
LEFT JOIN payouts p              ON c.id = p.claim_id AND p.status = 'paid'
LEFT JOIN referral_conversions rc ON c.referral_code = rc.referral_code
WHERE st.tweet_id = $1
GROUP BY st.id, st.tweet_id, st.tweet_url, st.wallet, st.x_handle,
         st.likes, st.retweets, st.replies, st.quote_tweets,
         st.impressions, st.adjusted_points;
```

---

## Piece 1 — Verified Creator Profiles

**Goal:** every wallet that has passed ≥1 submission + has a linked X handle gets a public `/creator/[handle]` page showing AI-scored engagement history, earning stats, and a verified badge tied to their wallet.

**Files to create:**
- `supabase/migrations/20260419_creator_profiles.sql` — new tables + view
- `app/creator/[handle]/page.tsx` — public profile page
- `app/creator/[handle]/CreatorProfileClient.tsx` — client-side tabs (posts, earnings, history)
- `app/api/public/creators/[handle]/route.ts` — JSON endpoint powering the page
- `app/admin/creators/page.tsx` — admin table view (sortable, filterable)
- `lib/creator-profile.ts` — shared query helpers + types
- `tests/unit/lib/creator-profile.test.ts`

**Files to modify:**
- `app/welcome/welcome-client.tsx` — update Roadmap IV prose to say "live"
- `app/how-it-works/page.tsx` — add creator profile mention

**Steps:**

- [ ] Write the test: `tests/unit/lib/creator-profile.test.ts` — exercises `getCreatorProfile(handle)`, `getCreatorPosts(handle, limit)`, `getCreatorImpact(handle)`. Expect empty results for unknown handle, rich object for known.
- [ ] Run test → FAIL (function doesn't exist)
- [ ] Add migration with:
  - New table `creator_profiles` (handle PK, wallet FK, is_verified bool, creator_tier text, engagement_consistency numeric, audience_growth_rate numeric, content_authenticity numeric, first_seen_at, last_updated)
  - View `creator_public_view` that joins `creator_profiles` + `wallet_x_links` + aggregated `scored_tweets` + aggregated `payouts`
  - Index on `creator_profiles(handle)` and on `creator_profiles(wallet)`
  - RLS: anon can SELECT public view only (not raw table)
- [ ] Apply migration to Supabase ETH project via MCP `apply_migration`
- [ ] Write `lib/creator-profile.ts` with three exports: `getCreatorProfile`, `getCreatorPosts`, `getCreatorImpact`
- [ ] Run test → PASS
- [ ] Build the public profile page:
  - Hero: PFP + handle + verified checkmark + wallet (truncated) + join date
  - Stats strip: total ETH earned · total posts · total impressions · trust score
  - Tabs: Posts (scored_tweets with impact), Earnings (payouts timeline), History (metrics over time)
  - noindex meta (profile is only reachable via direct link or admin dashboard until public opt-in)
- [ ] Build admin page `app/admin/creators/page.tsx`: sortable table, "mark verified" action writes to `creator_profiles.is_verified`
- [ ] Add new worker `app/api/workers/sync-creator-profiles/route.ts` — runs daily, rebuilds the aggregate columns on `creator_profiles`. Add to `vercel.json` cron
- [ ] Commit: `feat(gas-network): verified creator profiles (piece 1/6)`

**Verification:**
- 838+ tests pass (new test suite ≥ 5 new tests)
- `npx next build --webpack` clean
- Admin page loads, shows existing wallets with X links as rows
- Hit `/creator/GasCoinApp` → renders stats + empty posts list (no data yet since DB is empty)
- `npx supabase gen types` doesn't need to run yet (we hand-type interfaces in `creator-profile.ts`)

---

## Piece 2 — Content Impact Scoring

**Goal:** every scored_tweet gets a persisted impact score: ETH paid out (direct), ETH earned by referrals sourced from this tweet, plus an engagement-weighted composite.

**Files to create:**
- `supabase/migrations/2026042X_content_impact.sql` — new column on `scored_tweets` + backfill function
- `lib/content-impact.ts` — scoring formula + batch scorer
- `app/api/workers/score-content-impact/route.ts` — hourly worker
- `tests/unit/lib/content-impact.test.ts`

**Files to modify:**
- `vercel.json` — add cron entry (runs 30 min offset from score-engagement)
- `app/creator/[handle]/CreatorProfileClient.tsx` — show impact score per post

**Steps:**

- [ ] Write test with table-driven cases: tweet with only engagement vs tweet with 1 payout vs tweet with referrals vs tweet with all three. Assert formula produces expected composite.
- [ ] Test → FAIL
- [ ] Add migration:
  - `scored_tweets.direct_payout_eth NUMERIC`
  - `scored_tweets.referral_payout_eth NUMERIC`
  - `scored_tweets.referred_wallets INT`
  - `scored_tweets.impact_score NUMERIC` (composite 0–100)
  - `scored_tweets.impact_computed_at TIMESTAMPTZ`
  - SQL function `compute_impact_for_tweet(tweet_id UUID)` executing the canonical join
- [ ] Implement `lib/content-impact.ts`:
  - `computeImpactScore({ engagement, directEth, referralEth, refSignups, trustScore })` — documented formula
  - `scoreAllStaleTweets(supabase, limit=200)` — loop calling the RPC, writes rows
- [ ] Test → PASS
- [ ] Build worker at `app/api/workers/score-content-impact/route.ts` — runs `scoreAllStaleTweets`, 30 min window, cron-secret gated
- [ ] Add to `vercel.json` at `30 * * * *`
- [ ] Surface impact score on creator profile posts tab
- [ ] Commit: `feat(gas-network): content impact scoring (piece 2/6)`

**Verification:**
- New tests pass
- Worker hit manually returns `{ok: true, scored: N}` for seeded test data
- Creator profile posts tab shows impact column
- Canonical join query returns expected rows

---

## Piece 3 — Intelligence API

**Goal:** a public, paywalled JSON API for brands/agencies to query verified creator data. Tiered by `$GASCOIN` balance of the caller's wallet. Signed response envelope so downstream systems can verify authenticity.

**Files to create:**
- `app/api/v1/creators/route.ts` — list (filters: min_impact, tier, min_followers)
- `app/api/v1/creators/[handle]/route.ts` — single creator full detail
- `app/api/v1/content/[tweet_id]/route.ts` — single post impact
- `app/api/v1/reach/[handle]/route.ts` — signed reach certificate data (consumed by Piece 4)
- `lib/api-gating.ts` — middleware enforcing GASCOIN balance tier
- `lib/response-signer.ts` — HMAC-signed JSON envelope
- `app/docs/api/page.tsx` — public API docs page
- `tests/unit/lib/api-gating.test.ts`

**Files to modify:**
- `next.config.js` — add `/api/v1/*` to the strict-cache header group
- `proxy.ts` — skip global site gate for `/api/v1` (it has its own auth)

**Steps:**

- [ ] Write test: `api-gating.test.ts` — given wallet with N GASCOIN, assert correct tier + rate limit + field-access permissions.
- [ ] Test → FAIL
- [ ] Define tiers in `lib/api-gating.ts`:
  - **Free** (0 GASCOIN): basic stats, 10 req/day, creator handle + follower count only
  - **Builder** (1,000+ GASCOIN): add engagement metrics + impact score, 1k req/day
  - **Agency** (100k+ GASCOIN): add audience signals + historical, 10k req/day
  - **Enterprise** (1M+ GASCOIN): full signed envelope + batch export, 100k req/day
- [ ] Implement `lib/response-signer.ts` — HMAC-SHA256 over (payload + timestamp + nonce), embedded `x-gascoin-signature` header
- [ ] Add API key table migration: `api_keys(id, wallet, key_hash, tier, created_at, last_used_at, expires_at)`
- [ ] Build the 4 endpoints — each gated by `requireTier(request, minTier)`
- [ ] Write OpenAPI-compatible docs at `/docs/api`
- [ ] Apply CSP `connect-src` addition if any external consumer demo is on another domain
- [ ] Test → PASS
- [ ] Commit: `feat(gas-network): intelligence API v1 (piece 3/6)`

**Verification:**
- Tests pass + 4 endpoints respond correctly to: no-key, wrong-tier-key, correct-tier-key
- HMAC signature validates in a consumer-side test stub
- Rate limit hits on 11th request in same 24h for Free tier

---

## Piece 4 — Verified Reach Certificates

**Goal:** soulbound ERC-721 tokens minted to a creator's wallet when they cross milestones. Non-transferable. Metadata on IPFS with creator's verified stats at mint time.

**Files to create:**
- `contracts/gascoin-evm/` — new sibling Hardhat workspace (or Foundry — pick at start of piece)
- `contracts/gascoin-evm/contracts/GascoinReachCertificate.sol`
- `contracts/gascoin-evm/test/ReachCertificate.t.sol` (or `.test.ts` if Hardhat)
- `contracts/gascoin-evm/deploy/01_certificate.ts`
- `contracts/gascoin-evm/hardhat.config.ts` (or `foundry.toml`)
- `lib/integrations/reach-certificate.ts` — platform-side mint dispatcher (viem writeContract)
- `app/api/workers/mint-reach-certs/route.ts` — daily worker that scans for new milestones + mints
- `app/creator/[handle]/page.tsx` — add certificates section

**Milestones (initial set, configurable via DB):**
- 100,000 verified impressions → "Pump" tier
- 1,000,000 verified impressions → "Station" tier
- 10 ETH direct payouts → "Commuter" tier
- 100 ETH direct payouts → "Road Warrior" tier
- 100 referred signups → "Recruiter" tier

**Steps:**

- [ ] Pick toolchain (suggest **Foundry** — faster tests, better trace)
- [ ] `forge init contracts/gascoin-evm`
- [ ] Write Foundry test `ReachCertificate.t.sol`: mint restricted to admin, transfer reverts (soulbound), tokenURI reflects metadata
- [ ] `forge test` → FAIL
- [ ] Implement `GascoinReachCertificate.sol`:
  - `onlyAdmin` minter modifier
  - `_beforeTokenTransfer` reverts if `from != address(0)` (mint only, no transfer)
  - `tokenURI(id)` returns `ipfs://<cid>/<id>.json`
  - `burn(id)` as admin-only escape hatch
- [ ] `forge test` → PASS
- [ ] Deploy to Ethereum mainnet via `forge script` (requires `ETH_RPC_URL` + `TREASURY_PRIVATE_KEY`). Capture address.
- [ ] Verify on Etherscan
- [ ] Add migration `certificate_mints(id, wallet, milestone, token_id, tx_hash, minted_at, metadata_cid)`
- [ ] Build `lib/integrations/reach-certificate.ts` with `mintCertificate(wallet, milestone)` using viem
- [ ] Build daily worker that scans `creator_profiles` + `scored_tweets` for new milestones, uploads metadata to IPFS (via web3.storage or Pinata), mints, writes `certificate_mints` row
- [ ] Surface certificates on creator profile page — "badges earned"
- [ ] Add `GASCOIN_CERTIFICATE_CONTRACT` env var + update `.env.example`
- [ ] Commit: `feat(gas-network): verified reach certificates (piece 4/6)`

**Verification:**
- `forge test` passes
- Mainnet contract verified on Etherscan
- Worker run mints a test cert to dev wallet
- Cert appears on that wallet's Etherscan page + on creator profile

---

## Piece 5 — Conversion Attribution

**Goal:** trace the full funnel per tweet — impressions → follows/replies → wallet connects → submissions → payouts. A single JSON output per tweet_id showing the full causal chain.

**Files to create:**
- `supabase/migrations/2026042X_attribution.sql` — new `attribution_events` table + `attribution_funnels` view
- `lib/attribution.ts` — scoring + enrichment
- `app/api/workers/aggregate-attribution/route.ts` — hourly rollup
- `app/admin/attribution/page.tsx` — admin funnel visualizer
- `tests/unit/lib/attribution.test.ts`

**Files to modify:**
- `app/api/v1/content/[tweet_id]/route.ts` — add `attribution` field to Agency+ tier response
- `components/community/ReceiptModal.tsx` — show "inspired by tweet X" if claim came via referral

**Attribution signals to capture:**
- Tweet impression (from scored_tweets.impressions snapshot delta)
- Profile click (requires UTM tracking on shared links — new)
- Follow event (follower count delta on wallet_x_links)
- Wallet connect from referral (referral_clicks.clicked_at)
- Submission from referral (referral_clicks.converted_submission_id)
- Payout from that submission (payouts via claims FK)

**Steps:**

- [ ] Write test: seeded fixture with a full funnel journey → assert `buildFunnel(tweetId)` returns all stages in order with correct counts
- [ ] Test → FAIL
- [ ] Add migration:
  - `attribution_events(id, source_tweet_id, referred_wallet, stage, occurred_at, metadata)` — append-only ledger
  - `attribution_funnels` view computing funnel stages per tweet
- [ ] Build `lib/attribution.ts`:
  - `recordAttributionEvent(stage, tweetId, wallet, metadata)`
  - `buildFunnel(tweetId)` — returns typed `Funnel[]`
  - `aggregateFunnels(since)` — batch rollup
- [ ] Wire `recordAttributionEvent` into existing flows:
  - referral_clicks worker (link click stage)
  - claims/submit route (submission stage)
  - payout-worker (payout stage)
- [ ] Test → PASS
- [ ] Build worker + admin page
- [ ] Commit: `feat(gas-network): conversion attribution (piece 5/6)`

**Verification:**
- Funnel query on a test tweet shows all 6 stages
- Admin page renders sortable funnel table
- Tier-3 API response includes attribution block

---

## Piece 6 — Creator Marketplace

**Goal:** brands post briefs + lock USDC in escrow; creators apply; smart contract releases payment on verified performance. Uses Pieces 1–5 as the truth layer.

**Files to create:**
- `contracts/gascoin-evm/contracts/GascoinMarketplaceEscrow.sol`
- `contracts/gascoin-evm/test/MarketplaceEscrow.t.sol`
- `contracts/gascoin-evm/deploy/02_marketplace.ts`
- `supabase/migrations/2026042X_marketplace.sql` — briefs, applications, performance_snapshots, payments
- `lib/marketplace.ts` — platform-side orchestration
- `app/marketplace/` (brand + creator routes)
- `app/api/v1/marketplace/*` — public-facing actions
- `app/api/workers/settle-marketplace/route.ts` — daily settlement worker
- Multiple tests

**Contract state machine:**
```
BriefPosted → ApplicationAccepted → PostSubmitted → PerformanceVerified → Paid
                                                    ↓ (fail)
                                                    → Refunded
```

**Oracle design:** contract trusts a single `verifierRole` address that signs off-chain performance attestations. The verifier is a backend service reading from our `scored_tweets.impact_score` via the Intelligence API. Signature scheme: EIP-712 typed data.

**Steps:** (high-level — will be detailed fully when starting this piece since it's the largest scope)

- [ ] Design + review escrow state machine with product team
- [ ] Foundry tests for the escrow contract covering every state transition
- [ ] Implement escrow contract
- [ ] Tests pass; deploy to Ethereum mainnet
- [ ] Migrations for marketplace tables
- [ ] Brand UI: post brief, fund escrow, view applications, approve winner
- [ ] Creator UI: browse briefs, apply, link submission post, view earnings
- [ ] Settlement worker: reads `scored_tweets.impact_score` after deadline, signs EIP-712 attestation, calls contract
- [ ] Commit in 3+ commits (contracts, backend, frontend)

**Verification:**
- Full e2e happy path walkthrough in staging
- Settlement worker correctly releases funds on performance
- Dispute / refund path works
- Documentation site has marketplace section

---

## Infrastructure tasks (once, applies to all pieces)

- [ ] Create new Supabase Storage bucket `creator-assets` (IPFS pins, profile images beyond Twitter CDN)
- [ ] Add `GAS_NETWORK_ENABLED` feature flag → gate `/creator/*` + `/marketplace/*` + `/api/v1/*` routes behind it
- [ ] Extend site gate bypass list for `/api/v1/*` (has its own auth)
- [ ] New admin dashboard section in nav: "Gas Network" with sub-pages for creators, content impact, API keys, certificates, attribution, marketplace
- [ ] Update `app/welcome/welcome-client.tsx` roadmap to mark phase IV progress per piece shipped

---

## Key decisions deferred to implementation time

- **Piece 3 API pricing:** are the tier thresholds (1k/100k/1M GASCOIN) correct, or do we want USD-stable pricing too?
- **Piece 4 IPFS provider:** web3.storage vs Pinata vs self-hosted?
- **Piece 6 oracle model:** single verifier signer (chosen) vs optimistic with challenge period vs Chainlink Functions?
- **Piece 6 stablecoin:** USDC only or multi-stable (USDC + USDT + DAI)?

Each decision gets a short RFC at the start of its piece; not answered here.

---

## Execution order + checkpointing

Work one piece at a time. After each piece:
1. All tests green · `next build --webpack` clean
2. Commit pushed to `gascoin-eth/main`
3. Vercel deploy verified on `gascoin.app`
4. Demo screenshot saved to `docs/superpowers/evidence/gas-network-piece-N.png`
5. Human sign-off before starting next piece

Estimated effort: piece 1 = 1 day, piece 2 = 0.5 day, piece 3 = 1.5 days, piece 4 = 1 day, piece 5 = 1 day, piece 6 = 3–5 days. Total ≈ 8–12 focused days.
