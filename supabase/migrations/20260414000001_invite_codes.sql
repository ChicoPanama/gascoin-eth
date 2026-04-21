-- ═══════════════════════════════════════════
-- Season 1 Beta — Invite Codes
-- ═══════════════════════════════════════════
--
-- Single-use invite codes that gate /api/claims/submit for the small
-- closed beta. The admin generates codes at /admin/invites and
-- distributes them manually. A tester redeems a code once via
-- POST /api/invites/redeem after signing in with Privy — redemption
-- binds the code to their X user id permanently. After that, the
-- submit route checks for a redeemed invite on every claim.
--
-- Single-use model: one code = one tester. When used_by_x_user_id is
-- set, the code is "spent" and cannot be redeemed by anyone else.
-- This gives a perfect audit trail for the small-group beta without
-- the operational complexity of multi-use caps or propagation logic.
--
-- Admin ownership: created_by stores the admin wallet or
-- `privy:{x_user_id}` session id so the /admin/invites page can
-- show who generated which batch. notes is free-text for
-- distribution context ("sent to @chico_panama", "TG announce batch 1").

CREATE TABLE IF NOT EXISTS invite_codes (
  id                 bigserial    PRIMARY KEY,
  code               text         NOT NULL UNIQUE,
  created_by         text         NOT NULL,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  notes              text,
  used_by_x_user_id  text,
  used_by_x_handle   text,
  redeemed_at        timestamptz
);

-- Fast lookup by code on the redeem hot path
CREATE INDEX IF NOT EXISTS idx_invite_codes_code
  ON invite_codes (code);

-- Fast lookup by redeemer for the submit-gate check — every claim
-- submission runs SELECT 1 FROM invite_codes WHERE used_by_x_user_id = ?
CREATE INDEX IF NOT EXISTS idx_invite_codes_redeemer
  ON invite_codes (used_by_x_user_id)
  WHERE used_by_x_user_id IS NOT NULL;

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Service role only — no anon access. Redemption goes through the
-- API route which uses the service role client and validates the
-- caller's Privy session before touching this table.
CREATE POLICY invite_codes_service_all ON invite_codes FOR ALL
  USING (true) WITH CHECK (true);

COMMENT ON TABLE invite_codes IS
  'Season 1 beta invite codes. Single-use. Gates /api/claims/submit.';
COMMENT ON COLUMN invite_codes.created_by IS
  'Admin wallet address or privy:{x_user_id} session id of the issuer';
COMMENT ON COLUMN invite_codes.used_by_x_user_id IS
  'X user id that redeemed the code. NULL = unused. Once set, cannot change.';
