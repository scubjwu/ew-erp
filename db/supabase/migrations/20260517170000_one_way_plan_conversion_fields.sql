alter table public.one_way_plan
  add column if not exists conversion_status text not null default 'OPEN',
  add column if not exists carrier text,
  add column if not exists currency text,
  add column if not exists rv numeric(12,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_conversion_status_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_conversion_status_check
      check (conversion_status in ('OPEN', 'CONVERTED'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_rv_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_rv_check
      check (rv >= 0);
  end if;
end $$;

create index if not exists idx_one_way_plan_conversion_status
  on public.one_way_plan (conversion_status);

create index if not exists idx_one_way_plan_conversion_status_status
  on public.one_way_plan (conversion_status, status);
