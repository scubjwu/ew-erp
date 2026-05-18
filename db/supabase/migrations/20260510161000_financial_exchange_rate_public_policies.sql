grant select, insert, update, delete on table public.financial_exchange_rate to anon;
grant all on table public.financial_exchange_rate to authenticated;
grant all on table public.financial_exchange_rate to service_role;

alter table public.financial_exchange_rate enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_exchange_rate'
      and policyname = 'financial_exchange_rate_public_select'
  ) then
    create policy "financial_exchange_rate_public_select"
      on public.financial_exchange_rate
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_exchange_rate'
      and policyname = 'financial_exchange_rate_public_insert'
  ) then
    create policy "financial_exchange_rate_public_insert"
      on public.financial_exchange_rate
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_exchange_rate'
      and policyname = 'financial_exchange_rate_public_update'
  ) then
    create policy "financial_exchange_rate_public_update"
      on public.financial_exchange_rate
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_exchange_rate'
      and policyname = 'financial_exchange_rate_public_delete'
  ) then
    create policy "financial_exchange_rate_public_delete"
      on public.financial_exchange_rate
      for delete
      to public
      using (true);
  end if;
end $$;
