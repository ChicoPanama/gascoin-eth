-- Leaderboard view: aggregates paid payouts per wallet
create or replace view leaderboard_view as
select
  p.wallet as wallet_address,
  count(*) as total_submissions,
  sum(p.amount_sol) as total_sol_earned,
  max(p.created_at) as last_submission_at,
  rank() over (order by sum(p.amount_sol) desc) as rank
from payouts p
where p.status = 'paid'
group by p.wallet
order by total_sol_earned desc;

-- Leaderboard stats summary view
create or replace view leaderboard_stats as
select
  count(distinct p.wallet) as total_earners,
  coalesce(sum(p.amount_sol), 0) as total_sol_paid,
  count(*) as total_approved,
  coalesce(max(p.amount_sol), 0) as largest_single_refund,
  coalesce(avg(p.amount_sol), 0) as avg_refund_amount
from payouts p
where p.status = 'paid';

-- Grant read access to anon and authenticated roles
grant select on leaderboard_view to anon, authenticated;
grant select on leaderboard_stats to anon, authenticated;
