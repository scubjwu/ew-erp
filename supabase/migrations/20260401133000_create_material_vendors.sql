create table if not exists public.material_vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text not null,
  legal_company_name text not null,
  company_name text,
  address text not null,
  country text not null,
  primary_contact_person text,
  material_category text not null,
  contact_email text,
  contact_tel text,
  pic_user_id uuid references public.users(id),
  is_default_vendor boolean not null default false,
  bank_account_name text,
  bank_account_number text,
  bank_name text,
  bank_code text,
  bank_address text,
  swift_code text,
  settlement_payment_term text,
  settlement_calculation_method text,
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
  constraint material_vendors_vendor_code_key unique (vendor_code),
  constraint material_vendors_legal_company_name_key unique (legal_company_name),
  constraint material_vendors_vendor_code_format_check check (
    vendor_code ~ '^[A-Z]{2}[0-9]{4}$'
  ),
  constraint material_vendors_status_check check (
    status = any (array['Normal'::text, 'Blocked'::text, 'Deleted'::text])
  ),
  constraint material_vendors_material_category_check check (
    material_category = any (
      array[
        '油漆'::text,
        '密封胶'::text,
        '胶条'::text,
        '地板'::text,
        '贴标'::text,
        '角件'::text,
        '锁杆'::text,
        '底漆'::text
      ]
    )
  ),
  constraint material_vendors_settlement_balance_trigger_event_check check (
    settlement_balance_trigger_event is null
    or settlement_balance_trigger_event = any (
      array['Before Release'::text, 'After Gate out'::text, 'On Invoice'::text]
    )
  ),
  constraint material_vendors_settlement_credit_days_check check (
    settlement_credit_days is null or settlement_credit_days >= 0
  ),
  constraint material_vendors_settlement_advance_payment_percentage_check check (
    settlement_advance_payment_percentage is null
    or (
      settlement_advance_payment_percentage >= 0
      and settlement_advance_payment_percentage <= 100
    )
  ),
  constraint material_vendors_settlement_prepayment_threshold_check check (
    settlement_prepayment_threshold is null or settlement_prepayment_threshold >= 0
  ),
  constraint material_vendors_settlement_current_prepaid_balance_check check (
    settlement_current_prepaid_balance is null or settlement_current_prepaid_balance >= 0
  )
);

create unique index if not exists uq_material_vendors_default_per_category
  on public.material_vendors(material_category)
  where is_default_vendor = true and status <> 'Deleted';

create index if not exists idx_material_vendors_vendor_code
  on public.material_vendors(vendor_code);

create index if not exists idx_material_vendors_legal_company_name
  on public.material_vendors(legal_company_name);

create index if not exists idx_material_vendors_company_name
  on public.material_vendors(company_name);

create index if not exists idx_material_vendors_material_category
  on public.material_vendors(material_category);

create index if not exists idx_material_vendors_is_default_vendor
  on public.material_vendors(is_default_vendor);

create index if not exists idx_material_vendors_pic_user_id
  on public.material_vendors(pic_user_id);

drop trigger if exists trg_material_vendors_updated_at on public.material_vendors;
create trigger trg_material_vendors_updated_at
before update on public.material_vendors
for each row execute function public.set_updated_at();

grant select, insert, update on table public.material_vendors to anon;
grant all on table public.material_vendors to authenticated;
grant all on table public.material_vendors to service_role;

alter table public.material_vendors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_vendors'
      and policyname = 'material_vendors_public_select'
  ) then
    create policy "material_vendors_public_select"
      on public.material_vendors
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_vendors'
      and policyname = 'material_vendors_public_insert'
  ) then
    create policy "material_vendors_public_insert"
      on public.material_vendors
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_vendors'
      and policyname = 'material_vendors_public_update'
  ) then
    create policy "material_vendors_public_update"
      on public.material_vendors
      for update
      to public
      using (true)
      with check (true);
  end if;
end
$$;

create table if not exists public.material_vendor_attachment_links (
  id uuid primary key default gen_random_uuid(),
  material_vendor_id uuid not null references public.material_vendors(id) on delete cascade,
  url text not null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint material_vendor_attachment_links_url_check check (url <> '')
);

create index if not exists idx_material_vendor_attachment_links_material_vendor_id
  on public.material_vendor_attachment_links(material_vendor_id);

drop trigger if exists trg_material_vendor_attachment_links_updated_at on public.material_vendor_attachment_links;
create trigger trg_material_vendor_attachment_links_updated_at
before update on public.material_vendor_attachment_links
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.material_vendor_attachment_links to anon;
grant all on table public.material_vendor_attachment_links to authenticated;
grant all on table public.material_vendor_attachment_links to service_role;

alter table public.material_vendor_attachment_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_vendor_attachment_links'
      and policyname = 'material_vendor_attachment_links_public_select'
  ) then
    create policy "material_vendor_attachment_links_public_select"
      on public.material_vendor_attachment_links
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_vendor_attachment_links'
      and policyname = 'material_vendor_attachment_links_public_insert'
  ) then
    create policy "material_vendor_attachment_links_public_insert"
      on public.material_vendor_attachment_links
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_vendor_attachment_links'
      and policyname = 'material_vendor_attachment_links_public_update'
  ) then
    create policy "material_vendor_attachment_links_public_update"
      on public.material_vendor_attachment_links
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'material_vendor_attachment_links'
      and policyname = 'material_vendor_attachment_links_public_delete'
  ) then
    create policy "material_vendor_attachment_links_public_delete"
      on public.material_vendor_attachment_links
      for delete
      to public
      using (true);
  end if;
end
$$;

notify pgrst, 'reload schema';
