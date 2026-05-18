alter table public.depots
  drop constraint if exists depots_depot_type_check;

alter table public.depots
  add constraint depots_depot_type_check
  check (
    depot_type is null
    or depot_type = any (
      array[
        'CONTRACT'::text,
        'FACTORY_YARD'::text,
        'SHIPPING_LINES'::text,
        'TRADER'::text,
        'CONSIGNMENT'::text,
        'VENDOR'::text,
        'OTHER'::text
      ]
    )
  );

create or replace function public.ensure_default_vendor_depot_for_city(p_city_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_city record;
  v_target_code text;
  v_vendor_depot_id uuid;
  v_conflict_id uuid;
begin
  select
    c.id,
    upper(trim(c.city_code)) as city_code,
    c.country,
    c.region_id,
    c.region
  into v_city
  from public.cities c
  where c.id = p_city_id;

  if not found or v_city.city_code is null or v_city.city_code = '' then
    return null;
  end if;

  v_target_code := v_city.city_code || 'VDP';

  select d.id
  into v_vendor_depot_id
  from public.depots d
  where d.city_id = v_city.id
    and d.depot_type = 'VENDOR'
  order by d.created_at asc, d.id asc
  limit 1;

  if v_vendor_depot_id is null then
    select d.id
    into v_conflict_id
    from public.depots d
    where d.depot_code = v_target_code
    limit 1;

    if v_conflict_id is not null then
      raise exception 'Default vendor depot code % is already used by another depot.', v_target_code;
    end if;

    insert into public.depots (
      depot_code,
      depot_name,
      region,
      depot_type,
      depot_address,
      contact_person,
      contact_email,
      gate_email,
      depot_tel,
      country_code,
      country_name,
      status,
      is_primary_depot,
      city_id,
      region_id
    )
    values (
      v_target_code,
      'vendor depot',
      v_city.region,
      'VENDOR',
      'refer to release',
      'refer to release',
      'refer_to_release@na.na',
      'refer_to_release@na.na',
      'refer to release',
      left(v_city.city_code, 2),
      v_city.country,
      'NORMAL',
      false,
      v_city.id,
      v_city.region_id
    )
    returning id into v_vendor_depot_id;
  else
    select d.id
    into v_conflict_id
    from public.depots d
    where d.depot_code = v_target_code
      and d.id <> v_vendor_depot_id
    limit 1;

    if v_conflict_id is not null then
      raise exception 'Default vendor depot code % is already used by another depot.', v_target_code;
    end if;

    update public.depots
    set depot_code = v_target_code,
        depot_name = 'vendor depot',
        region = v_city.region,
        depot_type = 'VENDOR',
        depot_address = 'refer to release',
        contact_person = 'refer to release',
        contact_email = 'refer_to_release@na.na',
        gate_email = 'refer_to_release@na.na',
        depot_tel = 'refer to release',
        country_code = left(v_city.city_code, 2),
        country_name = v_city.country,
        status = 'NORMAL',
        is_primary_depot = false,
        city_id = v_city.id,
        region_id = v_city.region_id,
        updated_at = now()
    where id = v_vendor_depot_id;
  end if;

  return v_vendor_depot_id;
end;
$$;

create or replace function public.sync_default_vendor_depot_for_city()
returns trigger
language plpgsql
as $$
begin
  perform public.ensure_default_vendor_depot_for_city(new.id);
  return new;
end;
$$;

drop trigger if exists trg_cities_default_vendor_depot_insert on public.cities;
create trigger trg_cities_default_vendor_depot_insert
after insert on public.cities
for each row
execute function public.sync_default_vendor_depot_for_city();

drop trigger if exists trg_cities_default_vendor_depot_update on public.cities;
create trigger trg_cities_default_vendor_depot_update
after update of city_code, country, region_id, region on public.cities
for each row
execute function public.sync_default_vendor_depot_for_city();

do $$
declare
  v_city record;
begin
  for v_city in
    select id
    from public.cities
    order by city_code asc
  loop
    perform public.ensure_default_vendor_depot_for_city(v_city.id);
  end loop;
end $$;
