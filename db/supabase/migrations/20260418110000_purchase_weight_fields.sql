alter table if exists public.purchase_order_item
  add column if not exists tare_weight numeric(12,2),
  add column if not exists maximum_weight numeric(12,2),
  add column if not exists csc_number text;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_order_item'
      and column_name = 'payload_weight'
  ) then
    alter table public.purchase_order_item
      add column payload_weight numeric(12,2)
      generated always as (
        case
          when tare_weight is null or maximum_weight is null then null
          else maximum_weight - tare_weight
        end
      ) stored;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_item_weight_nonnegative_check'
      and conrelid = 'public.purchase_order_item'::regclass
  ) then
    alter table public.purchase_order_item
      add constraint purchase_order_item_weight_nonnegative_check
      check (
        tare_weight is null
        or maximum_weight is null
        or maximum_weight >= tare_weight
      );
  end if;
end
$$;

alter table if exists public.purchase_order_container
  add column if not exists tare_weight numeric(12,2),
  add column if not exists maximum_weight numeric(12,2),
  add column if not exists csc_number text;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_order_container'
      and column_name = 'payload_weight'
  ) then
    alter table public.purchase_order_container
      add column payload_weight numeric(12,2)
      generated always as (
        case
          when tare_weight is null or maximum_weight is null then null
          else maximum_weight - tare_weight
        end
      ) stored;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_container_weight_nonnegative_check'
      and conrelid = 'public.purchase_order_container'::regclass
  ) then
    alter table public.purchase_order_container
      add constraint purchase_order_container_weight_nonnegative_check
      check (
        tare_weight is null
        or maximum_weight is null
        or maximum_weight >= tare_weight
      );
  end if;
end
$$;
