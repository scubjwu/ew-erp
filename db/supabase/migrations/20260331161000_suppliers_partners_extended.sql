alter table public.suppliers
  add column if not exists region_id uuid references public.region_codes(id),
  add column if not exists country text,
  add column if not exists category text,
  add column if not exists account_name text,
  add column if not exists account_number text,
  add column if not exists bank_name text,
  add column if not exists bank_code text,
  add column if not exists bank_address text,
  add column if not exists swift_code text;

create index if not exists idx_suppliers_region_id
  on public.suppliers(region_id);
