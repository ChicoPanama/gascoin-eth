-- Update wallet_points_view to include holdings_bonus and referral_passive sources
-- Added as part of the economy rebalance: holdings-dominant scoring,
-- passive referral income, and separate holdings tracking for composite score.

create or replace view wallet_points_view as
select
  wallet,
  coalesce(sum(points), 0) as total_points,
  coalesce(sum(points) filter (where source = 'tweet_engagement'), 0) as tweet_points,
  coalesce(sum(points) filter (where source = 'submission_approved'), 0) as submission_points,
  coalesce(sum(points) filter (where source = 'streak_bonus'), 0) as streak_points,
  coalesce(sum(points) filter (where source = 'referral_conversion'), 0) as referral_points,
  coalesce(sum(points) filter (where source = 'holdings_bonus'), 0) as holdings_points,
  coalesce(sum(points) filter (where source = 'referral_passive'), 0) as referral_passive_points,
  max(created_at) as last_earned_at
from engagement_points
group by wallet
order by total_points desc;
