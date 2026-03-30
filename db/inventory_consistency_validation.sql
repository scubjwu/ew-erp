-- Validation script for 20260330000100_inventory_consistency_fix.sql
-- Run against a disposable / staging database.
-- Each block is designed to be executed manually and inspected.

-- 0. Pre-flight
select proname
from pg_proc
where proname in (
  'rpc_rebuild_container_side_effects',
  'rpc_rebuild_container_snapshot',
  'rpc_transfer_cancel_item',
  'rpc_transfer_out',
  'rpc_transfer_in',
  'rpc_lease_onhire',
  'rpc_lease_offhire',
  'rpc_sale_contract',
  'rpc_sale_deliver',
  'rpc_sale_fail',
  'rpc_void_container_event'
)
order by proname;

-- 1. Yard: enter -> exit, and invalid exit
-- Expected:
-- - valid enter creates one active yard_record
-- - valid exit closes it
-- - second exit on same depot must raise exception

-- 2. Transfer: out -> in -> complete
-- Expected:
-- - transfer_out requires active yard_record and IN_YARD snapshot
-- - transfer_in requires transfer_item already IN_TRANSIT
-- - complete only succeeds when order has at least one item and all items are ARRIVED/CANCELLED

-- 3. Transfer cancel rollback
-- Expected:
-- - after TRANSFER_OUT, cancel writes TRANSFER_CANCELLED
-- - container returns to IN_YARD at from_depot
-- - exactly one active yard_record exists

-- 4. Lease onhire / offhire
-- Expected:
-- - onhire closes active yard_record and clears current_depot_id
-- - offhire inserts active yard_record and clears current_customer_id

-- 5. Sale contract / deliver / fail
-- Expected:
-- - contract does not change lifecycle/status
-- - deliver closes active yard_record if one exists and sets SOLD/SOLD
-- - fail is rejected if SALE_DELIVERED exists
-- - fail annotates SALE_CONTRACTED.extra_data with sale_failed_at/sale_failed_reason

-- 6. Void / rebuild
-- Expected:
-- - void TRANSFER_OUT restores transfer_item away from IN_TRANSIT and rebuilds yard state
-- - void LEASE_OFFHIRE removes rebuilt active yard_record and restores lease_item ONHIRE
-- - void SALE_DELIVERED restores non-SOLD snapshot and sales_item CONTRACTED/FAILED depending on annotation

-- 7. Global consistency checks
-- Expected: zero rows returned for all checks below.

-- At most one active yard row per container
select container_id, count(*) as active_rows
from public.yard_record
where record_status = 'IN_YARD'
group by container_id
having count(*) > 1;

-- IN_YARD snapshot must have active yard row
select c.id, c.container_number
from public.container c
left join public.yard_record yr
  on yr.container_id = c.id
 and yr.record_status = 'IN_YARD'
where c.lifecycle_stage = 'IN_YARD'
group by c.id, c.container_number
having count(yr.id) <> 1;

-- LEASE snapshot must not have active yard row
select c.id, c.container_number
from public.container c
join public.yard_record yr
  on yr.container_id = c.id
 and yr.record_status = 'IN_YARD'
where c.lifecycle_stage = 'LEASE';

-- SOLD snapshot must not have active yard row
select c.id, c.container_number
from public.container c
join public.yard_record yr
  on yr.container_id = c.id
 and yr.record_status = 'IN_YARD'
where c.lifecycle_stage = 'SOLD';

-- current_depot_id should match active yard row for IN_YARD containers
select c.id, c.container_number, c.current_depot_id, yr.depot_id as active_depot_id
from public.container c
join public.yard_record yr
  on yr.container_id = c.id
 and yr.record_status = 'IN_YARD'
where c.lifecycle_stage = 'IN_YARD'
  and c.current_depot_id is distinct from yr.depot_id;
