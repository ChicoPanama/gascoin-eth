-- Add discrete AI signal columns for queryable analysis
-- claim_receipts.cross_validation_risk: Grok cross-validation result level (low/medium/high)
-- claims.claude_confidence: Claude oversight confidence score (0.0–1.0)
-- claims.account_quality_score: Account quality score at time of submission

alter table claim_receipts
  add column if not exists cross_validation_risk text;

alter table claims
  add column if not exists claude_confidence numeric,
  add column if not exists account_quality_score integer;
