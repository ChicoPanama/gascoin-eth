-- ─── ADMIN SESSIONS ───
create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  session_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_sessions_token on admin_sessions(session_token);

-- ─── TOKEN GATING CACHE ───
create table if not exists wallet_token_cache (
  wallet_address text primary key,
  gascoin_balance numeric not null default 0,
  tier_id integer not null default 0,
  tier_slug text not null default 'standard',
  last_checked_at timestamptz not null default now(),
  check_error text
);

create index if not exists idx_token_cache_tier on wallet_token_cache(tier_id);

-- ─── TOKEN GATING COLUMNS ON CLAIMS ───
alter table claims add column if not exists submitter_tier_id integer not null default 0;
alter table claims add column if not exists submitter_tier_slug text not null default 'standard';
alter table claims add column if not exists submitter_gascoin_balance numeric not null default 0;
alter table claims add column if not exists max_sol_refund_cap numeric not null default 0.05;

-- ─── PRIORITY QUEUE VIEW ───
create or replace view submission_queue_view as
select
  c.*,
  row_number() over (
    order by c.submitter_tier_id desc, c.created_at asc
  ) as queue_position
from claims c
where c.status in ('submitted', 'auto_review', 'needs_manual_review')
order by c.submitter_tier_id desc, c.created_at asc;

grant select on submission_queue_view to anon, authenticated;

-- RLS
alter table admin_sessions enable row level security;
alter table wallet_token_cache enable row level security;
