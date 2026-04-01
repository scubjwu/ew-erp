alter table public.customers
  add column if not exists contact_person text,
  add column if not exists assigned_sales text;

grant select, insert, update on table public.customers to anon;
grant all on table public.customers to authenticated;
grant all on table public.customers to service_role;

alter table public.customers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_public_select'
  ) then
    create policy "customers_public_select"
      on public.customers
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_public_insert'
  ) then
    create policy "customers_public_insert"
      on public.customers
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_public_update'
  ) then
    create policy "customers_public_update"
      on public.customers
      for update
      to public
      using (true)
      with check (true);
  end if;
end
$$;
