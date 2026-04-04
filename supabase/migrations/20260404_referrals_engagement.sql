-- ─── REFERRALS ───
-- Tracks who referred whom. referrer_wallet gets credit.
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_wallet text not null,
  referred_wallet text not null,
  referred_claim_id uuid references claims(id) on delete set null,
  status text not null default 'pending',
  -- status: 'pending' | 'verified' | 'rejected'
  -- verified = referred user completed a successful submission
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique(referred_wallet)
);

create index if not exists referrals_referrer_idx on referrals(referrer_wallet);
create index if not exists referrals_referred_idx on referrals(referred_wallet);

alter table referrals enable row level security;

-- ─── ENGAGEMENT ───
-- Tracks tweet engagement metrics per claim/user
create table if not exists engagement_scores (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  claim_id uuid references claims(id) on delete cascade,
  tweet_url text not null,
  impressions integer not null default 0,
  likes integer not null default 0,
  retweets integer not null default 0,
  replies integer not null default 0,
  quote_tweets integer not null default 0,
  -- Composite engagement score calculated from metrics
  score numeric not null default 0,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists engagement_wallet_idx on engagement_scores(wallet);

alter table engagement_scores enable row level security;

-- ─── AGGREGATION VIEWS ───

-- Referral counts per wallet
create or replace view referral_counts as
select
  referrer_wallet as wallet,
  count(*) filter (where status = 'verified') as verified_referrals,
  count(*) as total_referrals
from referrals
group by referrer_wallet;

grant select on referral_counts to anon, authenticated;

-- Engagement totals per wallet
create or replace view engagement_totals as
select
  wallet,
  sum(score) as total_engagement_score,
  sum(impressions) as total_impressions,
  sum(likes) as total_likes,
  sum(retweets) as total_retweets,
  count(*) as scored_tweets
from engagement_scores
group by wallet;

grant select on engagement_totals to anon, authenticated;
