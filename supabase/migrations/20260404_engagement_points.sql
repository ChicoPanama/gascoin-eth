-- Engagement points ledger — tracks all points earned per wallet
create table if not exists engagement_points (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  source text not null,
  -- source values: 'tweet_engagement', 'submission_approved', 'streak_bonus', 'referral_conversion'
  points numeric not null default 0,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_engagement_points_wallet on engagement_points(wallet);
create index if not exists idx_engagement_points_source on engagement_points(source);

-- Wallet points summary view
create or replace view wallet_points_view as
select
  wallet,
  coalesce(sum(points), 0) as total_points,
  coalesce(sum(points) filter (where source = 'tweet_engagement'), 0) as tweet_points,
  coalesce(sum(points) filter (where source = 'submission_approved'), 0) as submission_points,
  coalesce(sum(points) filter (where source = 'streak_bonus'), 0) as streak_points,
  coalesce(sum(points) filter (where source = 'referral_conversion'), 0) as referral_points,
  max(created_at) as last_earned_at
from engagement_points
group by wallet
order by total_points desc;

grant select on wallet_points_view to anon, authenticated;
grant select on engagement_points to anon, authenticated;
grant insert on engagement_points to anon, authenticated;

alter table engagement_points enable row level security;
