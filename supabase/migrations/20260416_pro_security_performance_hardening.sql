-- ═══════════════════════════════════════════════════════════════════
-- Pro security + performance hardening — 2026-04-16
-- Clears all Supabase advisor ERRORs and WARNs; enables Pro features
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Pro extensions ───────────────────────────────────────────
-- pg_trgm: trigram text-similarity for GIN indexes on wallet/handle
-- search. Installed in extensions schema (not public) per Supabase
-- convention to avoid the extension_in_public advisor warning.
create extension if not exists pg_trgm with schema extensions;

-- ── 2. Idle transaction timeout ─────────────────────────────────
-- Prevents connections from holding locks indefinitely when a client
-- opens a transaction and then stalls. 30 s is generous for our
-- server-side workloads (Vercel Functions max out at a few seconds).
alter database postgres set idle_in_transaction_session_timeout = '30000';

-- ── 3. Enable RLS on tables that had none ──────────────────────
-- wallet_token_cache and engagement_scores were exposed to PostgREST
-- without RLS — any holder of the anon key could read all wallet
-- balances. Service role bypasses RLS; our server code is unaffected.
alter table public.wallet_token_cache enable row level security;
alter table public.engagement_scores  enable row level security;

-- ── 4. Drop overly-permissive service_all policies ─────────────
-- intelligence_entries, invite_codes, knowledge_base had
-- USING(true) WITH CHECK(true) for ALL roles (PUBLIC).
-- That let any authenticated user INSERT/UPDATE/DELETE these tables.
-- Service role bypasses RLS so no replacement policy is needed.
drop policy if exists "ie_service_all"           on public.intelligence_entries;
drop policy if exists "invite_codes_service_all" on public.invite_codes;
drop policy if exists "kb_service_all"           on public.knowledge_base;

-- ── 5. Fix mutable search_path on trigger functions ─────────────
-- Without SET search_path, a role could shadow functions in a
-- malicious schema and hijack these immutability triggers.
create or replace function public.prevent_audit_log_mutation()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin raise exception 'audit_logs are immutable'; end;
$$;

create or replace function public.prevent_claim_status_mutation()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin raise exception 'claim_status_events are immutable'; end;
$$;

-- ── 6. Fix SECURITY DEFINER views → SECURITY INVOKER ───────────
-- SECURITY DEFINER views run with the view creator's privileges,
-- bypassing the querying user's RLS policies. PostgreSQL 15+ supports
-- ALTER VIEW ... SET (security_invoker = true).
alter view public.engagement_totals         set (security_invoker = true);
alter view public.gate_failure_reasons_view set (security_invoker = true);
alter view public.leaderboard_stats         set (security_invoker = true);
alter view public.leaderboard_view          set (security_invoker = true);
alter view public.public_claims_feed        set (security_invoker = true);
alter view public.receipts_to_flush         set (security_invoker = true);
alter view public.referral_counts           set (security_invoker = true);
alter view public.referral_summary_view     set (security_invoker = true);
alter view public.submission_queue_view     set (security_invoker = true);
alter view public.wallet_points_view        set (security_invoker = true);

-- gate_stats_view: drop + recreate to rename columns from
-- (total_processed, total_passed) → (total, passed) to match
-- what admin/stats/page.tsx queries
drop view if exists public.gate_stats_view cascade;
create view public.gate_stats_view
with (security_invoker = true) as
select
  gate_name                                                       as gate_id,
  count(*)                                                        as total,
  count(*) filter (where passed = true)                           as passed,
  count(*) filter (where passed = false)                          as failed,
  round(
    (count(*) filter (where passed = true))::numeric /
    nullif(count(*), 0)::numeric * 100, 1
  )                                                               as pass_rate_pct
from public.gate_results
group by gate_name;

grant select on public.gate_stats_view to anon, authenticated;

-- ── 7. Missing FK indexes (advisor: unindexed_foreign_keys) ─────
-- These FKs had no covering index; ON DELETE CASCADE scans the
-- child table linearly and JOIN queries on claim_id are hot.
create index if not exists idx_claim_receipts_claim_id
  on public.claim_receipts(claim_id);
create index if not exists idx_claim_status_events_claim_id
  on public.claim_status_events(claim_id);
create index if not exists idx_claims_user_id
  on public.claims(user_id);
create index if not exists idx_gate_results_claim_id
  on public.gate_results(claim_id);
create index if not exists idx_referral_clicks_converted_id
  on public.referral_clicks(converted_submission_id);
create index if not exists idx_x_handle_history_user_id
  on public.x_handle_history(user_id);

-- ── 8. Autovacuum tuning for hot tables ─────────────────────────
-- Default scale_factor=0.2 + threshold=50 means a table with < 250
-- live rows won't trigger autovacuum until 50+ dead rows accumulate.
-- These are the high-churn post-launch tables; 5% is appropriate.
alter table public.claims             set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
alter table public.payouts            set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
alter table public.engagement_points  set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
alter table public.audit_logs         set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
alter table public.payout_jobs        set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
alter table public.users              set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
alter table public.gate_results       set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);
alter table public.wallet_token_cache set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);

-- ── NOTE: One manual dashboard step remains ─────────────────────
-- Auth DB Connection Strategy: go to Supabase Dashboard →
-- Settings → Database → Connection Pooling and switch from
-- "Absolute" (10 connections) to "Percentage" for Auth.
-- This cannot be changed via SQL — requires the UI.
