create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() not null,
  business_type text not null,
  business_id uuid,
  entity_table text not null,
  entity_id uuid not null,
  action text not null,
  reason text,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  performed_by uuid,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_pkey'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_performed_by_fkey'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_performed_by_fkey
      foreign key (performed_by) references public.users(id);
  end if;
end $$;

create index if not exists idx_audit_logs_business
  on public.audit_logs (business_type, business_id);

create index if not exists idx_audit_logs_entity
  on public.audit_logs (entity_table, entity_id);

create index if not exists idx_audit_logs_created_at_desc
  on public.audit_logs (created_at desc);

grant select, insert on table public.audit_logs to anon;
grant all on table public.audit_logs to authenticated;
grant all on table public.audit_logs to service_role;

alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_public_select'
  ) then
    create policy audit_logs_public_select
      on public.audit_logs
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_public_insert'
  ) then
    create policy audit_logs_public_insert
      on public.audit_logs
      for insert
      to public
      with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
