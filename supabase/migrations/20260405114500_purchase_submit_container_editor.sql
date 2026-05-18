alter table public.purchase_order
  drop constraint if exists purchase_order_order_status_check;

alter table public.purchase_order
  add constraint purchase_order_order_status_check
  check (
    order_status = any (
      array[
        'DRAFT'::text,
        'CTR_NO_PENDING'::text,
        'CONFIRMED'::text,
        'PARTIAL_RECEIVED'::text,
        'COMPLETED'::text,
        'CANCELLED'::text
      ]
    )
  );

alter table public.purchase_order_container
  drop constraint if exists purchase_order_container_container_status_check;

alter table public.purchase_order_container
  add constraint purchase_order_container_container_status_check
  check (
    container_status = any (
      array[
        'PLANNED'::text,
        'READY'::text,
        'PICKED_UP'::text,
        'CANCELLED'::text,
        'PURCHASED'::text,
        'IN_YARD'::text
      ]
    )
  );

create or replace function public.purchase_iso6346_char_value(p_char text)
returns integer
language plpgsql
immutable
as $$
begin
  case upper(p_char)
    when 'A' then return 10;
    when 'B' then return 12;
    when 'C' then return 13;
    when 'D' then return 14;
    when 'E' then return 15;
    when 'F' then return 16;
    when 'G' then return 17;
    when 'H' then return 18;
    when 'I' then return 19;
    when 'J' then return 20;
    when 'K' then return 21;
    when 'L' then return 23;
    when 'M' then return 24;
    when 'N' then return 25;
    when 'O' then return 26;
    when 'P' then return 27;
    when 'Q' then return 28;
    when 'R' then return 29;
    when 'S' then return 30;
    when 'T' then return 31;
    when 'U' then return 32;
    when 'V' then return 34;
    when 'W' then return 35;
    when 'X' then return 36;
    when 'Y' then return 37;
    when 'Z' then return 38;
    else return null;
  end case;
end;
$$;

create or replace function public.purchase_iso6346_check_digit(p_base text)
returns integer
language plpgsql
immutable
as $$
declare
  v_sum bigint := 0;
  v_index integer;
  v_char text;
  v_value integer;
  v_remainder integer;
begin
  if p_base is null or length(trim(p_base)) <> 10 then
    raise exception 'ISO 6346 base must be 10 characters, got %', p_base;
  end if;

  for v_index in 1..length(p_base) loop
    v_char := substring(upper(trim(p_base)) from v_index for 1);
    if v_char ~ '^[0-9]$' then
      v_value := v_char::integer;
    else
      v_value := public.purchase_iso6346_char_value(v_char);
    end if;

    if v_value is null then
      raise exception 'Invalid ISO 6346 character %', v_char;
    end if;

    v_sum := v_sum + (v_value * (2 ^ (v_index - 1)));
  end loop;

  v_remainder := (v_sum % 11)::integer;
  if v_remainder = 10 then
    return 0;
  end if;
  return v_remainder;
end;
$$;

create or replace function public.purchase_generate_iso6346_container_number(
  p_prefix text,
  p_serial integer
)
returns text
language plpgsql
immutable
as $$
declare
  v_prefix text := upper(trim(p_prefix));
  v_serial text := lpad(greatest(p_serial, 0)::text, 6, '0');
  v_base text;
begin
  if length(v_prefix) <> 4 then
    raise exception 'Container number prefix must be exactly 4 characters, got %', p_prefix;
  end if;

  v_base := v_prefix || v_serial;
  return v_base || public.purchase_iso6346_check_digit(v_base)::text;
end;
$$;

create or replace function public.purchase_order_container_sync_status_fields()
returns trigger
language plpgsql
as $$
begin
  if new.container_status is null and new.item_status is not null then
    new.container_status := case
      when new.item_status = 'OFFLINED' then 'READY'
      when new.item_status = 'INBOUND' then 'PICKED_UP'
      when new.item_status = 'CANCELLED' then 'CANCELLED'
      when new.item_status = 'BOX_NO_ASSIGNED' then 'PURCHASED'
      else 'PLANNED'
    end;
  end if;

  if new.container_status is not null and (tg_op = 'INSERT' or new.container_status is distinct from old.container_status) then
    new.item_status := case new.container_status
      when 'READY' then 'OFFLINED'
      when 'PICKED_UP' then 'INBOUND'
      when 'CANCELLED' then 'CANCELLED'
      when 'IN_YARD' then 'INBOUND'
      when 'PURCHASED' then 'BOX_NO_ASSIGNED'
      else 'PLANNED'
    end;
  elsif new.item_status is not null and (tg_op = 'INSERT' or new.item_status is distinct from old.item_status) then
    new.container_status := case
      when new.item_status = 'OFFLINED' then 'READY'
      when new.item_status = 'INBOUND' then 'PICKED_UP'
      when new.item_status = 'CANCELLED' then 'CANCELLED'
      when new.item_status = 'BOX_NO_ASSIGNED' then 'PURCHASED'
      else 'PLANNED'
    end;
  end if;

  if new.actual_offline_time is not null then
    new.offline_date := new.actual_offline_time::date;
    if new.container_status in ('PLANNED', 'PURCHASED') then
      new.container_status := 'IN_YARD';
      new.item_status := 'INBOUND';
    end if;
  end if;

  return new;
end
$$;

create or replace function public.purchase_order_refresh_totals(p_purchase_order_id uuid)
returns void
language plpgsql
as $$
declare
  v_total_planned_qty integer;
  v_total_received_qty integer;
  v_total_available_qty integer;
  v_grand_total numeric(14,2);
begin
  select
    coalesce(sum(planned_qty), 0),
    coalesce(sum(line_amount), 0)
  into
    v_total_planned_qty,
    v_grand_total
  from public.purchase_order_item
  where purchase_order_id = p_purchase_order_id;

  select
    coalesce(count(*) filter (where container_status in ('IN_YARD', 'PICKED_UP')), 0),
    coalesce(count(*) filter (where container_status in ('IN_YARD', 'PICKED_UP')), 0)
  into
    v_total_received_qty,
    v_total_available_qty
  from public.purchase_order_container
  where purchase_order_id = p_purchase_order_id;

  update public.purchase_order
  set total_planned_qty = v_total_planned_qty,
      total_received_qty = v_total_received_qty,
      total_available_qty = v_total_available_qty,
      grand_total = v_grand_total,
      total_amount_payable = v_grand_total,
      total_amount_unpaid = greatest(v_grand_total - coalesce(total_amount_paid, 0), 0)
  where id = p_purchase_order_id;
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
  v_serial integer;
  v_next_serial integer;
  v_container_number text;
  v_container_status text;
  v_offline_date date;
  v_purchase_price numeric(14,2);
  v_has_missing boolean := false;
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
      if v_container_number is null then
        v_has_missing := true;
      end if;
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

  v_result_status := case
    when exists (
      select 1
      from public.purchase_order_container
      where purchase_order_id = p_order_id
        and coalesce(container_number, '') = ''
    ) then 'CTR_NO_PENDING'
    else 'CONFIRMED'
  end;

  update public.purchase_order
  set order_status = v_result_status
  where id = p_order_id;

  return v_result_status;
end
$$;
