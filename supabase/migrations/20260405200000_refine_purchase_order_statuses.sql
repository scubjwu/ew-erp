alter table public.purchase_order
  drop constraint if exists purchase_order_order_status_check;

alter table public.purchase_order
  add constraint purchase_order_order_status_check
  check (
    order_status = any (
      array[
        'DRAFT'::text,
        'SUBMITTED'::text,
        'IN_PRODUCTION'::text,
        'RELEASED'::text,
        'COMPLETED'::text,
        'CANCELLED'::text
      ]
    )
  );

create or replace function public.purchase_resolve_order_status(
  p_order_id uuid
)
returns text
language plpgsql
as $$
declare
  v_order public.purchase_order%rowtype;
  v_active_container_count integer := 0;
  v_numbered_container_count integer := 0;
  v_picked_up_container_count integer := 0;
  v_offlined_container_count integer := 0;
begin
  select *
    into v_order
    from public.purchase_order
    where id = p_order_id;

  if not found then
    raise exception 'Purchase order % not found', p_order_id;
  end if;

  if v_order.order_status = 'CANCELLED' then
    return 'CANCELLED';
  end if;

  select
    count(*) filter (where coalesce(container_status, '') <> 'CANCELLED'),
    count(*) filter (
      where coalesce(container_status, '') <> 'CANCELLED'
        and nullif(trim(coalesce(container_number, '')), '') is not null
    ),
    count(*) filter (
      where coalesce(container_status, '') <> 'CANCELLED'
        and container_status = 'PICKED_UP'
    ),
    count(*) filter (
      where coalesce(container_status, '') <> 'CANCELLED'
        and offline_date is not null
    )
  into
    v_active_container_count,
    v_numbered_container_count,
    v_picked_up_container_count,
    v_offlined_container_count
  from public.purchase_order_container
  where purchase_order_id = p_order_id;

  if v_order.purchase_type = 'FACTORY_ORDER' then
    if v_active_container_count > 0 and v_picked_up_container_count = v_active_container_count then
      return 'COMPLETED';
    end if;
    if v_offlined_container_count > 0 then
      return 'RELEASED';
    end if;
    if nullif(trim(coalesce(v_order.contract_number, '')), '') is not null then
      return 'IN_PRODUCTION';
    end if;
    return 'SUBMITTED';
  end if;

  if v_active_container_count > 0 and v_numbered_container_count = v_active_container_count then
    return 'COMPLETED';
  end if;
  if v_order.vendor_release_date is not null then
    return 'RELEASED';
  end if;
  return 'SUBMITTED';
end
$$;

create or replace function public.purchase_recalculate_order_status(
  p_order_id uuid
)
returns text
language plpgsql
as $$
declare
  v_next_status text;
begin
  select public.purchase_resolve_order_status(p_order_id)
    into v_next_status;

  update public.purchase_order
  set order_status = v_next_status
  where id = p_order_id;

  return v_next_status;
end
$$;

create or replace function public.purchase_submit_insert_containers(
  p_order_id uuid,
  p_containers jsonb
)
returns text
language plpgsql
as $$
declare
  v_order public.purchase_order%rowtype;
  v_row jsonb;
  v_rule public.container_number_rules%rowtype;
  v_next_serial integer;
  v_container_number text;
  v_container_status text;
  v_offline_date date;
  v_purchase_price numeric(14,2);
  v_result_status text;
