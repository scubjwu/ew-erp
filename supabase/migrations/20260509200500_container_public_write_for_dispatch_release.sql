grant select, insert, update, delete on table public.container to anon;
grant all on table public.container to authenticated;
grant all on table public.container to service_role;

alter table public.container enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container'
      and policyname = 'container_public_select'
  ) then
    create policy "container_public_select"
      on public.container
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container'
      and policyname = 'container_public_insert'
  ) then
    create policy "container_public_insert"
      on public.container
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container'
      and policyname = 'container_public_update'
  ) then
    create policy "container_public_update"
      on public.container
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'container'
      and policyname = 'container_public_delete'
  ) then
    create policy "container_public_delete"
      on public.container
      for delete
      to public
      using (true);
  end if;
end $$;
