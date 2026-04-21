-- D4: Add composite index on claims(status, created_at DESC)
-- The existing idx_claims_status covers status equality filters,
-- but process-claims and other workers query:
--   WHERE status = 'submitted' ORDER BY created_at ASC
-- A composite index lets Postgres satisfy both the filter and the
-- sort in a single index scan, avoiding a separate sort step.
create index if not exists idx_claims_status_created
  on claims(status, created_at desc);
