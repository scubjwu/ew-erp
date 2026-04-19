-- Normalize pre-refine legacy statuses into the set accepted by
-- 20260405200000_refine_purchase_order_statuses.sql.
update public.purchase_order
set order_status = case
  when order_status in ('CONFIRMED', 'CTR_NO_PENDING') then 'SUBMITTED'
  when order_status in ('PARTIAL_RECEIVED', 'PARTIAL_RELEASED') then 'RELEASED'
  when order_status is null then 'DRAFT'
  else order_status
end
where order_status in (
    'CONFIRMED',
    'CTR_NO_PENDING',
    'PARTIAL_RECEIVED',
    'PARTIAL_RELEASED'
  )
  or order_status is null;
