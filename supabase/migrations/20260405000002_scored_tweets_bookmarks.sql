-- Add bookmarks column to scored_tweets for richer engagement tracking
-- bookmark_count is available in X API v2 public_metrics but was previously unused

alter table scored_tweets add column if not exists bookmarks integer not null default 0;
