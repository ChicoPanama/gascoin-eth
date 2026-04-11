-- Phase 2: Metrics persistence tables
-- Tracks user metrics over time for trend analysis and Claude oversight

-- 1. User metrics snapshots (taken on submission, payout verify, daily cron)
CREATE TABLE IF NOT EXISTS user_metrics_history (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  wallet text NOT NULL,
  x_handle text,
  follower_count integer,
  following_count integer,
  tweet_count integer,
  listed_count integer,
  account_quality_score numeric,
  account_quality_passed boolean,
  gascoin_balance numeric,
  tier_id integer,
  ip_country text,
  x_location text,
  snapshot_source text NOT NULL, -- 'submission', 'payout_verify', 'daily_cron', 'engagement_scan'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_umh_user ON user_metrics_history(user_id, created_at DESC);
CREATE INDEX idx_umh_wallet ON user_metrics_history(wallet, created_at DESC);
CREATE INDEX idx_umh_source ON user_metrics_history(snapshot_source, created_at DESC);

ALTER TABLE user_metrics_history ENABLE ROW LEVEL SECURITY;

-- 2. X handle change history (tracks when users change their X username)
CREATE TABLE IF NOT EXISTS x_handle_history (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  x_user_id text NOT NULL,
  old_handle text NOT NULL,
  new_handle text NOT NULL,
  detected_at timestamptz DEFAULT now()
);

CREATE INDEX idx_xhh_user ON x_handle_history(x_user_id, detected_at DESC);

ALTER TABLE x_handle_history ENABLE ROW LEVEL SECURITY;

-- 3. Add ip_country to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS ip_country text;

-- 4. Add x_location, bio, quality trending, account age, and protected status to wallet_x_links
ALTER TABLE wallet_x_links ADD COLUMN IF NOT EXISTS x_location text;
ALTER TABLE wallet_x_links ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE wallet_x_links ADD COLUMN IF NOT EXISTS avg_quality_score numeric;
ALTER TABLE wallet_x_links ADD COLUMN IF NOT EXISTS x_account_created_at timestamptz;
ALTER TABLE wallet_x_links ADD COLUMN IF NOT EXISTS x_is_protected boolean DEFAULT false;
