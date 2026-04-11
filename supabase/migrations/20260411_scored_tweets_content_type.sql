-- Add content_type column to scored_tweets to track what kind of content users create.
-- X applies up to 90% impression deduction on reposts/third-party content.
-- Original videos get maximum distribution — we reward accordingly.

alter table scored_tweets add column if not exists content_type text not null default 'text_only';
