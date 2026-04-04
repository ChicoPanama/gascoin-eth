# Phase 3.2 Hardening Pass

## Implemented

### 1) Receipt storage hardening
- Submit API now uploads raw receipt files to private Supabase Storage bucket: `receipts-private`.
- Metadata row in `claim_receipts` stores `storage_path_private` after upload succeeds.
- Upload failure is audited and submission is rejected.

### 2) Queue/API hardening
- Submit endpoint rate limiting added (in-memory guard):
  - window: 60s
  - max: 12 requests per IP/window
- Wallet input is now enforced against Privy session wallet (`wallet_mismatch_with_session`).

### 3) Reviewer action hardening
- Review endpoint now requires reviewer auth token:
  - `REVIEWER_API_TOKEN` (via bearer, `x-reviewer-token`, or body token)
- Terminal status protection added (cannot re-review paid/rejected claims).

### 4) Database hardening
- RLS enabled across core tables.
- Immutable trigger guard added for `claim_status_events` (update/delete blocked).
- Existing immutable `audit_logs` guard preserved.
- `public_claims_feed` view added for safe public feed access.
- `receipts-private` bucket creation + deny-by-default client policy added.

## Validation
- `npm run build` passes.
- `npm run audit:spec` passes with hardening checks:
  - submit rate limit
  - receipt storage upload path
  - reviewer auth guard
  - RLS enabled markers
- Schema pushed to linked Supabase project (`vpczpibnvlfzbfgpiyhs`) via migration `20260403071931_phase32_hardening.sql`.

## Notes
- Submit rate limiting is currently in-memory. For multi-instance production, migrate to Redis/shared limiter.
- Reviewer token should be replaced by proper admin SSO/RBAC for production.
