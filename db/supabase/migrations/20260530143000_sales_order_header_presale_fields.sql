alter table if exists public.sales_order
  add column if not exists payment_term_days integer not null default 0,
  add column if not exists sales_rep_id uuid,
  add column if not exists customer_depot_id uuid,
  add column if not exists customer_depot_name text,
  add column if not exists customer_depot_address text,
  add column if not exists customer_depot_tel text,
  add column if not exists financial_status text not null default 'UNPAID',
  add column if not exists ordered_qty integer not null default 0,
  add column if not exists deposit_amount numeric(18,2) not null default 0,
  add column if not exists deposit_percent numeric(7,4) not null default 0,
  add column if not exists deposit_invoice_id uuid,
  add column if not exists completed_at timestamptz;

alter table if exists public.sales_item
  add column if not exists compensation_amount numeric(18,2) not null default 0,
  add column if not exists compensation_currency text not null default 'USD';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_order_sales_rep_id_fkey'
      and conrelid = 'public.sales_order'::regclass
  ) then
    alter table public.sales_order
      add constraint sales_order_sales_rep_id_fkey
      foreign key (sales_rep_id) references public.users(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_order_customer_depot_id_fkey'
      and conrelid = 'public.sales_order'::regclass
  ) then
    alter table public.sales_order
      add constraint sales_order_customer_depot_id_fkey
      foreign key (customer_depot_id) references public.customer_depot(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_order_deposit_invoice_id_fkey'
      and conrelid = 'public.sales_order'::regclass
  ) then
    alter table public.sales_order
      add constraint sales_order_deposit_invoice_id_fkey
      foreign key (deposit_invoice_id) references public.business_invoice(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_order_financial_status_check'
      and conrelid = 'public.sales_order'::regclass
  ) then
    alter table public.sales_order
      add constraint sales_order_financial_status_check
      check (financial_status = any (array['UNPAID'::text, 'PARTIAL'::text, 'PAID'::text, 'CANCELLED'::text]));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_order_ordered_qty_check'
      and conrelid = 'public.sales_order'::regclass
  ) then
    alter table public.sales_order
      add constraint sales_order_ordered_qty_check
      check (ordered_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_order_deposit_amount_check'
      and conrelid = 'public.sales_order'::regclass
  ) then
    alter table public.sales_order
      add constraint sales_order_deposit_amount_check
      check (deposit_amount >= 0::numeric);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_order_deposit_percent_check'
      and conrelid = 'public.sales_order'::regclass
  ) then
    alter table public.sales_order
      add constraint sales_order_deposit_percent_check
      check (deposit_percent >= 0::numeric and deposit_percent <= 1::numeric);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_item_compensation_amount_check'
      and conrelid = 'public.sales_item'::regclass
  ) then
    alter table public.sales_item
      add constraint sales_item_compensation_amount_check
      check (compensation_amount >= 0::numeric);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_item_compensation_currency_check'
      and conrelid = 'public.sales_item'::regclass
  ) then
    alter table public.sales_item
      add constraint sales_item_compensation_currency_check
      check (compensation_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD'));
  end if;
end $$;

notify pgrst, 'reload schema';
