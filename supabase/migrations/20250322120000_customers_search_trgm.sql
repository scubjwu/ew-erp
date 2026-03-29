-- Optional: speeds up ILIKE '%term%' on large customer tables (requires extension).
-- Run in Supabase SQL editor if you rely heavily on search. Build may take time on 100k+ rows.

create extension if not exists pg_trgm;

create index if not exists customers_company_name_trgm_idx
  on public.customers using gin (company_name gin_trgm_ops);

create index if not exists customers_status_trgm_idx
  on public.customers using gin (status gin_trgm_ops);

create index if not exists customers_assigned_sales_trgm_idx
  on public.customers using gin (assigned_sales gin_trgm_ops);

create index if not exists customers_contact_phone_trgm_idx
  on public.customers using gin (contact_phone gin_trgm_ops);

create index if not exists customers_customer_grade_trgm_idx
  on public.customers using gin (customer_grade gin_trgm_ops);
