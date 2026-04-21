-- Gas Network Piece 6: Creator Marketplace

CREATE TABLE IF NOT EXISTS briefs (
  id                BIGSERIAL     PRIMARY KEY,
  onchain_id        BIGINT        UNIQUE,
  brand_wallet      TEXT          NOT NULL,
  brand_contact     TEXT,
  title             TEXT          NOT NULL,
  description       TEXT,
  amount_usdc       NUMERIC       NOT NULL,
  threshold         INT           NOT NULL,
  deadline          TIMESTAMPTZ   NOT NULL,
  required_tags     TEXT[]        DEFAULT ARRAY['#gascoin','@GasCoinApp']::TEXT[],
  min_creator_tier  TEXT,
  tx_hash_create    TEXT,
  status            TEXT          NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT briefs_status_check CHECK (
    status IN ('draft','open','accepted','released','refunded','resolved','cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_briefs_brand     ON briefs(brand_wallet);
CREATE INDEX IF NOT EXISTS idx_briefs_status    ON briefs(status);
CREATE INDEX IF NOT EXISTS idx_briefs_onchain   ON briefs(onchain_id);
CREATE INDEX IF NOT EXISTS idx_briefs_deadline  ON briefs(deadline);

CREATE TABLE IF NOT EXISTS applications (
  id                BIGSERIAL     PRIMARY KEY,
  brief_id          BIGINT        NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  creator_wallet    TEXT          NOT NULL,
  creator_handle    TEXT,
  pitch             TEXT,
  status            TEXT          NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  decided_at        TIMESTAMPTZ,
  UNIQUE(brief_id, creator_wallet),
  CONSTRAINT applications_status_check CHECK (
    status IN ('pending','accepted','rejected','withdrawn')
  )
);

CREATE INDEX IF NOT EXISTS idx_applications_brief  ON applications(brief_id);
CREATE INDEX IF NOT EXISTS idx_applications_wallet ON applications(creator_wallet);

CREATE TABLE IF NOT EXISTS performance_snapshots (
  id                BIGSERIAL     PRIMARY KEY,
  brief_id          BIGINT        NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  tweet_id          TEXT          NOT NULL,
  impact_score      INT           NOT NULL,
  scored_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  metadata          JSONB
);

CREATE INDEX IF NOT EXISTS idx_perf_snap_brief ON performance_snapshots(brief_id, scored_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id                BIGSERIAL     PRIMARY KEY,
  brief_id          BIGINT        NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  kind              TEXT          NOT NULL,
  attestation       JSONB,
  tx_hash           TEXT,
  amount_usdc       NUMERIC,
  recipient_wallet  TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT payments_kind_check CHECK (kind IN ('release','refund','resolve'))
);

CREATE INDEX IF NOT EXISTS idx_payments_brief ON payments(brief_id);

ALTER TABLE briefs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;

-- Public read-safe view of open briefs (no brand PII beyond wallet)
CREATE OR REPLACE VIEW briefs_public
WITH (security_invoker = true) AS
SELECT id, onchain_id, title, description, amount_usdc, threshold, deadline,
       required_tags, min_creator_tier, status, created_at
FROM briefs
WHERE status IN ('open', 'accepted', 'released');

GRANT SELECT ON briefs_public TO anon, authenticated;

COMMENT ON TABLE briefs IS
  'Gas Network marketplace — brand-posted creator briefs. onchain_id = GascoinMarketplaceEscrow.nextBriefId at createBrief tx.';
COMMENT ON COLUMN briefs.threshold IS
  'Min impact_score × 100 (score 60.0 × 100 = 6000). Matches on-chain contract integer math.';
