-- Gas Network Piece 5.5: un-defer wallet_connect + impression signals

-- A. wallet_connect — tag every referral click with its source tweet
ALTER TABLE referral_clicks
  ADD COLUMN IF NOT EXISTS source_tweet_id TEXT;

CREATE INDEX IF NOT EXISTS idx_referral_clicks_src
  ON referral_clicks(source_tweet_id)
  WHERE source_tweet_id IS NOT NULL;

COMMENT ON COLUMN referral_clicks.source_tweet_id IS
  'X tweet_id that carried the referral URL (populated via ?src= query param).';

-- B. impression — persist prior impression count for delta computation
ALTER TABLE scored_tweets
  ADD COLUMN IF NOT EXISTS last_scored_impressions INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN scored_tweets.last_scored_impressions IS
  'Impression count at the previous score-engagement run. Delta = impressions - last_scored_impressions drives impression attribution events.';
