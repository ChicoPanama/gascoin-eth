-- Season 1 Pioneer Bonus registration.
-- One row per beta tester, pinned at invite redemption. Every beta claim
-- must come from the wallet recorded here; at launch the Pioneer Bonus
-- pays out to this address. Privy state is advisory from this point on —
-- this table is authoritative for where rewards land.

CREATE TABLE IF NOT EXISTS beta_participants (
  x_user_id      TEXT         PRIMARY KEY,
  x_handle       TEXT         NOT NULL,
  wallet         TEXT         NOT NULL,
  invite_code    TEXT         NOT NULL REFERENCES invite_codes(code),
  locked_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_participants_wallet ON beta_participants(wallet);

ALTER TABLE beta_participants ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE beta_participants IS
  'Season 1 beta wallet-lock registry. One row per tester; wallet pinned at invite-code redemption. Every subsequent beta claim from this x_user_id must match this wallet. Pioneer Bonus payout target at Season 1 close.';

COMMENT ON COLUMN beta_participants.wallet IS
  'EIP-55 checksum Ethereum address. Pinned at redemption; immutable from then on. Pioneer Bonus pays here.';

-- Backfill: retroactively lock existing beta participants.
-- Source of truth is the last claim they submitted. Join invite_codes by
-- used_by_x_user_id so we preserve the invite-code lineage.
INSERT INTO beta_participants (x_user_id, x_handle, wallet, invite_code, locked_at)
SELECT DISTINCT ON (ic.used_by_x_user_id)
  ic.used_by_x_user_id,
  COALESCE(ic.used_by_x_handle, u.x_handle, ''),
  c.wallet,
  ic.code,
  ic.redeemed_at
FROM invite_codes ic
LEFT JOIN users u ON u.x_user_id = ic.used_by_x_user_id
JOIN claims c ON c.user_id = u.id
WHERE ic.used_by_x_user_id IS NOT NULL
  AND c.wallet IS NOT NULL
ORDER BY ic.used_by_x_user_id, c.created_at DESC
ON CONFLICT (x_user_id) DO NOTHING;
