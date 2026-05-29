alter table public.transfer_item
  add column if not exists eta date,
  add column if not exists gate_in_ref text,
  add column if not exists return_depot_name text,
  add column if not exists return_depot_address text,
  add column if not exists return_depot_tel text,
  add column if not exists arrange_date date,
  add column if not exists customer_order_num text,
  add column if not exists remark2 text;

notify pgrst, 'reload schema';
