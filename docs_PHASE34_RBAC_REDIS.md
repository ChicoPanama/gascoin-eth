# Phase 3.4 RBAC + Distributed Rate Limiting

## Implemented

### RBAC reviewer auth
- Added `admin_users` table (x_user_id, role, active).
- Added `lib/reviewer-auth.ts`:
  - validates reviewer/admin via Privy session + Supabase RBAC table.
  - keeps break-glass `REVIEWER_API_TOKEN` support.
- Review endpoint now enforces reviewer identity via RBAC helper.

### Distributed rate limiting
- Added `lib/rate-limit.ts`:
  - primary path: Upstash Redis REST (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
  - fallback path: in-memory limiter (dev/single instance)
- Submit API switched to `checkRateLimit(...)`.

## Files
- `db/schema.sql`
- `lib/reviewer-auth.ts`
- `lib/rate-limit.ts`
- `app/api/claims/[id]/review/route.ts`
- `app/api/claims/submit/route.ts`
- `.env.example`
- `scripts/post_audit.mjs`

## Notes
- For production, seed at least one reviewer row in `admin_users`.
- Break-glass token should be rotated and retained for emergency only.
- Upstash keys are optional locally but required for multi-instance launch hardening.
