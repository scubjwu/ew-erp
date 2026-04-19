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
  v_item_count integer := 0;
  v_released_item_count integer := 0;
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

  select
    count(*),
    count(*) filter (where offline_date is not null)
  into
    v_item_count,
    v_released_item_count
  from public.purchase_order_item
  where purchase_order_id = p_order_id;

  if v_order.purchase_type = 'FACTORY_ORDER' then
    if v_active_container_count > 0 and v_picked_up_container_count = v_active_container_count then
      return 'COMPLETED';
    end if;
    if v_active_container_count > 0 and v_offlined_container_count = v_active_container_count then
      return 'RELEASED';
    end if;
    if v_offlined_container_count > 0 then
      return 'PARTIAL_RELEASED';
    end if;
    if nullif(trim(coalesce(v_order.contract_number, '')), '') is not null then
      return 'IN_PRODUCTION';
    end if;
    return 'SUBMITTED';
  end if;

  if v_active_container_count > 0 and v_numbered_container_count = v_active_container_count then
    return 'COMPLETED';
  end if;
  if v_item_count > 0 and v_released_item_count = v_item_count then
    return 'RELEASED';
  end if;
  return 'SUBMITTED';
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
  v_uses_internal_container_numbering boolean := false;
begin
  select *
    into v_order
    from public.purchase_order
    where id = p_order_id
    for update;

  if not found then
    raise exception 'Purchase order % not found', p_order_id;
  end if;

  if v_order.owner_id is not null then
    select coalesce(uses_internal_container_numbering, false)
      into v_uses_internal_container_numbering
      from public.container_owners
      where id = v_order.owner_id;
  end if;

  if p_containers is null or jsonb_typeof(p_containers) <> 'array' then
    raise exception 'Container payload must be a JSON array';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(p_containers)
  loop
    v_container_number := null;

    if v_order.purchase_type = 'FACTORY_ORDER' and v_uses_internal_container_numbering then
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
      if v_order.purchase_type = 'FACTORY_ORDER' and v_container_number is null then
        raise exception 'Container Number is required for factory orders when the owner uses manual numbering';
      end if;
      if v_container_number is not null and upper(v_container_number) !~ '^[A-Z]{4}[0-9]{7}$' then
        raise exception 'Container Number must match 4 letters followed by 7 digits';
      end if;
      if v_container_number is not null then
        v_container_number := upper(v_container_number);
      end if;
    end if;

    v_offline_date := nullif(v_row->>'offline_date', '')::date;

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
      tare_weight,
      maximum_weight,
      csc_number,
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
      nullif(v_row->>'tare_weight', '')::numeric(12,2),
      nullif(v_row->>'maximum_weight', '')::numeric(12,2),
      nullif(v_row->>'csc_number', ''),
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

update public.purchase_order po
set order_status = case
  when po.order_status = 'CANCELLED' then 'CANCELLED'
  when po.order_status = 'DRAFT' then 'DRAFT'
  else public.purchase_resolve_order_status(po.id)
end
where po.purchase_type in ('NEW_CONTAINER', 'USED_CONTAINER');
