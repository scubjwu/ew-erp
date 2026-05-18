create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text not null,
  legal_company_name text not null,
  company_name text,
  address text not null,
  region_id uuid not null references public.region_codes(id),
  country text not null,
  primary_contact_person text,
  contact_email text,
  contact_tel text,
  category text,
  assigned_buyer_id uuid not null references public.users(id),
  bank_account_name text,
  bank_account_number text,
  bank_name text,
  bank_code text,
  bank_address text,
  swift_code text,
  settlement_payment_term text,
  settlement_credit_days integer,
  settlement_advance_payment_percentage numeric(5,2),
  settlement_balance_trigger_event text,
  settlement_currency text,
  settlement_prepayment_pool boolean,
  settlement_prepayment_threshold numeric(12,2),
  settlement_current_prepaid_balance numeric(14,2),
  remark text,
  status text not null default 'Normal',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vendors_vendor_code_key unique (vendor_code),
  constraint vendors_legal_company_name_key unique (legal_company_name),
  constraint vendors_vendor_code_format_check check (vendor_code ~ '^S[A-Z0-9]{5}$'),
  constraint vendors_status_check check (
    status = any (array['Normal'::text, 'Blocked'::text, 'Deleted'::text])
  ),
  constraint vendors_category_check check (
    category is null
    or category = any (array['Container'::text])
  ),
  constraint vendors_settlement_balance_trigger_event_check check (
    settlement_balance_trigger_event is null
    or settlement_balance_trigger_event = any (
      array['Before Release'::text, 'After Gate out'::text, 'On Invoice'::text]
    )
  ),
  constraint vendors_settlement_credit_days_check check (
    settlement_credit_days is null or settlement_credit_days >= 0
  ),
  constraint vendors_settlement_advance_payment_percentage_check check (
    settlement_advance_payment_percentage is null
    or (
      settlement_advance_payment_percentage >= 0
      and settlement_advance_payment_percentage <= 100
    )
  ),
  constraint vendors_settlement_prepayment_threshold_check check (
    settlement_prepayment_threshold is null or settlement_prepayment_threshold >= 0
  ),
  constraint vendors_settlement_current_prepaid_balance_check check (
    settlement_current_prepaid_balance is null or settlement_current_prepaid_balance >= 0
  )
);

create index if not exists idx_vendors_region_id
  on public.vendors(region_id);

create index if not exists idx_vendors_assigned_buyer_id
  on public.vendors(assigned_buyer_id);

create index if not exists idx_vendors_vendor_code
  on public.vendors(vendor_code);

create index if not exists idx_vendors_legal_company_name
  on public.vendors(legal_company_name);

create index if not exists idx_vendors_company_name
  on public.vendors(company_name);

drop trigger if exists trg_vendors_updated_at on public.vendors;
create trigger trg_vendors_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

grant select, insert, update on table public.vendors to anon;
grant all on table public.vendors to authenticated;
grant all on table public.vendors to service_role;

alter table public.vendors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vendors'
      and policyname = 'vendors_public_select'
  ) then
    create policy "vendors_public_select"
      on public.vendors
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vendors'
      and policyname = 'vendors_public_insert'
  ) then
    create policy "vendors_public_insert"
      on public.vendors
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vendors'
      and policyname = 'vendors_public_update'
  ) then
    create policy "vendors_public_update"
      on public.vendors
      for update
      to public
      using (true)
      with check (true);
  end if;
end
$$;

create table if not exists public.vendor_attachment_links (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  url text not null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vendor_attachment_links_url_check check (url <> '')
);

create index if not exists idx_vendor_attachment_links_vendor_id
  on public.vendor_attachment_links(vendor_id);

drop trigger if exists trg_vendor_attachment_links_updated_at on public.vendor_attachment_links;
create trigger trg_vendor_attachment_links_updated_at
before update on public.vendor_attachment_links
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.vendor_attachment_links to anon;
grant all on table public.vendor_attachment_links to authenticated;
grant all on table public.vendor_attachment_links to service_role;

alter table public.vendor_attachment_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_attachment_links'
      and policyname = 'vendor_attachment_links_public_select'
  ) then
    create policy "vendor_attachment_links_public_select"
      on public.vendor_attachment_links
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_attachment_links'
      and policyname = 'vendor_attachment_links_public_insert'
  ) then
    create policy "vendor_attachment_links_public_insert"
      on public.vendor_attachment_links
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_attachment_links'
      and policyname = 'vendor_attachment_links_public_update'
  ) then
    create policy "vendor_attachment_links_public_update"
      on public.vendor_attachment_links
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_attachment_links'
      and policyname = 'vendor_attachment_links_public_delete'
  ) then
    create policy "vendor_attachment_links_public_delete"
      on public.vendor_attachment_links
      for delete
      to public
      using (true);
  end if;
end
$$;

notify pgrst, 'reload schema';
