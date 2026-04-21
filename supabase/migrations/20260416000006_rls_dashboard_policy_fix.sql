-- =============================================================
-- RLS: Fix 3 over-permissive dashboard-created policies
--
-- Root cause: 3 SELECT policies were created via the Supabase
-- dashboard (not captured in migrations) and granted public
-- read access to:
--   claim_receipts — ALL rows (storage_path_private, ocr_text,
--                    ai_score, tamper_score, metadata_json)
--   gate_results   — ALL rows (passed, score, reason_code)
--   claims         — approved/paid rows (wallet, nonce,
--                    risk_score, decision_reason, ip_country)
--
-- Additionally: Supabase default GRANT ALL ON ALL TABLES gave
-- anon/authenticated INSERT/UPDATE/DELETE on every table.
-- This is belt-and-suspenders revocation on the tables that
-- have absolutely no public write use case.
--
-- Audit refs: S17 (RLS runtime), D7 (anon role confirmation)
-- =============================================================

-- 1. Drop the three dangerous dashboard-only policies
DROP POLICY IF EXISTS "public_read_claim_receipts" ON public.claim_receipts;
DROP POLICY IF EXISTS "public_read_gate_results"   ON public.gate_results;
DROP POLICY IF EXISTS "public_read_paid_claims"    ON public.claims;

-- 2. Fully revoke anon/authenticated from tables with zero public use
REVOKE ALL ON public.claim_receipts FROM anon, authenticated;
REVOKE ALL ON public.gate_results   FROM anon, authenticated;

-- 3. Belt-and-suspenders on high-value targets
-- (RLS deny-all already blocks when no permissive policy exists,
-- but explicit REVOKE prevents a stray future policy from reopening)
REVOKE ALL ON public.admin_users FROM anon, authenticated;
REVOKE ALL ON public.payout_jobs FROM anon, authenticated;

-- 4. Restrict claims to safe columns for anon
-- The broad GRANT ALL was from Supabase defaults. Revoke it,
-- then re-grant only the three columns used by public_claims_feed.
-- Sensitive columns withheld: wallet, nonce, risk_score,
-- decision_reason, claimed_amount, parsed_amount, ip_country, referral_code
REVOKE ALL ON public.claims FROM anon, authenticated;
GRANT SELECT (id, tweet_url, status, created_at, user_id) ON public.claims TO anon;

-- 5. Safe row policy for anon on claims (replaces the dropped broad policy)
-- Row filter ensures only paid/approved claims are visible; column-level
-- grant above ensures sensitive fields cannot be selected even if rows pass.
CREATE POLICY "anon_read_safe_claims"
  ON public.claims
  FOR SELECT
  TO anon
  USING (status IN ('paid', 'approved'));

-- 6. Restrict users to safe columns for anon
-- public_claims_feed view needs id + x_handle only.
-- Withheld: x_user_id (Twitter ID), trust_score (internal scoring)
REVOKE ALL ON public.users FROM anon, authenticated;
GRANT SELECT (id, x_handle) ON public.users TO anon;

-- 7. Safe row policy for anon on users (needed for public_claims_feed JOIN)
CREATE POLICY "anon_read_user_handle"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- service_role has BYPASSRLS and retains its own GRANT ALL — not affected.
