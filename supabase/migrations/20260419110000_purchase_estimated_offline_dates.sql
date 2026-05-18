alter table public.purchase_order_item
  add column if not exists estimated_offline_date date;

alter table public.purchase_order_container
  add column if not exists estimated_offline_date date;
