-- Add content_hash column to scored_tweets for delete-and-repost dedup.
-- SHA256 of lowercased tweet text. If wallet has same hash within 30 days
-- for a different tweet_id, the duplicate is blocked from scoring.

alter table scored_tweets add column if not exists content_hash text;
create index if not exists idx_scored_tweets_content_hash on scored_tweets (wallet, content_hash);
