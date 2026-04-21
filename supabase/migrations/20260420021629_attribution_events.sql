-- Gas Network Piece 5: conversion attribution ledger
CREATE TABLE IF NOT EXISTS attribution_events (
  id                 BIGSERIAL    PRIMARY KEY,
  source_tweet_id    TEXT         NOT NULL,
  stage              TEXT         NOT NULL,
  referred_wallet    TEXT,
  occurred_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  metadata           JSONB,
  CONSTRAINT attribution_events_stage_check CHECK (
    stage IN ('impression','profile_click','wallet_connect','submission','payout')
  )
);

CREATE INDEX IF NOT EXISTS idx_attribution_events_tweet ON attribution_events(source_tweet_id, stage, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_events_wallet ON attribution_events(referred_wallet, occurred_at DESC);

ALTER TABLE attribution_events ENABLE ROW LEVEL SECURITY;

-- Public funnel view: aggregate per tweet. Safe to expose (no PII —
-- referred_wallet is already a truncated public address if returned).
CREATE OR REPLACE VIEW attribution_funnels
WITH (security_invoker = true) AS
SELECT
  source_tweet_id,
  stage,
  COUNT(*) AS event_count,
  COUNT(DISTINCT referred_wallet) FILTER (WHERE referred_wallet IS NOT NULL) AS unique_wallets,
  MAX(occurred_at) AS last_event_at
FROM attribution_events
GROUP BY source_tweet_id, stage;

GRANT SELECT ON attribution_funnels TO anon, authenticated;

COMMENT ON TABLE attribution_events IS
  'Gas Network — conversion attribution ledger. Append-only. Each row traces a user journey stage back to a source tweet.';
COMMENT ON COLUMN attribution_events.stage IS
  'One of: impression | profile_click | wallet_connect | submission | payout';
