-- Engagement velocity: keep a rolling history of metric snapshots per tweet
-- so spikes between hourly scoring passes are visible to fraud detection.
ALTER TABLE scored_tweets
  ADD COLUMN IF NOT EXISTS metrics_history jsonb DEFAULT '[]'::jsonb;
