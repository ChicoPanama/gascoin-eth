# Phase 3 — Supabase persistence + reviewer controls

Implemented:

1) Persist claims/gates to Supabase
- `POST /api/claims/submit` now writes:
  - `users`
  - `wallet_links`
  - `claims`
  - `claim_receipts`
  - `gate_results`
  - `claim_status_events`
  - `audit_logs`

2) Real duplicate hash / pHash storage
- `runFraudChecks` computes:
  - `hashSha256`
  - `pHash` (compact fingerprint)
- Submission route queries `claim_receipts` for existing hash/pHash before decision.
- Receipt fingerprints are persisted to `claim_receipts`.

3) Reviewer actions + immutable audit logs
- New endpoint: `POST /api/claims/:id/review`
  - actions: `approve | reject | ban`
  - reject/ban require reason
  - updates claim status
  - inserts `claim_status_events`
  - writes `audit_logs`
  - `ban` writes `user_bans`
- Schema adds trigger-based guard to block UPDATE/DELETE on `audit_logs`.

Additional:
- `GET /api/admin/queue` now reads real queue rows from Supabase.
- `POST /api/workers/payout` now writes payout + audit rows and status transitions.

## Hardening pass included
- Receipt files are uploaded to private bucket `receipts-private` before receipt metadata insert.
- Submit endpoint has basic rate limit guard.
- Review endpoint requires `REVIEWER_API_TOKEN` auth.
- RLS enabled for core tables.
- Immutable trigger guard added for `claim_status_events` update/delete.

## Environment required
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)

## Migration note
Apply `db/schema.sql` to your dedicated GASCOIN Supabase project before running production flows.
