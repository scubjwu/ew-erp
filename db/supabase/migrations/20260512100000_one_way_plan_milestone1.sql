create sequence if not exists public.one_way_plan_number_seq;

create table if not exists public.one_way_plan (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null unique,
  offer_id text,
  status text not null default 'SUBMITTED',
  status_date date,
  apply_date date,
  availability_date date,
  arranged_dispatch_date date,
  lessee_id uuid not null references public.lessees(id),
  depot_id uuid not null references public.depots(id),
  pol_city_id uuid not null references public.cities(id),
  pod_codes_raw text not null,
  size_code_id uuid not null references public.container_size_codes(id),
  type_code_id uuid not null references public.container_type_codes(id),
  condition_code_id uuid not null references public.container_condition_codes(id),
  color_code text references public.ral_color_codes(color_code),
  planned_qty integer not null default 0,
  authorized_qty integer not null default 0,
  remaining_qty integer not null default 0,
  picked_up_qty integer not null default 0,
  non_picked_up_qty integer not null default 0,
  pickup_charge numeric(12,2) not null default 0,
  free_days integer not null default 0,
  per_diem numeric(12,4) not null default 0,
  dpp numeric(12,2) not null default 0,
  shipper_request_id text,
  onhire_no text,
  remarks text,
  source_file_name text,
  source_sheet_name text,
  source_row_number integer,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_status_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_status_check
      check (
        status = any (
          array[
            'SUBMITTED'::text,
            'APPROVED'::text,
            'REJECTED'::text,
            'HOLD'::text,
            'COMPLETED'::text,
            'CANCELLED'::text
          ]
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_pod_codes_raw_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_pod_codes_raw_check
      check (btrim(pod_codes_raw) <> '');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_planned_qty_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_planned_qty_check
      check (planned_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_authorized_qty_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_authorized_qty_check
      check (authorized_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_remaining_qty_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_remaining_qty_check
      check (remaining_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_picked_up_qty_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_picked_up_qty_check
      check (picked_up_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_non_picked_up_qty_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_non_picked_up_qty_check
      check (non_picked_up_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_pickup_charge_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_pickup_charge_check
      check (pickup_charge >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_free_days_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_free_days_check
      check (free_days >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_per_diem_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_per_diem_check
      check (per_diem >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_way_plan_dpp_check'
      and conrelid = 'public.one_way_plan'::regclass
  ) then
    alter table public.one_way_plan
      add constraint one_way_plan_dpp_check
      check (dpp >= 0);
  end if;
end $$;

create or replace function public.assign_one_way_plan_id()
returns trigger
language plpgsql
as $$
begin
  if new.plan_id is null or btrim(new.plan_id) = '' then
    new.plan_id := 'DP' || lpad(nextval('public.one_way_plan_number_seq')::text, 8, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_one_way_plan_assign_plan_id on public.one_way_plan;
create trigger trg_one_way_plan_assign_plan_id
before insert on public.one_way_plan
for each row
execute function public.assign_one_way_plan_id();

alter table public.transfer_order
  add column if not exists one_way_plan_id uuid references public.one_way_plan(id);

create index if not exists idx_one_way_plan_offer_id
  on public.one_way_plan (offer_id);

create index if not exists idx_one_way_plan_status
  on public.one_way_plan (status);

create index if not exists idx_one_way_plan_lessee_id
  on public.one_way_plan (lessee_id);

create index if not exists idx_one_way_plan_depot_id
  on public.one_way_plan (depot_id);

create index if not exists idx_one_way_plan_pol_city_id
  on public.one_way_plan (pol_city_id);

create index if not exists idx_one_way_plan_equipment
  on public.one_way_plan (size_code_id, type_code_id, condition_code_id, color_code);

create index if not exists idx_one_way_plan_matching
  on public.one_way_plan (
    pol_city_id,
    depot_id,
    size_code_id,
    type_code_id,
    condition_code_id,
    color_code
  );

create index if not exists idx_transfer_order_one_way_plan_id
  on public.transfer_order (one_way_plan_id);

grant select, insert, update, delete on table public.one_way_plan to anon;
grant all on table public.one_way_plan to authenticated;
grant all on table public.one_way_plan to service_role;

alter table public.one_way_plan enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'one_way_plan'
      and policyname = 'one_way_plan_public_select'
  ) then
    create policy "one_way_plan_public_select"
      on public.one_way_plan
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'one_way_plan'
      and policyname = 'one_way_plan_public_insert'
  ) then
    create policy "one_way_plan_public_insert"
      on public.one_way_plan
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'one_way_plan'
      and policyname = 'one_way_plan_public_update'
  ) then
    create policy "one_way_plan_public_update"
      on public.one_way_plan
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'one_way_plan'
      and policyname = 'one_way_plan_public_delete'
  ) then
    create policy "one_way_plan_public_delete"
      on public.one_way_plan
      for delete
      to public
      using (true);
  end if;
end $$;

drop trigger if exists trg_one_way_plan_updated_at on public.one_way_plan;
create trigger trg_one_way_plan_updated_at
before update on public.one_way_plan
for each row
execute function public.set_updated_at();
