create table if not exists public.lessees (
  id uuid primary key default gen_random_uuid(),
  lessee_code text not null,
  legal_company_name text not null,
  company_name text,
  address text not null,
  region_id uuid references public.region_codes(id),
  country text not null,
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
  constraint lessees_lessee_code_key unique (lessee_code),
  constraint lessees_legal_company_name_key unique (legal_company_name),
  constraint lessees_lessee_code_format_check check (
    lessee_code ~ '^B[A-Z0-9]{5}$'
  ),
  constraint lessees_status_check check (
    status = any (array['Normal'::text, 'Blocked'::text, 'Deleted'::text])
  ),
  constraint lessees_settlement_balance_trigger_event_check check (
    settlement_balance_trigger_event is null
    or settlement_balance_trigger_event = any (
      array['Before Release'::text, 'After Gate out'::text, 'On Invoice'::text]
    )
  ),
  constraint lessees_settlement_credit_days_check check (
    settlement_credit_days is null or settlement_credit_days >= 0
  ),
  constraint lessees_settlement_advance_payment_percentage_check check (
    settlement_advance_payment_percentage is null
    or (
      settlement_advance_payment_percentage >= 0
      and settlement_advance_payment_percentage <= 100
    )
  ),
  constraint lessees_settlement_prepayment_threshold_check check (
    settlement_prepayment_threshold is null or settlement_prepayment_threshold >= 0
  ),
  constraint lessees_settlement_current_prepaid_balance_check check (
    settlement_current_prepaid_balance is null or settlement_current_prepaid_balance >= 0
  )
);

create index if not exists idx_lessees_lessee_code
  on public.lessees(lessee_code);

create index if not exists idx_lessees_legal_company_name
  on public.lessees(legal_company_name);

create index if not exists idx_lessees_company_name
  on public.lessees(company_name);

create index if not exists idx_lessees_region_id
  on public.lessees(region_id);

create index if not exists idx_lessees_pic_user_id
  on public.lessees(pic_user_id);

drop trigger if exists trg_lessees_updated_at on public.lessees;
create trigger trg_lessees_updated_at
before update on public.lessees
for each row execute function public.set_updated_at();

grant select, insert, update on table public.lessees to anon;
grant all on table public.lessees to authenticated;
grant all on table public.lessees to service_role;

alter table public.lessees enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lessees'
      and policyname = 'lessees_public_select'
  ) then
    create policy "lessees_public_select"
      on public.lessees
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lessees'
      and policyname = 'lessees_public_insert'
  ) then
    create policy "lessees_public_insert"
      on public.lessees
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lessees'
      and policyname = 'lessees_public_update'
  ) then
    create policy "lessees_public_update"
      on public.lessees
      for update
      to public
      using (true)
      with check (true);
  end if;
end
$$;

create table if not exists public.lessee_attachment_links (
  id uuid primary key default gen_random_uuid(),
  lessee_id uuid not null references public.lessees(id) on delete cascade,
  url text not null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lessee_attachment_links_url_check check (url <> '')
);

create index if not exists idx_lessee_attachment_links_lessee_id
  on public.lessee_attachment_links(lessee_id);

drop trigger if exists trg_lessee_attachment_links_updated_at on public.lessee_attachment_links;
create trigger trg_lessee_attachment_links_updated_at
before update on public.lessee_attachment_links
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.lessee_attachment_links to anon;
grant all on table public.lessee_attachment_links to authenticated;
grant all on table public.lessee_attachment_links to service_role;

alter table public.lessee_attachment_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lessee_attachment_links'
      and policyname = 'lessee_attachment_links_public_select'
  ) then
    create policy "lessee_attachment_links_public_select"
      on public.lessee_attachment_links
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lessee_attachment_links'
      and policyname = 'lessee_attachment_links_public_insert'
  ) then
    create policy "lessee_attachment_links_public_insert"
      on public.lessee_attachment_links
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lessee_attachment_links'
      and policyname = 'lessee_attachment_links_public_update'
  ) then
    create policy "lessee_attachment_links_public_update"
      on public.lessee_attachment_links
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lessee_attachment_links'
      and policyname = 'lessee_attachment_links_public_delete'
  ) then
    create policy "lessee_attachment_links_public_delete"
      on public.lessee_attachment_links
      for delete
      to public
      using (true);
  end if;
end
$$;

notify pgrst, 'reload schema';
