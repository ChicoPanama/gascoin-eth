-- Referral click tracking
create table if not exists referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  referrer_wallet text not null,
  click_fingerprint text,
  clicked_at timestamptz not null default now(),
  converted_submission_id uuid references claims(id),
  converted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists idx_referral_clicks_code on referral_clicks(referral_code);
create index if not exists idx_referral_clicks_referrer on referral_clicks(referrer_wallet);

alter table referral_clicks enable row level security;

-- Referral conversions
create table if not exists referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  referrer_wallet text not null,
  referred_wallet text not null,
  submission_id uuid not null references claims(id),
  reward_sol numeric(12,6) not null default 0.005,
  reward_status text not null default 'pending'
    check (reward_status in ('pending', 'dispatched', 'failed', 'skipped')),
  reward_tx_signature text,
  skip_reason text,
  created_at timestamptz not null default now(),
  dispatched_at timestamptz,
  constraint no_self_referral check (referrer_wallet != referred_wallet),
  constraint unique_submission_referral unique (submission_id)
);

create index if not exists idx_referral_conversions_referrer on referral_conversions(referrer_wallet);
create index if not exists idx_referral_conversions_status on referral_conversions(reward_status);

alter table referral_conversions enable row level security;

-- Add referral_code to claims
alter table claims add column if not exists referral_code text;
create index if not exists idx_claims_referral_code on claims(referral_code);

-- Referral summary view
create or replace view referral_summary_view as
select
  referrer_wallet,
  count(*) filter (where reward_status in ('dispatched', 'pending')) as total_conversions,
  count(*) filter (where reward_status = 'dispatched') as paid_conversions,
  coalesce(sum(reward_sol) filter (where reward_status = 'dispatched'), 0) as total_referral_sol_earned,
  max(created_at) as last_conversion_at,
  rank() over (order by count(*) filter (where reward_status in ('dispatched', 'pending')) desc) as referral_rank
from referral_conversions
group by referrer_wallet
order by total_conversions desc;

grant select on referral_summary_view to anon, authenticated;
grant select on referral_clicks to anon, authenticated;
grant select on referral_conversions to anon, authenticated;
grant insert on referral_clicks to anon, authenticated;
