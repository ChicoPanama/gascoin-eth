-- Gas Network Piece 3: Intelligence API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet        TEXT         NOT NULL,
  key_hash      TEXT         NOT NULL UNIQUE,
  key_prefix    TEXT         NOT NULL,
  tier          TEXT         NOT NULL DEFAULT 'free',
  label         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_wallet ON api_keys(wallet);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- No public policies; only service role touches this table.
REVOKE ALL ON api_keys FROM anon, authenticated;

COMMENT ON TABLE api_keys IS
  'Gas Network Intelligence API keys. key_hash is sha256 of plaintext. Plaintext is returned only at creation.';
COMMENT ON COLUMN api_keys.tier IS
  'Granted tier at creation. Live tier is min(stored tier, current wallet balance tier).';
