# GASCOIN Platform (handoff scaffold)

Implements the 6 requested modules:
1. Home + black/white enterprise shell + live treasury bar
2. Submit flow with gate policy hooks
3. Verification pipeline policy engine + admin queue
4. Treasury/market dashboard (market cap + volume)
5. Global gas price board
6. Community feed (X account + tweet link + tx hash)

## Policy hard-lock included
- Privy login + X binding (integration TODO hooks)
- Tweet must include `#gascoin` and remain live
- Receipt must contain `#gascoin`
- Last 4 characters of wallet must be written on receipt and match connected wallet
- Wallet must hold >= $1 GASCOIN at submit + pre-payout

## Run
```bash
npm install
npm run dev
```

## Post-completion audit
```bash
npm run audit:spec
```
Outputs: `POST_AUDIT_REPORT.json`

## Phase 2 progress (integrations scaffolded)
- Privy session verification hook
- X post verification hook (`#gascoin`, live post, author binding)
- OCR extraction hook (receipt hashtag + wallet parsing)
- Anti-AI/tamper hook
- GASCOIN holdings + pricing hooks
- Worker APIs for claim processing and payout
- Pre-payout `$1 GASCOIN` re-check enforced in payout API

See: `docs_PHASE2_IMPLEMENTATION.md`

## Phase 3 progress (Supabase-backed)
- Claims + gate results persisted to Supabase
- Duplicate receipt hash/pHash lookup + storage in `claim_receipts`
- Reviewer endpoint shipped: `POST /api/claims/:id/review` (`approve|reject|ban`)
- Immutable audit logs enforced via DB trigger
- Admin queue reads real Supabase claim rows

See: `docs_PHASE3_SUPABASE.md`

## Phase 3.2 hardening pass
- private receipt storage upload (`receipts-private`)
- submit endpoint rate limiting
- reviewer auth token guard
- RLS + immutable status event guard

See: `docs_PHASE32_HARDENING.md`

## Phase 3.3 gap closure
- strict X verification mode + retry/backoff
- submit/payout idempotency keys
- payout retry queue (`payout_jobs`) + worker processing

See: `docs_PHASE33_GAP_CLOSURE.md`

## Phase 3.4 launch blockers closed
- reviewer RBAC (`admin_users`) + break-glass token fallback
- distributed submit rate limiting via Upstash Redis (with dev fallback)

See: `docs_PHASE34_RBAC_REDIS.md`

## Hosting env setup
- production env template: `.env.production.example`
- validation script: `node scripts/check-prod-env.mjs .env.local`

See: `docs_ENV_SETUP_HOSTING.md`
