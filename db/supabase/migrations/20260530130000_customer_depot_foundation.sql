create table if not exists public.customer_depot (
  id uuid default gen_random_uuid() not null,
  customer_id uuid not null,
  city_code text not null,
  depot_name text not null,
  depot_address text,
  depot_contact_person text,
  depot_tel text,
  contact_email text,
  is_default boolean not null default false,
  status text not null default 'ACTIVE',
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_depot_pkey'
      and conrelid = 'public.customer_depot'::regclass
  ) then
    alter table public.customer_depot
      add constraint customer_depot_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_depot_customer_id_fkey'
      and conrelid = 'public.customer_depot'::regclass
  ) then
    alter table public.customer_depot
      add constraint customer_depot_customer_id_fkey
      foreign key (customer_id) references public.customers(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_depot_city_code_fkey'
      and conrelid = 'public.customer_depot'::regclass
  ) then
    alter table public.customer_depot
      add constraint customer_depot_city_code_fkey
      foreign key (city_code) references public.cities(city_code);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_depot_status_check'
      and conrelid = 'public.customer_depot'::regclass
  ) then
    alter table public.customer_depot
      add constraint customer_depot_status_check
      check (status = any (array['ACTIVE'::text, 'INACTIVE'::text]));
  end if;
end $$;

create unique index if not exists uq_customer_depot_customer_city_name
  on public.customer_depot (customer_id, city_code, depot_name);

create unique index if not exists uq_customer_depot_default_per_customer
  on public.customer_depot (customer_id)
  where is_default = true;

create index if not exists idx_customer_depot_customer_city
  on public.customer_depot (customer_id, city_code);

grant select, insert, update on table public.customer_depot to anon;
grant all on table public.customer_depot to authenticated;
grant all on table public.customer_depot to service_role;

alter table public.customer_depot enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_depot'
      and policyname = 'customer_depot_public_select'
  ) then
    create policy customer_depot_public_select
      on public.customer_depot
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_depot'
      and policyname = 'customer_depot_public_insert'
  ) then
    create policy customer_depot_public_insert
      on public.customer_depot
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_depot'
      and policyname = 'customer_depot_public_update'
  ) then
    create policy customer_depot_public_update
      on public.customer_depot
      for update
      to public
      using (true)
      with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
