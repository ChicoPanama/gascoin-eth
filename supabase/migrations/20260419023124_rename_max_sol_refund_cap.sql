ALTER TABLE claims RENAME COLUMN max_sol_refund_cap TO max_eth_refund_cap;
-- Recreate submission_queue_view so its derived column matches
DROP VIEW IF EXISTS submission_queue_view CASCADE;
CREATE VIEW submission_queue_view WITH (security_invoker = true) AS
SELECT
  c.*,
  row_number() OVER (ORDER BY c.submitter_tier_id DESC, c.created_at ASC) AS queue_position
FROM claims c
WHERE c.status IN ('submitted', 'auto_review', 'needs_manual_review')
ORDER BY c.submitter_tier_id DESC, c.created_at ASC;
GRANT SELECT ON submission_queue_view TO anon, authenticated;
