-- Gas Network Piece 4: Reach certificate mint ledger
CREATE TABLE IF NOT EXISTS certificate_mints (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      TEXT         NOT NULL,
  handle      TEXT         NOT NULL,
  milestone   TEXT         NOT NULL,
  amount      NUMERIC      NOT NULL,
  token_id    BIGINT,
  tx_hash     TEXT,
  status      TEXT         NOT NULL DEFAULT 'pending',
  minted_at   TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(wallet, milestone)
);

CREATE INDEX IF NOT EXISTS idx_certificate_mints_wallet ON certificate_mints(wallet);
CREATE INDEX IF NOT EXISTS idx_certificate_mints_status ON certificate_mints(status);

ALTER TABLE certificate_mints ENABLE ROW LEVEL SECURITY;

-- Public read-only view (safe fields only: token + handle + milestone + minted_at)
CREATE OR REPLACE VIEW certificate_mints_public
WITH (security_invoker = true) AS
SELECT handle, milestone, amount, token_id, tx_hash, minted_at
FROM certificate_mints
WHERE status = 'paid' AND tx_hash IS NOT NULL;

GRANT SELECT ON certificate_mints_public TO anon, authenticated;

COMMENT ON TABLE certificate_mints IS
  'Ledger of reach certificate mints. wallet + milestone is unique to prevent double-mint.';
COMMENT ON COLUMN certificate_mints.status IS
  'pending | paid | failed. paid = tx confirmed on-chain.';
