alter table public.transfer_item
  add column if not exists delivery_date timestamp with time zone null;
