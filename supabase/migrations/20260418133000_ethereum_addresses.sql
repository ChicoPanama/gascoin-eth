-- Migration: add Ethereum address columns alongside existing Solana columns
-- Phase 1 — additive only, no drops. Rollback safe.

-- claims table
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS wallet_eth TEXT,
  ADD CONSTRAINT claims_wallet_eth_format
    CHECK (wallet_eth IS NULL OR wallet_eth ~ '^0x[a-fA-F0-9]{40}$');

-- payouts table
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS wallet_eth TEXT,
  ADD COLUMN IF NOT EXISTS tx_hash_eth TEXT,
  ADD COLUMN IF NOT EXISTS amount_eth NUMERIC(30, 18),
  ADD CONSTRAINT payouts_wallet_eth_format
    CHECK (wallet_eth IS NULL OR wallet_eth ~ '^0x[a-fA-F0-9]{40}$'),
  ADD CONSTRAINT payouts_tx_hash_eth_format
    CHECK (tx_hash_eth IS NULL OR tx_hash_eth ~ '^0x[a-fA-F0-9]{64}$');

-- payout_jobs table
ALTER TABLE payout_jobs
  ADD COLUMN IF NOT EXISTS wallet_eth TEXT,
  ADD CONSTRAINT payout_jobs_wallet_eth_format
    CHECK (wallet_eth IS NULL OR wallet_eth ~ '^0x[a-fA-F0-9]{40}$');

-- wallet_links table
ALTER TABLE wallet_links
  ADD COLUMN IF NOT EXISTS wallet_eth TEXT,
  ADD CONSTRAINT wallet_links_wallet_eth_format
    CHECK (wallet_eth IS NULL OR wallet_eth ~ '^0x[a-fA-F0-9]{40}$');

-- treasury_snapshots table (if it exists)
ALTER TABLE treasury_snapshots
  ADD COLUMN IF NOT EXISTS wallet_eth TEXT,
  ADD COLUMN IF NOT EXISTS eth_balance NUMERIC(30, 18),
  ADD CONSTRAINT treasury_snapshots_wallet_eth_format
    CHECK (wallet_eth IS NULL OR wallet_eth ~ '^0x[a-fA-F0-9]{40}$');

-- admin_users table
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS wallet_eth TEXT,
  ADD CONSTRAINT admin_users_wallet_eth_format
    CHECK (wallet_eth IS NULL OR wallet_eth ~ '^0x[a-fA-F0-9]{40}$');

COMMENT ON COLUMN claims.wallet_eth IS 'Ethereum wallet address (0x + 40 hex). Replaces wallet after full migration.';
COMMENT ON COLUMN payouts.amount_eth IS 'Payout amount in ETH (18 decimal precision).';
