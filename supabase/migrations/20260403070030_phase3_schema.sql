-- GASCOIN platform schema (Supabase/Postgres)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  x_user_id text unique not null,
  x_handle text not null,
  x_verified boolean not null default false,
  trust_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists wallet_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  wallet text not null,
  is_primary boolean not null default true,
  verified_at timestamptz,
  unique(user_id, wallet)
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  wallet text not null,
  tweet_url text not null,
  nonce text not null,
  status text not null default 'submitted',
  claimed_amount numeric,
  parsed_amount numeric,
  claim_currency text default 'USD',
  risk_score numeric,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists claim_receipts (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  storage_path_private text not null,
  hash_sha256 text not null,
  phash text,
  ocr_text text,
  ocr_confidence numeric,
  ai_score numeric,
  tamper_score numeric,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists claim_receipts_hash_sha256_uq on claim_receipts(hash_sha256);
create index if not exists claim_receipts_phash_idx on claim_receipts(phash);

create table if not exists gate_results (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  gate_name text not null,
  passed boolean not null,
  score numeric,
  reason_code text,
  created_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  wallet text not null,
  amount_eth numeric not null,
  tx_hash text,
  status text not null default 'queued',
  sent_at timestamptz,
  fail_reason text,
  created_at timestamptz not null default now()
);

create table if not exists treasury_snapshots (
  id bigserial primary key,
  wallet text not null,
  eth_balance numeric not null,
  usd_value numeric not null,
  gascoin_balance numeric,
  gascoin_usd_value numeric,
  ts timestamptz not null default now()
);

create table if not exists market_snapshots (
  id bigserial primary key,
  gascoin_price_usd numeric not null,
  market_cap_usd numeric not null,
  volume_24h_usd numeric not null,
  source text not null,
  ts timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  actor_type text not null,
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  payload_json jsonb,
  ts timestamptz not null default now()
);

create table if not exists claim_status_events (
  id bigserial primary key,
  claim_id uuid not null references claims(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_type text not null,
  actor_id text,
  reason text,
  ts timestamptz not null default now()
);

create table if not exists user_bans (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  reason text not null,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists user_bans_active_uq on user_bans(user_id) where active = true;

-- Immutable audit log guardrails
create or replace function prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are immutable';
end;
$$;

drop trigger if exists trg_prevent_audit_log_update on audit_logs;
create trigger trg_prevent_audit_log_update
before update on audit_logs
for each row
execute function prevent_audit_log_mutation();

drop trigger if exists trg_prevent_audit_log_delete on audit_logs;
create trigger trg_prevent_audit_log_delete
before delete on audit_logs
for each row
execute function prevent_audit_log_mutation();

create table if not exists gas_city_prices (
  id bigserial primary key,
  city text not null,
  country text not null,
  currency text not null,
  price_per_liter numeric not null,
  price_per_gallon_usd numeric not null,
  source text not null,
  ts timestamptz not null default now()
);
