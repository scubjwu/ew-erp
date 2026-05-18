alter table public.customers
  add column if not exists company_name_other_language text,
  add column if not exists region_id uuid references public.region_codes(id);

create table if not exists public.customer_certificate_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  link_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_customer_certificate_links_customer_id
  on public.customer_certificate_links(customer_id);

drop trigger if exists trg_customer_certificate_links_updated_at on public.customer_certificate_links;
create trigger trg_customer_certificate_links_updated_at
before update on public.customer_certificate_links
for each row execute function extensions.moddatetime('updated_at');

grant select, insert, update, delete on table public.customer_certificate_links to anon;
grant all on table public.customer_certificate_links to authenticated;
grant all on table public.customer_certificate_links to service_role;

alter table public.customer_certificate_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_certificate_links'
      and policyname = 'customer_certificate_links_public_select'
  ) then
    create policy "customer_certificate_links_public_select"
      on public.customer_certificate_links
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_certificate_links'
      and policyname = 'customer_certificate_links_public_insert'
  ) then
    create policy "customer_certificate_links_public_insert"
      on public.customer_certificate_links
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_certificate_links'
      and policyname = 'customer_certificate_links_public_update'
  ) then
    create policy "customer_certificate_links_public_update"
      on public.customer_certificate_links
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_certificate_links'
      and policyname = 'customer_certificate_links_public_delete'
  ) then
    create policy "customer_certificate_links_public_delete"
      on public.customer_certificate_links
      for delete
      to public
      using (true);
  end if;
end
$$;
