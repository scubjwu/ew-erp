create table if not exists public.container_owners (
  id uuid primary key default gen_random_uuid(),
  container_owner_code text not null,
  legal_company_name text not null,
  company_name text,
  address text,
  region_id uuid references public.region_codes(id),
  country text,
  primary_contact_person text,
  contact_email text,
  contact_tel text,
  pic_user_id uuid references public.users(id),
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
  constraint container_owners_container_owner_code_key unique (container_owner_code),
  constraint container_owners_legal_company_name_key unique (legal_company_name),
  constraint container_owners_container_owner_code_format_check check (
    container_owner_code ~ '^O[A-Z0-9]{5}$'
  ),
  constraint container_owners_status_check check (
    status = any (array['Normal'::text, 'Blocked'::text, 'Deleted'::text])
  ),
  constraint container_owners_settlement_balance_trigger_event_check check (
    settlement_balance_trigger_event is null
    or settlement_balance_trigger_event = any (
      array['Before Release'::text, 'After Gate out'::text, 'On Invoice'::text]
    )
  ),
  constraint container_owners_settlement_credit_days_check check (
    settlement_credit_days is null or settlement_credit_days >= 0
  ),
  constraint container_owners_settlement_advance_payment_percentage_check check (
    settlement_advance_payment_percentage is null
    or (
      settlement_advance_payment_percentage >= 0
      and settlement_advance_payment_percentage <= 100
    )
  ),
  constraint container_owners_settlement_prepayment_threshold_check check (
    settlement_prepayment_threshold is null or settlement_prepayment_threshold >= 0
  ),
  constraint container_owners_settlement_current_prepaid_balance_check check (
    settlement_current_prepaid_balance is null or settlement_current_prepaid_balance >= 0
  )
);

create index if not exists idx_container_owners_container_owner_code
  on public.container_owners(container_owner_code);

create index if not exists idx_container_owners_legal_company_name
  on public.container_owners(legal_company_name);

create index if not exists idx_container_owners_company_name
  on public.container_owners(company_name);

create index if not exists idx_container_owners_region_id
  on public.container_owners(region_id);

create index if not exists idx_container_owners_pic_user_id
  on public.container_owners(pic_user_id);

drop trigger if exists trg_container_owners_updated_at on public.container_owners;
create trigger trg_container_owners_updated_at
before update on public.container_owners
for each row execute function public.set_updated_at();

grant select, insert, update on table public.container_owners to anon;
grant all on table public.container_owners to authenticated;
grant all on table public.container_owners to service_role;

alter table public.container_owners enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container_owners'
      and policyname = 'container_owners_public_select'
  ) then
    create policy "container_owners_public_select"
      on public.container_owners
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container_owners'
      and policyname = 'container_owners_public_insert'
  ) then
    create policy "container_owners_public_insert"
      on public.container_owners
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container_owners'
      and policyname = 'container_owners_public_update'
  ) then
    create policy "container_owners_public_update"
      on public.container_owners
      for update
      to public
      using (true)
      with check (true);
  end if;
end
$$;

create table if not exists public.container_owner_attachment_links (
  id uuid primary key default gen_random_uuid(),
  container_owner_id uuid not null references public.container_owners(id) on delete cascade,
  url text not null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint container_owner_attachment_links_url_check check (url <> '')
);

create index if not exists idx_container_owner_attachment_links_container_owner_id
  on public.container_owner_attachment_links(container_owner_id);

drop trigger if exists trg_container_owner_attachment_links_updated_at on public.container_owner_attachment_links;
create trigger trg_container_owner_attachment_links_updated_at
before update on public.container_owner_attachment_links
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.container_owner_attachment_links to anon;
grant all on table public.container_owner_attachment_links to authenticated;
grant all on table public.container_owner_attachment_links to service_role;

alter table public.container_owner_attachment_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container_owner_attachment_links'
      and policyname = 'container_owner_attachment_links_public_select'
  ) then
    create policy "container_owner_attachment_links_public_select"
      on public.container_owner_attachment_links
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container_owner_attachment_links'
      and policyname = 'container_owner_attachment_links_public_insert'
  ) then
    create policy "container_owner_attachment_links_public_insert"
      on public.container_owner_attachment_links
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container_owner_attachment_links'
      and policyname = 'container_owner_attachment_links_public_update'
  ) then
    create policy "container_owner_attachment_links_public_update"
      on public.container_owner_attachment_links
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container_owner_attachment_links'
      and policyname = 'container_owner_attachment_links_public_delete'
  ) then
    create policy "container_owner_attachment_links_public_delete"
      on public.container_owner_attachment_links
      for delete
      to public
      using (true);
  end if;
end
$$;

notify pgrst, 'reload schema';
