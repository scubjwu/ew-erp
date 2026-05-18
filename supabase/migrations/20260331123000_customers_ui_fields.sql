alter table public.customers
  add column if not exists contact_person text,
  add column if not exists assigned_sales text;

