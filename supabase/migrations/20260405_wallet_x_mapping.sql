-- Persistent wallet ↔ X handle mapping for engagement tracking
-- Used by engagement worker to find ALL #gascoin tweets from linked accounts

create table if not exists wallet_x_links (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  x_handle text not null,
  x_user_id text,
  linked_at timestamptz not null default now(),
  last_tweet_scan timestamptz,
  is_active boolean not null default true,
  unique(wallet, x_handle)
);

create index if not exists idx_wallet_x_links_wallet on wallet_x_links(wallet);
create index if not exists idx_wallet_x_links_handle on wallet_x_links(x_handle);
create index if not exists idx_wallet_x_links_active on wallet_x_links(is_active) where is_active = true;

-- Track individual tweets scored (not just claim-linked tweets)
create table if not exists scored_tweets (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  x_handle text not null,
  tweet_id text not null unique,
  tweet_url text not null,
  tweet_text text,
  posted_at timestamptz,
  -- Metrics at last fetch
  impressions integer not null default 0,
  likes integer not null default 0,
  retweets integer not null default 0,
  quote_tweets integer not null default 0,
  replies integer not null default 0,
  -- Points
  raw_points integer not null default 0,
  adjusted_points integer not null default 0,
  quality_score numeric,
  quality_multiplier numeric,
  -- Tracking
  first_scored_at timestamptz not null default now(),
  last_scored_at timestamptz not null default now(),
  score_count integer not null default 1
);

create index if not exists idx_scored_tweets_wallet on scored_tweets(wallet);
create index if not exists idx_scored_tweets_handle on scored_tweets(x_handle);
create index if not exists idx_scored_tweets_posted on scored_tweets(posted_at desc);

alter table wallet_x_links enable row level security;
alter table scored_tweets enable row level security;
grant select on wallet_x_links to anon, authenticated;
grant select on scored_tweets to anon, authenticated;
