-- Gas Network Piece 1: Verified Creator Profiles
-- Handle PK: x_handle (lowercased). Wallet FK loose (text, no FK enforcement
-- since wallet_x_links.wallet is itself text). is_verified is admin-toggled.

CREATE TABLE IF NOT EXISTS creator_profiles (
  handle                  TEXT         PRIMARY KEY,
  wallet                  TEXT         NOT NULL,
  is_verified             BOOLEAN      NOT NULL DEFAULT false,
  creator_tier            TEXT,
  engagement_consistency  NUMERIC,
  audience_growth_rate    NUMERIC,
  content_authenticity    NUMERIC,
  first_seen_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_updated            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_wallet ON creator_profiles(wallet);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_verified ON creator_profiles(is_verified) WHERE is_verified = true;

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Public read-only view. Joins wallet_x_links (X metadata) + aggregated
-- scored_tweets + aggregated paid payouts. Safe for anon — no wallet-level
-- PII beyond what's already public on X.
CREATE OR REPLACE VIEW creator_public_view
WITH (security_invoker = true) AS
SELECT
  cp.handle,
  cp.wallet,
  cp.is_verified,
  cp.creator_tier,
  cp.engagement_consistency,
  cp.audience_growth_rate,
  cp.content_authenticity,
  cp.first_seen_at,
  wxl.profile_image_url,
  wxl.avg_quality_score,
  wxl.bio,
  wxl.x_location,
  wxl.linked_at,
  wxl.x_account_created_at,
  -- Aggregates computed on read; switch to materialized view if slow
  (SELECT COALESCE(SUM(st.impressions), 0) FROM scored_tweets st WHERE st.wallet = cp.wallet)    AS total_impressions,
  (SELECT COUNT(*)                          FROM scored_tweets st WHERE st.wallet = cp.wallet)    AS total_posts,
  (SELECT COALESCE(SUM(p.amount_eth), 0)    FROM payouts p         WHERE p.wallet = cp.wallet AND p.status = 'paid')  AS total_eth_earned,
  (SELECT COUNT(*)                          FROM payouts p         WHERE p.wallet = cp.wallet AND p.status = 'paid')  AS total_paid_claims
FROM creator_profiles cp
LEFT JOIN wallet_x_links wxl ON LOWER(wxl.x_handle) = cp.handle;

GRANT SELECT ON creator_public_view TO anon, authenticated;

COMMENT ON TABLE creator_profiles IS 'Gas Network — verified creator profile metadata, keyed by lowercased X handle.';
COMMENT ON COLUMN creator_profiles.engagement_consistency IS '0-100; rolling std-dev-based score of posting cadence.';
COMMENT ON COLUMN creator_profiles.audience_growth_rate IS 'Follower delta per week, normalized.';
COMMENT ON COLUMN creator_profiles.content_authenticity IS 'Avg quality_score weighted by recency.';
