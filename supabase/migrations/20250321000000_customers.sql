-- Reference schema aligned with app types (adjust to match your live DB).
-- Your production DDL may differ slightly; the app expects these column names.

create table if not exists public.customers (
  id uuid not null default gen_random_uuid() primary key,
  company_name text not null unique,
  customer_grade text default 'C',
  assigned_sales text,
  status text not null default 'Normal',
  contact_phone text,
  finance_emails text[] default '{}',
  ops_emails text[] default '{}',
  purchasing_emails text[] default '{}',
  credit_limit decimal(12, 2) not null default 0.00,
  credit_term_days integer not null default 3,
  depot_info jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.customers enable row level security;

create policy "customers_select_all" on public.customers for select using (true);
create policy "customers_insert_all" on public.customers for insert with check (true);
create policy "customers_update_all" on public.customers for update using (true);
create policy "customers_delete_all" on public.customers for delete using (true);
