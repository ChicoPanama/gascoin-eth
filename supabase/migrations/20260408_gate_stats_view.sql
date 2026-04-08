-- Gate stats view for GatesTeaser and gates page
-- Returns pass rates per gate from gate_results table
create or replace view gate_stats_view as
select
  g.gate as gate_id,
  count(*) as total,
  count(*) filter (where g.passed = true) as passed,
  round(
    count(*) filter (where g.passed = true)::numeric
    / nullif(count(*), 0) * 100,
    1
  ) as pass_rate_pct
from gate_results g
group by g.gate;

grant select on gate_stats_view to anon, authenticated;
