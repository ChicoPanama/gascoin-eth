# Phase 3.3 Gap Closure (items 3/5/6)

## Closed in this pass

### 3) X verification hardening
- Added retry/backoff fetch path for X API and oEmbed fallback helper.
- Added strict mode gate (`X_STRICT_MODE=true` by default):
  - if X API token missing in strict mode, claim fails (`x_api_required_in_strict_mode`).
- Enforced exact author-handle match and `#gascoin` check.

### 5) Queue + state machine completion
- Added server-side idempotency table and logic:
  - `idempotency_keys` table
  - claim submit idempotency (`scope=claim_submit`)
  - payout request idempotency (`scope=payout_request`)
- Submit flow now records explicit state transitions via `claim_status_events`.
- Claims worker upgraded:
  - normalizes `submitted -> auto_review`
  - auto-enqueues payout jobs for approved claims without jobs
  - processes due payout jobs in worker pass

### 6) Payout productionization (retries + dedupe)
- Added `payout_jobs` queue table with retry metadata:
  - attempts / max_attempts / next_retry_at / last_error
- Added exponential backoff retry scheduling.
- Added paid uniqueness protection:
  - `payouts_paid_claim_uq` unique index (`claim_id` where status='paid')
- Payout endpoint now:
  - idempotency-checks request payload
  - upserts payout job
  - processes queue job through shared worker logic

## New/updated files
- `lib/integrations/x.ts`
- `lib/idempotency.ts`
- `lib/payout-worker.ts`
- `app/api/claims/submit/route.ts`
- `app/api/workers/payout/route.ts`
- `app/api/workers/process-claims/route.ts`
- `db/schema.sql`
- `scripts/post_audit.mjs`

## Validation
- Build passes.
- Audit passes with new checks:
  - strict X mode
  - submit/payout idempotency
  - payout retry queue
  - worker payout processing
- Live E2E checks:
  - same submit idempotency key returns same claim id
  - worker processes due payout jobs
