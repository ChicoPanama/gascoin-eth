-- Gas Network Piece 2: add impact-scoring columns to scored_tweets
ALTER TABLE scored_tweets
  ADD COLUMN IF NOT EXISTS direct_payout_eth   NUMERIC,
  ADD COLUMN IF NOT EXISTS referral_payout_eth NUMERIC,
  ADD COLUMN IF NOT EXISTS referred_wallets    INT,
  ADD COLUMN IF NOT EXISTS impact_score        NUMERIC,
  ADD COLUMN IF NOT EXISTS impact_computed_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scored_tweets_impact_score
  ON scored_tweets(impact_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_scored_tweets_stale
  ON scored_tweets(impact_computed_at NULLS FIRST);

COMMENT ON COLUMN scored_tweets.impact_score IS
  'Gas Network composite impact score 0-100. Computed hourly by score-content-impact worker.';
COMMENT ON COLUMN scored_tweets.direct_payout_eth IS
  'ETH paid on the claim that cited this tweet as proof.';
COMMENT ON COLUMN scored_tweets.referral_payout_eth IS
  'ETH earned through referral_conversions sourced via this tweet.';
