alter table if exists public.purchase_order_item
  add column if not exists vendor_release_number text;
