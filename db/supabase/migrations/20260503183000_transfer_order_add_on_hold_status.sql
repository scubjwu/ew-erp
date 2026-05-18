alter table public.transfer_order
  drop constraint if exists transfer_order_status_check;

alter table public.transfer_order
  add constraint transfer_order_status_check
  check (
    status = any (
      array[
        'CREATED'::text,
        'IN_TRANSIT'::text,
        'ON_HOLD'::text,
        'COMPLETED'::text,
        'CANCELLED'::text
      ]
    )
  ) not valid;

alter table public.transfer_order
  validate constraint transfer_order_status_check;
