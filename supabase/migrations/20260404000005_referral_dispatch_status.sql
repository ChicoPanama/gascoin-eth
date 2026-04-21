-- Add ready_for_dispatch to referral_conversions status check
-- Drop and recreate the constraint to include new status
ALTER TABLE referral_conversions DROP CONSTRAINT IF EXISTS referral_conversions_reward_status_check;
ALTER TABLE referral_conversions ADD CONSTRAINT referral_conversions_reward_status_check
  CHECK (reward_status IN ('pending', 'ready_for_dispatch', 'dispatched', 'failed', 'skipped'));