begin
  select *
    into v_order
    from public.purchase_order
    where id = p_order_id
    for update;

  if not found then
    raise exception 'Purchase order % not found', p_order_id;
  end if;

  if p_containers is null or jsonb_typeof(p_containers) <> 'array' then
    raise exception 'Container payload must be a JSON array';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(p_containers)
  loop
    v_container_number := null;

    if v_order.purchase_type = 'FACTORY_ORDER' then
      select *
        into v_rule
        from public.container_number_rules
        where container_size_code_id = (v_row->>'container_size_code_id')::uuid
          and status = 'ACTIVE'
        for update;

      if not found then
        raise exception 'No active container number rule found for size code id %',
          v_row->>'container_size_code_id';
      end if;

      if length(trim(coalesce(v_rule.prefix, ''))) <> 4 then
        raise exception 'Container number rule prefix must be 4 characters for size rule %', v_rule.id;
      end if;

      if v_rule.current_serial < v_rule.start_serial or v_rule.current_serial > v_rule.end_serial then
        raise exception 'Container number rule % current serial % is outside range % - %',
          v_rule.id, v_rule.current_serial, v_rule.start_serial, v_rule.end_serial;
      end if;

      v_next_serial := v_rule.current_serial + 1;
      if v_next_serial > v_rule.end_serial then
        raise exception 'Container number rule for size code id % is exhausted',
          v_row->>'container_size_code_id';
      end if;

      v_container_number := public.purchase_generate_iso6346_container_number(v_rule.prefix, v_next_serial);

      update public.container_number_rules
      set current_serial = v_next_serial,
          example_container_number = case
            when v_next_serial + 1 <= end_serial
              then public.purchase_generate_iso6346_container_number(prefix, v_next_serial + 1)
            else null
          end
      where id = v_rule.id;
    else
      v_container_number := nullif(trim(coalesce(v_row->>'container_number', '')), '');
    end if;

    v_offline_date := case
      when v_order.purchase_type = 'FACTORY_ORDER'
        then nullif(v_row->>'offline_date', '')::date
      else v_order.vendor_release_date
    end;

    v_container_status := case
      when v_order.purchase_type = 'FACTORY_ORDER' then
        case
          when v_offline_date is null then 'PURCHASED'
          else 'IN_YARD'
        end
      else
        case
          when v_container_number is null then 'PURCHASED'
          else 'IN_YARD'
        end
    end;

    v_purchase_price := nullif(v_row->>'purchase_price', '')::numeric(14,2);

    insert into public.purchase_order_container (
      purchase_order_id,
      purchase_order_item_id,
      container_number,
      depot_id,
      item_status,
      container_type_code_id,
      container_condition_code_id,
      container_size_code_id,
      location_city_id,
      color,
      flp,
      lbx,
      locking_bars_count,
      vents_count,
      machine_type,
      yom,
      offline_date,
      purchase_price,
      financial_cost,
      container_status
    )
    values (
      p_order_id,
      (v_row->>'purchase_order_item_id')::uuid,
      v_container_number,
      (v_row->>'depot_id')::uuid,
      case
        when v_container_status = 'IN_YARD' then 'INBOUND'
        when v_container_status = 'PURCHASED' then 'BOX_NO_ASSIGNED'
        else 'PLANNED'
      end,
      (v_row->>'container_type_code_id')::uuid,
      (v_row->>'container_condition_code_id')::uuid,
      (v_row->>'container_size_code_id')::uuid,
      (v_row->>'location_city_id')::uuid,
      nullif(v_row->>'color', ''),
      coalesce((v_row->>'flp')::boolean, false),
      coalesce((v_row->>'lbx')::boolean, false),
      nullif(v_row->>'locking_bars_count', '')::integer,
      nullif(v_row->>'vents_count', '')::integer,
      nullif(v_row->>'machine_type', ''),
      nullif(v_row->>'yom', '')::integer,
      v_offline_date,
      coalesce(v_purchase_price, 0),
      0,
      v_container_status
    );
  end loop;

  select public.purchase_recalculate_order_status(p_order_id)
    into v_result_status;

  return v_result_status;
end
$$;

create or replace function public.purchase_partial_cancel_item_containers(
  p_order_id uuid,
  p_item_id uuid,
  p_cancel_qty integer
)
returns integer
language plpgsql
as $$
declare
  v_cancelled_count integer;
begin
  if p_cancel_qty is null or p_cancel_qty <= 0 then
    raise exception 'Cancel quantity must be greater than 0';
  end if;

  with candidate_rows as (
    select poc.id
    from public.purchase_order_container poc
    join public.purchase_order po on po.id = poc.purchase_order_id
    where poc.purchase_order_id = p_order_id
      and poc.purchase_order_item_id = p_item_id
      and coalesce(poc.container_status, '') <> 'CANCELLED'
      and po.order_status not in ('COMPLETED', 'CANCELLED')
    order by poc.created_at asc, poc.id asc
    limit p_cancel_qty
    for update
  ),
  updated_rows as (
    update public.purchase_order_container poc
    set container_status = 'CANCELLED',
        item_status = 'CANCELLED'
    from candidate_rows
    where poc.id = candidate_rows.id
    returning poc.id
  )
  select count(*)
  into v_cancelled_count
  from updated_rows;

  if v_cancelled_count <> p_cancel_qty then
    raise exception 'Cancel quantity % exceeds cancellable container count for item %', p_cancel_qty, p_item_id;
  end if;

  perform public.purchase_recalculate_order_status(p_order_id);

  return v_cancelled_count;
end
$$;

update public.purchase_order po
set order_status = case
  when po.order_status = 'CANCELLED' then 'CANCELLED'
  when po.order_status = 'DRAFT' then 'DRAFT'
  else public.purchase_resolve_order_status(po.id)
end;
