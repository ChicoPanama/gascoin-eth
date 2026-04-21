-- Season 1 beta hardening: exclude DRYRUN payouts from the public leaderboard.
--
-- During Season 1 beta ENABLE_LIVE_PAYOUT is false, so the payout worker writes
-- payouts rows with tx_hash prefixed 'DRYRUN_' and status='paid' to preserve the
-- audit trail. Without this filter, beta testers appear on the public
-- leaderboard as having earned ETH they never actually received.
--
-- The filter is additive — real payouts (tx_hash starting with 0x) are
-- unaffected.

create or replace view leaderboard_view as
select
  p.wallet as wallet_address,
  count(*) as total_submissions,
  sum(p.amount_eth) as total_eth_earned,
  max(p.created_at) as last_submission_at,
  rank() over (order by sum(p.amount_eth) desc) as rank
from payouts p
where p.status = 'paid'
  and (p.tx_hash is null or p.tx_hash not like 'DRYRUN_%')
group by p.wallet
order by total_eth_earned desc;

create or replace view leaderboard_stats as
select
  count(distinct p.wallet) as total_earners,
  coalesce(sum(p.amount_eth), 0) as total_eth_paid,
  count(*) as total_approved,
  coalesce(max(p.amount_eth), 0) as largest_single_refund,
  coalesce(avg(p.amount_eth), 0) as avg_refund_amount
from payouts p
where p.status = 'paid'
  and (p.tx_hash is null or p.tx_hash not like 'DRYRUN_%');

grant select on leaderboard_view to anon, authenticated;
grant select on leaderboard_stats to anon, authenticated;
