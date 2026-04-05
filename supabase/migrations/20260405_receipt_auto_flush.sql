-- Auto-flush: delete receipt images older than 90 days from paid/rejected claims
-- Run as a scheduled Supabase function or via cron worker

-- View of receipt paths eligible for deletion
create or replace view receipts_to_flush as
select
  cr.id as receipt_id,
  cr.storage_path_private,
  cr.created_at as receipt_created,
  c.status as claim_status,
  c.id as claim_id
from claim_receipts cr
join claims c on c.id = cr.claim_id
where c.status in ('paid', 'rejected')
  and cr.created_at < now() - interval '90 days'
  and cr.storage_path_private is not null;

grant select on receipts_to_flush to authenticated;

-- Function to mark flushed receipts (nullify storage path after deletion)
create or replace function mark_receipts_flushed(receipt_ids uuid[])
returns integer as $$
declare
  updated integer;
begin
  update claim_receipts
  set storage_path_private = null
  where id = any(receipt_ids);
  get diagnostics updated = row_count;
  return updated;
end;
$$ language plpgsql;
