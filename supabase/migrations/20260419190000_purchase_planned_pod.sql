alter table public.purchase_order
  add column if not exists planned_pod text;

alter table public.purchase_order_item
  add column if not exists planned_pod text;

alter table public.purchase_order_container
  add column if not exists planned_pod text;
