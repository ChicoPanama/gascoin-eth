-- Gas Network — Composite Influence Score v2 cache.
-- Applied to prod via Supabase MCP on 2026-04-19. Tracked here for
-- reproducibility of branch/preview databases.

CREATE TABLE IF NOT EXISTS composite_scores (
  wallet TEXT PRIMARY KEY,
  composite NUMERIC NOT NULL DEFAULT 0,
  payout_pct NUMERIC NOT NULL DEFAULT 0,
  engagement_pct NUMERIC NOT NULL DEFAULT 0,
  consistency_pct NUMERIC NOT NULL DEFAULT 0,
  referral_pct NUMERIC NOT NULL DEFAULT 0,
  trust_dampener NUMERIC NOT NULL DEFAULT 0.4,
  recency_mult NUMERIC NOT NULL DEFAULT 1.0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_composite_scores_desc
  ON composite_scores (composite DESC);

-- Public view: safe fields only, for anonymous leaderboard reads.
CREATE OR REPLACE VIEW composite_scores_public AS
SELECT wallet, composite, computed_at
FROM composite_scores;

GRANT SELECT ON composite_scores_public TO anon;
