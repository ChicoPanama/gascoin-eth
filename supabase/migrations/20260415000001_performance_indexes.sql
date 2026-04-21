-- ─────────────────────────────────────────────────────────────────
-- Performance indexes + server-side aggregation RPCs
-- 2026-04-15 — Supabase optimization pass
-- ─────────────────────────────────────────────────────────────────

-- ── P0: claims ─────────────────────────────────────────────────────
-- Per-wallet claim lookups (submission portal, admin per-user views)
create index if not exists idx_claims_wallet  on claims(wallet);
-- Pipeline queue filtering: status IN (submitted, auto_review, ...)
create index if not exists idx_claims_status  on claims(status);

-- ── P1: payouts ────────────────────────────────────────────────────
-- Leaderboard + admin stats: WHERE status='paid' GROUP BY wallet
create index if not exists idx_payouts_wallet_status on payouts(wallet, status);

-- ── P1: audit_logs ─────────────────────────────────────────────────
-- Admin activity feed: ORDER BY created_at DESC LIMIT n
create index if not exists idx_audit_logs_ts on audit_logs(ts desc);

-- ── P1: intelligence_entries ───────────────────────────────────────
-- Intelligence feed default view: WHERE acknowledged = false ORDER BY created_at DESC
create index if not exists idx_intel_ack_created
  on intelligence_entries(acknowledged, created_at desc);
-- Severity filter + acknowledged filter (header stat cards)
create index if not exists idx_intel_severity_ack
  on intelligence_entries(severity, acknowledged);

-- ── P2: engagement_points ──────────────────────────────────────────
-- Leaderboard aggregation: WHERE source IN (...) GROUP BY wallet
create index if not exists idx_ep_wallet_source
  on engagement_points(wallet, source);

-- ─────────────────────────────────────────────────────────────────
-- Server-side aggregation RPCs (replace in-JS full-table scans)
-- ─────────────────────────────────────────────────────────────────

-- Claims status counts for admin/stats
create or replace function get_claims_status_counts()
returns table(status text, cnt bigint)
language sql stable security definer as $$
  select status, count(*) as cnt
  from claims
  group by status;
$$;

-- Payouts aggregated by wallet for admin/stats top-wallets table
create or replace function get_payouts_by_wallet(lim int default 10)
returns table(wallet text, total_eth numeric, payout_count bigint)
language sql stable security definer as $$
  select wallet, sum(amount_eth) as total_eth, count(*) as payout_count
  from payouts
  where status = 'paid'
  group by wallet
  order by total_eth desc
  limit lim;
$$;

-- Leaderboard aggregation: replaces full payouts table scan in useLeaderboard
create or replace function get_leaderboard_data(lim int default 100)
returns table(
  wallet       text,
  total_eth    numeric,
  payout_count bigint,
  last_at      timestamptz
)
language sql stable security definer as $$
  select
    wallet,
    sum(amount_eth)  as total_eth,
    count(*)         as payout_count,
    max(created_at)  as last_at
  from payouts
  where status = 'paid'
  group by wallet
  order by total_eth desc
  limit lim;
$$;

-- Intelligence feed severity counts for header stat cards
-- Returns one row per severity; caller extracts critical/high/medium/total
create or replace function get_intelligence_severity_counts()
returns table(severity text, cnt bigint)
language sql stable security definer as $$
  select severity, count(*) as cnt
  from intelligence_entries
  where acknowledged = false
  group by severity;
$$;

-- Grant execute to service role (already has full access) and anon/authenticated
-- for any future public-facing leaderboard API
grant execute on function get_leaderboard_data(int)          to authenticated, anon;
grant execute on function get_claims_status_counts()         to authenticated;
grant execute on function get_payouts_by_wallet(int)         to authenticated;
grant execute on function get_intelligence_severity_counts() to authenticated;
