set check_function_bodies = off;

alter table public.container_event
  drop constraint if exists container_event_event_type_check;

alter table public.container_event
  add constraint container_event_event_type_check
  check (
    event_type = any (
      array[
        'PURCHASE'::text,
        'YARD_ENTER'::text,
        'YARD_EXIT'::text,
        'TRANSFER_OUT'::text,
        'TRANSFER_IN'::text,
        'TRANSFER_CANCELLED'::text,
        'LEASE_ONHIRE'::text,
        'LEASE_OFFHIRE'::text,
        'SALE_CONTRACTED'::text,
        'SALE_DELIVERED'::text,
        'TOTAL_LOSS'::text,
        'REPAIR'::text,
        'SCRAP'::text
      ]
    )
  );

drop index if exists public.idx_container_condition_code_id;
drop index if exists public.idx_container_current_lease_id;
drop index if exists public.idx_container_current_sale_id;
drop index if exists public.idx_container_current_transfer_id;
drop index if exists public.idx_container_lifecycle_stage;
drop index if exists public.idx_transfer_item_container_id;
drop index if exists public.idx_transfer_item_transfer_order_id;
drop index if exists public.idx_transfer_order_customer_id;
drop index if exists public.idx_transfer_order_from_depot_id;
drop index if exists public.idx_transfer_order_to_depot_id;
drop index if exists public.idx_transfer_status;
drop index if exists public.idx_lease_item_container_id;
drop index if exists public.idx_lease_item_lease_contract_id;
drop index if exists public.idx_lease_bill_lease_contract_id;
drop index if exists public.idx_lease_status;
drop index if exists public.idx_sales_delivery_sales_order_id;
drop index if exists public.idx_sales_item_container_id;
drop index if exists public.idx_sales_item_sales_order_id;
drop index if exists public.idx_sales_order_customer_id;
drop index if exists public.idx_so_status;
drop index if exists public.idx_yard_record_container_id;
drop index if exists public.idx_yard_record_depot_id;
drop index if exists public.uq_yard_record_one_active_per_container2;

create or replace function public.rpc_rebuild_container_side_effects(
  p_container_id uuid,
  p_operator_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_last_event_id uuid;
  v_enter_event_id uuid;
  v_enter_depot_id uuid;
  v_enter_time timestamptz;
  v_exit_time timestamptz;
  v_latest_event_type text;
  v_latest_extra_data jsonb;
  v_delivery_id uuid;
  v_has_other_delivery boolean;
  rec record;
begin
  perform public.lock_container(p_container_id);

  select id
    into v_last_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
  order by event_time desc, created_at desc
  limit 1;

  update public.yard_record
  set exit_time = coalesce(exit_time, now()),
      record_status = 'EXITED',
      updated_by = p_operator_id,
      updated_at = now()
  where container_id = p_container_id
    and record_status = 'IN_YARD';

  select ce.id,
         coalesce(ce.to_depot_id, ce.from_depot_id),
         ce.event_time
    into v_enter_event_id, v_enter_depot_id, v_enter_time
  from public.container_event ce
  where ce.container_id = p_container_id
    and ce.is_void = false
    and ce.event_type in ('YARD_ENTER', 'LEASE_OFFHIRE', 'TRANSFER_CANCELLED')
    and coalesce(ce.to_depot_id, ce.from_depot_id) is not null
  order by ce.event_time desc, ce.created_at desc
  limit 1;

  select ce.event_time
    into v_exit_time
  from public.container_event ce
  where ce.container_id = p_container_id
    and ce.is_void = false
    and ce.event_type in ('YARD_EXIT', 'TRANSFER_OUT', 'LEASE_ONHIRE', 'SALE_DELIVERED')
  order by ce.event_time desc, ce.created_at desc
  limit 1;

  if v_enter_event_id is not null
     and (v_exit_time is null or v_enter_time > v_exit_time) then
    insert into public.yard_record(
      container_id,
      depot_id,
      enter_time,
      record_status,
      remark,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    values (
      p_container_id,
      v_enter_depot_id,
      v_enter_time,
      'IN_YARD',
      'rebuilt from container_event',
      p_operator_id,
      p_operator_id,
      now(),
      now()
    );
  end if;

  for rec in
    select ti.id,
           ti.transfer_order_id,
           ti.item_status,
           last_evt.event_type as latest_event_type
    from public.transfer_item ti
    left join lateral (
      select ce.event_type
      from public.container_event ce
      where ce.container_id = p_container_id
        and ce.is_void = false
        and ce.business_type = 'TRANSFER'
        and ce.business_id = ti.transfer_order_id
        and ce.event_type in ('TRANSFER_OUT', 'TRANSFER_IN', 'TRANSFER_CANCELLED')
      order by ce.event_time desc, ce.created_at desc
      limit 1
    ) last_evt on true
    where ti.container_id = p_container_id
  loop
    update public.transfer_item
    set item_status = case
                        when rec.latest_event_type = 'TRANSFER_OUT' then 'IN_TRANSIT'
                        when rec.latest_event_type = 'TRANSFER_IN' then 'ARRIVED'
                        when rec.latest_event_type = 'TRANSFER_CANCELLED' then 'CANCELLED'
                        when rec.item_status in ('IN_TRANSIT', 'ARRIVED') then 'PLANNED'
                        else rec.item_status
                      end,
        updated_by = p_operator_id,
        updated_at = now()
    where id = rec.id;
  end loop;

  for rec in
    select li.id,
           li.lease_contract_id,
           li.item_status,
           last_evt.event_type as latest_event_type
    from public.lease_item li
    left join lateral (
      select ce.event_type
      from public.container_event ce
      where ce.container_id = p_container_id
        and ce.is_void = false
        and ce.business_type = 'LEASE'
        and ce.business_id = li.lease_contract_id
        and ce.event_type in ('LEASE_ONHIRE', 'LEASE_OFFHIRE')
      order by ce.event_time desc, ce.created_at desc
      limit 1
    ) last_evt on true
    where li.container_id = p_container_id
  loop
    update public.lease_item
    set item_status = case
                        when rec.latest_event_type = 'LEASE_ONHIRE' then 'ONHIRE'
                        when rec.latest_event_type = 'LEASE_OFFHIRE' then 'OFFHIRE'
                        when rec.item_status in ('ONHIRE', 'OVERDUE') then 'OFFHIRE'
                        else rec.item_status
                      end,
        updated_by = p_operator_id,
        updated_at = now()
    where id = rec.id;
  end loop;

  for rec in
    select si.id,
           si.sales_order_id,
           si.item_status,
           last_evt.event_type as latest_event_type,
           coalesce(last_evt.extra_data, '{}'::jsonb) as latest_extra_data
    from public.sales_item si
    left join lateral (
      select ce.event_type, ce.extra_data
      from public.container_event ce
      where ce.container_id = p_container_id
        and ce.is_void = false
        and ce.business_type = 'SALE'
        and ce.business_id = si.sales_order_id
        and ce.event_type in ('SALE_CONTRACTED', 'SALE_DELIVERED')
      order by ce.event_time desc, ce.created_at desc
      limit 1
    ) last_evt on true
    where si.container_id = p_container_id
  loop
    update public.sales_item
    set item_status = case
                        when rec.latest_event_type = 'SALE_DELIVERED' then 'DELIVERED'
                        when rec.latest_event_type = 'SALE_CONTRACTED'
                             and rec.latest_extra_data ? 'sale_failed_at' then 'FAILED'
                        when rec.latest_event_type = 'SALE_CONTRACTED' then 'CONTRACTED'
                        else rec.item_status
                      end,
        updated_by = p_operator_id,
        updated_at = now()
    where id = rec.id;
  end loop;

  for rec in
    select ce.id,
           ce.event_type,
           ce.extra_data
    from public.container_event ce
    where ce.container_id = p_container_id
      and ce.is_void = false
      and ce.event_type = 'SALE_DELIVERED'
      and ce.extra_data ? 'delivery_id'
  loop
    begin
      v_delivery_id := (rec.extra_data ->> 'delivery_id')::uuid;
    exception
      when others then
        v_delivery_id := null;
    end;

    if v_delivery_id is not null then
      update public.sales_delivery
      set delivery_status = 'DELIVERED',
          delivery_date = coalesce(delivery_date, now()),
          updated_by = p_operator_id,
          updated_at = now()
      where id = v_delivery_id;
    end if;
  end loop;

  for rec in
    select distinct sd.id
    from public.sales_delivery sd
    join public.sales_item si
      on si.sales_order_id = sd.sales_order_id
    where si.container_id = p_container_id
  loop
    select exists (
      select 1
      from public.container_event ce
      where ce.is_void = false
        and ce.event_type = 'SALE_DELIVERED'
        and ce.extra_data ? 'delivery_id'
        and ce.extra_data ->> 'delivery_id' = rec.id::text
    )
      into v_has_other_delivery;

    if not v_has_other_delivery then
      update public.sales_delivery
      set delivery_status = case
                              when delivery_status = 'DELIVERED' then 'PLANNED'
                              else delivery_status
                            end,
          updated_by = p_operator_id,
          updated_at = now()
      where id = rec.id;
    end if;
  end loop;

  return v_last_event_id;
end;
$function$;

create or replace function public.rpc_rebuild_container_snapshot(
  p_container_id uuid,
  p_operator_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_last_event_id uuid;
  v_event_type text;
  v_lifecycle text;
  v_status text;
  v_business_type text;
  v_business_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;
  v_extra_data jsonb;
  v_customer_id uuid;
  v_depot_id uuid;
begin
  perform public.lock_container(p_container_id);

  select id,
         event_type,
         lifecycle_after,
         status_after,
         business_type,
         business_id,
         from_depot_id,
         to_depot_id,
         coalesce(extra_data, '{}'::jsonb)
    into v_last_event_id,
         v_event_type,
         v_lifecycle,
         v_status,
         v_business_type,
         v_business_id,
         v_from_depot,
         v_to_depot,
         v_extra_data
  from public.container_event
  where container_id = p_container_id
    and is_void = false
  order by event_time desc, created_at desc
  limit 1;

  if v_last_event_id is null then
    update public.container
    set last_event_id = null,
        current_transfer_id = null,
        current_sale_id = null,
        current_lease_id = null,
        current_customer_id = null,
        current_depot_id = null,
        transit_business_type = null,
        updated_by = p_operator_id,
        updated_at = now()
    where id = p_container_id;

    return null;
  end if;

  v_customer_id := null;
  if v_business_type = 'LEASE' and v_business_id is not null then
    select customer_id
      into v_customer_id
    from public.lease_contract
    where id = v_business_id;
  elsif v_business_type = 'SALE' and v_business_id is not null then
    select customer_id
      into v_customer_id
    from public.sales_order
    where id = v_business_id;
  elsif v_business_type = 'TRANSFER' and v_business_id is not null then
    select customer_id
      into v_customer_id
    from public.transfer_order
    where id = v_business_id;
  end if;

  select yr.depot_id
    into v_depot_id
  from public.yard_record yr
  where yr.container_id = p_container_id
    and yr.record_status = 'IN_YARD'
  order by yr.enter_time desc
  limit 1;

  if v_depot_id is null and v_lifecycle = 'IN_YARD' then
    v_depot_id := coalesce(v_to_depot, v_from_depot);
  end if;

  update public.container
  set lifecycle_stage = coalesce(v_lifecycle, lifecycle_stage),
      status = coalesce(v_status, status),
      last_event_id = v_last_event_id,
      current_transfer_id = case
                              when v_event_type in ('TRANSFER_OUT', 'TRANSFER_IN')
                                and v_business_type = 'TRANSFER' then v_business_id
                              else null
                            end,
      current_sale_id = case
                          when v_event_type = 'SALE_CONTRACTED'
                               and v_business_type = 'SALE'
                               and not (v_extra_data ? 'sale_failed_at') then v_business_id
                          when v_event_type = 'SALE_DELIVERED'
                               and v_business_type = 'SALE' then v_business_id
                          else null
                        end,
      current_lease_id = case
                           when v_event_type = 'LEASE_ONHIRE'
                                and v_business_type = 'LEASE' then v_business_id
                           else null
                         end,
      current_customer_id = case
                              when v_event_type = 'LEASE_ONHIRE' then v_customer_id
                              when v_event_type = 'SALE_DELIVERED' then v_customer_id
                              when v_event_type = 'SALE_CONTRACTED'
                                   and not (v_extra_data ? 'sale_failed_at') then v_customer_id
                              else null
                            end,
      current_depot_id = case
                           when v_event_type in ('YARD_ENTER', 'LEASE_OFFHIRE', 'TRANSFER_CANCELLED')
                             then v_depot_id
                           when v_lifecycle = 'IN_YARD' then v_depot_id
                           else null
                         end,
      transit_business_type = case
                                when v_event_type in ('TRANSFER_OUT', 'TRANSFER_IN')
                                  then transit_business_type
                                else null
                              end,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  return v_last_event_id;
end;
$function$;

create or replace function public.rpc_lease_onhire(
  p_lease_contract_id uuid,
  p_container_id uuid,
  p_onhire_time timestamp with time zone default now(),
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
  v_current_depot uuid;
begin
  perform public.lock_container(p_container_id);

  select id
    into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'LEASE'
    and business_id = p_lease_contract_id
    and event_type = 'LEASE_ONHIRE'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id
    into v_customer_id
  from public.lease_contract
  where id = p_lease_contract_id;

  if not found then
    raise exception 'lease_contract not found: %', p_lease_contract_id;
  end if;

  select lifecycle_stage, status, current_depot_id
    into v_lifecycle_before, v_status_before, v_current_depot
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.lease_item
  set item_status = 'ONHIRE',
      updated_by = p_operator_id,
      updated_at = now()
  where lease_contract_id = p_lease_contract_id
    and container_id = p_container_id;

  if not found then
    raise exception 'lease_item not found for lease_contract % and container %', p_lease_contract_id, p_container_id;
  end if;

  if v_existing_event_id is not null then
    if v_current_depot is not null then
      update public.yard_record
      set exit_time = coalesce(exit_time, p_onhire_time),
          record_status = 'EXITED',
          updated_by = p_operator_id,
          updated_at = now()
      where container_id = p_container_id
        and depot_id = v_current_depot
        and record_status = 'IN_YARD';
    end if;

    update public.container
    set lifecycle_stage = 'LEASE',
        status = 'ONHIRE',
        current_lease_id = p_lease_contract_id,
        current_customer_id = v_customer_id,
        current_transfer_id = null,
        current_depot_id = null,
        transit_business_type = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  if v_lifecycle_before <> 'IN_YARD' or v_current_depot is null then
    raise exception 'container % must be in yard before onhire', p_container_id;
  end if;

  update public.yard_record
  set exit_time = p_onhire_time,
      record_status = 'EXITED',
      updated_by = p_operator_id,
      updated_at = now()
  where container_id = p_container_id
    and depot_id = v_current_depot
    and record_status = 'IN_YARD';

  if not found then
    raise exception 'active yard_record not found for container % at depot %', p_container_id, v_current_depot;
  end if;

  update public.container
  set lifecycle_stage = 'LEASE',
      status = 'ONHIRE',
      current_lease_id = p_lease_contract_id,
      current_customer_id = v_customer_id,
      current_transfer_id = null,
      current_depot_id = null,
      transit_business_type = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    from_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark
  )
  values(
    p_container_id,
    'LEASE_ONHIRE',
    'LEASE',
    p_lease_contract_id,
    v_current_depot,
    v_lifecycle_before,
    'LEASE',
    v_status_before,
    'ONHIRE',
    p_onhire_time,
    p_operator_id,
    p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  return v_event_id;
end;
$function$;

create or replace function public.rpc_lease_offhire(
  p_lease_contract_id uuid,
  p_container_id uuid,
  p_return_depot_id uuid,
  p_offhire_time timestamp with time zone default now(),
  p_status_after text default 'AVAILABLE',
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
  v_active_depot uuid;
  v_active_enter_time timestamptz;
begin
  perform public.lock_container(p_container_id);

  select id
    into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'LEASE'
    and business_id = p_lease_contract_id
    and event_type = 'LEASE_OFFHIRE'
  order by event_time desc, created_at desc
  limit 1;

  select depot_id, enter_time
    into v_active_depot, v_active_enter_time
  from public.yard_record
  where container_id = p_container_id
    and record_status = 'IN_YARD'
  order by enter_time desc
  limit 1;

  if v_existing_event_id is not null then
    if v_active_depot is not null
       and (v_active_depot is distinct from p_return_depot_id
            or v_active_enter_time is distinct from p_offhire_time) then
      raise exception 'active yard_record already exists for container % at depot % enter_time %',
        p_container_id, v_active_depot, v_active_enter_time;
    end if;

    if v_active_depot is null then
      insert into public.yard_record(
        container_id,
        depot_id,
        enter_time,
        record_status,
        remark,
        created_by,
        updated_by
      )
      values(
        p_container_id,
        p_return_depot_id,
        p_offhire_time,
        'IN_YARD',
        p_remark,
        p_operator_id,
        p_operator_id
      );
    end if;

    update public.lease_item
    set item_status = 'OFFHIRE',
        updated_by = p_operator_id,
        updated_at = now()
    where lease_contract_id = p_lease_contract_id
      and container_id = p_container_id;

    update public.container
    set lifecycle_stage = 'IN_YARD',
        status = p_status_after,
        current_depot_id = p_return_depot_id,
        current_lease_id = null,
        current_customer_id = null,
        current_transfer_id = null,
        transit_business_type = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  if v_active_depot is not null then
    raise exception 'container % already has active yard_record at depot %', p_container_id, v_active_depot;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.lease_item
  set item_status = 'OFFHIRE',
      updated_by = p_operator_id,
      updated_at = now()
  where lease_contract_id = p_lease_contract_id
    and container_id = p_container_id;

  if not found then
    raise exception 'lease_item not found for lease_contract % and container %', p_lease_contract_id, p_container_id;
  end if;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    to_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark
  )
  values(
    p_container_id,
    'LEASE_OFFHIRE',
    'LEASE',
    p_lease_contract_id,
    p_return_depot_id,
    v_lifecycle_before,
    'IN_YARD',
    v_status_before,
    p_status_after,
    p_offhire_time,
    p_operator_id,
    p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  insert into public.yard_record(
    container_id,
    depot_id,
    enter_time,
    record_status,
    remark,
    created_by,
    updated_by
  )
  values(
    p_container_id,
    p_return_depot_id,
    p_offhire_time,
    'IN_YARD',
    p_remark,
    p_operator_id,
    p_operator_id
  );

  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = p_status_after,
      current_depot_id = p_return_depot_id,
      current_lease_id = null,
      current_customer_id = null,
      current_transfer_id = null,
      transit_business_type = null,
      updated_by = p_operator_id,
      updated_at = now(),
      last_event_id = v_event_id
  where id = p_container_id;

  return v_event_id;
end;
$function$;

create or replace function public.rpc_sale_contract(
  p_sales_order_id uuid,
  p_container_id uuid,
  p_contracted_time timestamp with time zone default now(),
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id
    into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_CONTRACTED'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id
    into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  if v_lifecycle_before = 'SOLD' then
    raise exception 'sold container % cannot be contracted again', p_container_id;
  end if;

  update public.sales_item
  set item_status = 'CONTRACTED',
      updated_by = p_operator_id,
      updated_at = now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  if v_existing_event_id is not null then
    update public.container
    set current_sale_id = p_sales_order_id,
        current_customer_id = v_customer_id,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  update public.container
  set current_sale_id = p_sales_order_id,
      current_customer_id = v_customer_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark
  )
  values(
    p_container_id,
    'SALE_CONTRACTED',
    'SALE',
    p_sales_order_id,
    v_lifecycle_before,
    v_lifecycle_before,
    v_status_before,
    v_status_before,
    p_contracted_time,
    p_operator_id,
    p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$;

create or replace function public.rpc_sale_deliver(
  p_sales_order_id uuid,
  p_container_id uuid,
  p_delivery_id uuid default null,
  p_delivered_time timestamp with time zone default now(),
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
  v_current_depot uuid;
begin
  perform public.lock_container(p_container_id);

  select id
    into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_DELIVERED'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id
    into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  if p_delivery_id is not null then
    perform 1
    from public.sales_delivery
    where id = p_delivery_id
      and sales_order_id = p_sales_order_id;

    if not found then
      raise exception 'sales_delivery % does not belong to sales_order %', p_delivery_id, p_sales_order_id;
    end if;
  end if;

  select lifecycle_stage, status, current_depot_id
    into v_lifecycle_before, v_status_before, v_current_depot
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.sales_item
  set item_status = 'DELIVERED',
      updated_by = p_operator_id,
      updated_at = now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  if v_current_depot is not null then
    update public.yard_record
    set exit_time = p_delivered_time,
        record_status = 'EXITED',
        updated_by = p_operator_id,
        updated_at = now()
    where container_id = p_container_id
      and depot_id = v_current_depot
      and record_status = 'IN_YARD';

    if not found then
      raise exception 'active yard_record not found for container % at depot %', p_container_id, v_current_depot;
    end if;
  end if;

  if p_delivery_id is not null then
    update public.sales_delivery
    set delivery_status = 'DELIVERED',
        delivery_date = coalesce(delivery_date, p_delivered_time),
        updated_by = p_operator_id,
        updated_at = now()
    where id = p_delivery_id
      and sales_order_id = p_sales_order_id;
  end if;

  if v_existing_event_id is not null then
    update public.container
    set lifecycle_stage = 'SOLD',
        status = 'SOLD',
        current_sale_id = p_sales_order_id,
        current_customer_id = v_customer_id,
        current_transfer_id = null,
        current_lease_id = null,
        current_depot_id = null,
        transit_business_type = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  update public.container
  set lifecycle_stage = 'SOLD',
      status = 'SOLD',
      current_sale_id = p_sales_order_id,
      current_customer_id = v_customer_id,
      current_transfer_id = null,
      current_lease_id = null,
      current_depot_id = null,
      transit_business_type = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    from_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark,
    extra_data
  )
  values(
    p_container_id,
    'SALE_DELIVERED',
    'SALE',
    p_sales_order_id,
    v_current_depot,
    v_lifecycle_before,
    'SOLD',
    v_status_before,
    'SOLD',
    p_delivered_time,
    p_operator_id,
    p_operator_name,
    p_remark,
    case
      when p_delivery_id is null then '{}'::jsonb
      else jsonb_build_object('delivery_id', p_delivery_id)
    end
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  return v_event_id;
end;
$function$;

create or replace function public.rpc_sale_fail(
  p_sales_order_id uuid,
  p_container_id uuid,
  p_failed_time timestamp with time zone default now(),
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_contracted_event_id uuid;
begin
  perform public.lock_container(p_container_id);

  perform 1
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_DELIVERED'
  limit 1;

  if found then
    raise exception 'Cannot fail sale: SALE_DELIVERED already exists for sales_order % and container %',
      p_sales_order_id, p_container_id;
  end if;

  select id
    into v_contracted_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_CONTRACTED'
  order by event_time desc, created_at desc
  limit 1;

  if v_contracted_event_id is null then
    raise exception 'Cannot fail sale: non-void SALE_CONTRACTED event not found for sales_order % and container %',
      p_sales_order_id, p_container_id;
  end if;

  update public.sales_item
  set item_status = 'FAILED',
      updated_by = p_operator_id,
      updated_at = now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  update public.container
  set current_sale_id = null,
      current_customer_id = null,
      updated_by = p_operator_id,
      updated_at = now(),
      last_event_id = v_contracted_event_id
  where id = p_container_id;

  update public.container_event
  set remark = coalesce(remark, '')
               || ' | SALE FAILED at ' || p_failed_time::text
               || ' reason=' || coalesce(p_reason, ''),
      extra_data = coalesce(extra_data, '{}'::jsonb)
                   || jsonb_build_object(
                        'sale_failed_at', p_failed_time,
                        'sale_failed_reason', coalesce(p_reason, '')
                      ),
      operator_id = coalesce(operator_id, p_operator_id),
      operator_name = coalesce(operator_name, p_operator_name)
  where id = v_contracted_event_id;
end;
$function$;

create or replace function public.rpc_transfer_complete_if_all_arrived(
  p_transfer_order_id uuid,
  p_complete_time timestamp with time zone default now(),
  p_operator_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_remaining int;
  v_total int;
  v_current_status text;
  b bytea;
  k1 int;
  k2 int;
begin
  b := uuid_send(p_transfer_order_id);
  k1 := (get_byte(b, 0) << 24) | (get_byte(b, 1) << 16) | (get_byte(b, 2) << 8) | get_byte(b, 3);
  k2 := (get_byte(b, 4) << 24) | (get_byte(b, 5) << 16) | (get_byte(b, 6) << 8) | get_byte(b, 7);
  perform pg_advisory_xact_lock(k1, k2);

  select status
    into v_current_status
  from public.transfer_order
  where id = p_transfer_order_id
  for update;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  if v_current_status in ('COMPLETED', 'CANCELLED') then
    return false;
  end if;

  select count(*)
    into v_total
  from public.transfer_item
  where transfer_order_id = p_transfer_order_id;

  if v_total = 0 then
    return false;
  end if;

  select count(*)
    into v_remaining
  from public.transfer_item
  where transfer_order_id = p_transfer_order_id
    and item_status in ('PLANNED', 'IN_TRANSIT');

  if v_remaining = 0 then
    update public.transfer_order
    set status = 'COMPLETED',
        arrival_time = coalesce(arrival_time, p_complete_time),
        updated_by = p_operator_id,
        updated_at = now()
    where id = p_transfer_order_id;

    return true;
  end if;

  return false;
end;
$function$;

create or replace function public.rpc_transfer_in(
  p_transfer_order_id uuid,
  p_container_id uuid,
  p_arrival_time timestamp with time zone default now(),
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;
  v_lifecycle_before text;
  v_status_before text;
  v_item_status text;
begin
  perform public.lock_container(p_container_id);

  select id
    into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'TRANSFER'
    and business_id = p_transfer_order_id
    and event_type = 'TRANSFER_IN'
  order by event_time desc, created_at desc
  limit 1;

  if v_existing_event_id is not null then
    update public.container
    set last_event_id = v_existing_event_id,
        updated_at = now(),
        updated_by = p_operator_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  select from_depot_id, to_depot_id
    into v_from_depot, v_to_depot
  from public.transfer_order
  where id = p_transfer_order_id;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  select item_status
    into v_item_status
  from public.transfer_item
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id
  for update;

  if not found then
    raise exception 'transfer_item not found for transfer_order % and container %', p_transfer_order_id, p_container_id;
  end if;

  if v_item_status <> 'IN_TRANSIT' then
    raise exception 'transfer_item for transfer_order % and container % must be IN_TRANSIT before arrival, got %',
      p_transfer_order_id, p_container_id, v_item_status;
  end if;

  update public.transfer_item
  set item_status = 'ARRIVED',
      updated_by = p_operator_id,
      updated_at = now()
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id;

  update public.transfer_order
  set arrival_time = coalesce(arrival_time, p_arrival_time),
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_transfer_order_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    from_depot_id,
    to_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark
  )
  values(
    p_container_id,
    'TRANSFER_IN',
    'TRANSFER',
    p_transfer_order_id,
    v_from_depot,
    v_to_depot,
    v_lifecycle_before,
    v_lifecycle_before,
    v_status_before,
    v_status_before,
    p_arrival_time,
    p_operator_id,
    p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$;

create or replace function public.rpc_transfer_out(
  p_transfer_order_id uuid,
  p_container_id uuid,
  p_departure_time timestamp with time zone default now(),
  p_status_after text default 'EW_DEPOT_PENDING',
  p_transit_business_type text default 'EW_DEPOT',
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;
  v_lifecycle_before text;
  v_status_before text;
  v_current_depot uuid;
begin
  perform public.lock_container(p_container_id);

  select id
    into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'TRANSFER'
    and business_id = p_transfer_order_id
    and event_type = 'TRANSFER_OUT'
  order by event_time desc, created_at desc
  limit 1;

  select lifecycle_stage, status, current_depot_id
    into v_lifecycle_before, v_status_before, v_current_depot
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  select from_depot_id, to_depot_id
    into v_from_depot, v_to_depot
  from public.transfer_order
  where id = p_transfer_order_id;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  insert into public.transfer_item(
    transfer_order_id,
    container_id,
    item_status,
    remark,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    p_transfer_order_id,
    p_container_id,
    'PLANNED',
    p_remark,
    p_operator_id,
    p_operator_id,
    now(),
    now()
  )
  on conflict (transfer_order_id, container_id) do nothing;

  update public.transfer_item
  set item_status = 'IN_TRANSIT',
      updated_by = p_operator_id,
      updated_at = now()
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id;

  update public.transfer_order
  set status = case when status = 'CREATED' then 'IN_TRANSIT' else status end,
      departure_time = coalesce(departure_time, p_departure_time),
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_transfer_order_id;

  if v_existing_event_id is not null then
    if v_current_depot = v_from_depot then
      update public.yard_record
      set exit_time = coalesce(exit_time, p_departure_time),
          record_status = 'EXITED',
          updated_by = p_operator_id,
          updated_at = now()
      where container_id = p_container_id
        and depot_id = v_from_depot
        and record_status = 'IN_YARD';
    end if;

    update public.container
    set lifecycle_stage = 'IN_TRANSIT',
        status = p_status_after,
        transit_business_type = p_transit_business_type,
        current_transfer_id = p_transfer_order_id,
        current_depot_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  if v_lifecycle_before <> 'IN_YARD' then
    raise exception 'container % must be IN_YARD before transfer_out, got %', p_container_id, v_lifecycle_before;
  end if;

  if v_from_depot is null or v_current_depot is distinct from v_from_depot then
    raise exception 'container current_depot_id (%) not match transfer from_depot_id (%)', v_current_depot, v_from_depot;
  end if;

  update public.yard_record
  set exit_time = p_departure_time,
      record_status = 'EXITED',
      updated_by = p_operator_id,
      updated_at = now()
  where container_id = p_container_id
    and depot_id = v_from_depot
    and record_status = 'IN_YARD';

  if not found then
    raise exception 'active yard_record not found for container % at depot %', p_container_id, v_from_depot;
  end if;

  update public.container
  set lifecycle_stage = 'IN_TRANSIT',
      status = p_status_after,
      transit_business_type = p_transit_business_type,
      current_transfer_id = p_transfer_order_id,
      current_depot_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    from_depot_id,
    to_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark
  )
  values(
    p_container_id,
    'TRANSFER_OUT',
    'TRANSFER',
    p_transfer_order_id,
    v_from_depot,
    v_to_depot,
    v_lifecycle_before,
    'IN_TRANSIT',
    v_status_before,
    p_status_after,
    p_departure_time,
    p_operator_id,
    p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$;

create or replace function public.rpc_transfer_cancel_item(
  p_transfer_order_id uuid,
  p_container_id uuid,
  p_operator_id uuid default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_item_status text;
  v_current_lifecycle text;
  v_current_status text;
  v_last_out_event_id uuid;
  v_last_in_event_id uuid;
  v_from_depot uuid;
  v_status_before text;
  v_event_id uuid;
begin
  perform public.lock_container(p_container_id);

  select item_status
    into v_item_status
  from public.transfer_item
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id
  for update;

  if not found then
    raise exception 'transfer_item not found for transfer_order % and container %', p_transfer_order_id, p_container_id;
  end if;

  select lifecycle_stage, status
    into v_current_lifecycle, v_current_status
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  select ce.id, ce.from_depot_id, ce.status_before
    into v_last_out_event_id, v_from_depot, v_status_before
  from public.container_event ce
  where ce.container_id = p_container_id
    and ce.is_void = false
    and ce.business_type = 'TRANSFER'
    and ce.business_id = p_transfer_order_id
    and ce.event_type = 'TRANSFER_OUT'
  order by ce.event_time desc, ce.created_at desc
  limit 1;

  select ce.id
    into v_last_in_event_id
  from public.container_event ce
  where ce.container_id = p_container_id
    and ce.is_void = false
    and ce.business_type = 'TRANSFER'
    and ce.business_id = p_transfer_order_id
    and ce.event_type = 'TRANSFER_IN'
  order by ce.event_time desc, ce.created_at desc
  limit 1;

  if v_last_out_event_id is null then
    update public.transfer_item
    set item_status = 'CANCELLED',
        remark = coalesce(remark, '') || ' | CANCEL reason=' || coalesce(p_reason, ''),
        updated_by = p_operator_id,
        updated_at = now()
    where transfer_order_id = p_transfer_order_id
      and container_id = p_container_id;

    update public.container
    set current_transfer_id = case
                                when current_transfer_id = p_transfer_order_id then null
                                else current_transfer_id
                              end,
        updated_by = p_operator_id,
        updated_at = now()
    where id = p_container_id;

    return;
  end if;

  if v_last_in_event_id is not null then
    raise exception 'cannot cancel transfer_item after TRANSFER_IN for transfer_order % and container %',
      p_transfer_order_id, p_container_id;
  end if;

  if exists (
    select 1
    from public.yard_record
    where container_id = p_container_id
      and record_status = 'IN_YARD'
  ) then
    raise exception 'container % already has active yard_record; cannot rollback transfer cancel', p_container_id;
  end if;

  insert into public.yard_record(
    container_id,
    depot_id,
    enter_time,
    record_status,
    remark,
    created_by,
    updated_by
  )
  values(
    p_container_id,
    v_from_depot,
    v_now,
    'IN_YARD',
    coalesce(p_reason, 'transfer cancelled and rolled back'),
    p_operator_id,
    p_operator_id
  );

  update public.transfer_item
  set item_status = 'CANCELLED',
      remark = coalesce(remark, '') || ' | CANCEL reason=' || coalesce(p_reason, ''),
      updated_by = p_operator_id,
      updated_at = now()
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id;

  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = v_status_before,
      current_transfer_id = null,
      current_depot_id = v_from_depot,
      transit_business_type = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    to_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    remark
  )
  values(
    p_container_id,
    'TRANSFER_CANCELLED',
    'TRANSFER',
    p_transfer_order_id,
    v_from_depot,
    v_current_lifecycle,
    'IN_YARD',
    v_current_status,
    v_status_before,
    v_now,
    p_operator_id,
    p_reason
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;
end;
$function$;

create or replace function public.rpc_void_container_event(
  p_event_id uuid,
  p_reason text,
  p_operator_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_container_id uuid;
begin
  select container_id
    into v_container_id
  from public.container_event
  where id = p_event_id
  for update;

  if not found then
    raise exception 'event not found: %', p_event_id;
  end if;

  perform public.lock_container(v_container_id);

  update public.container_event
  set is_void = true,
      voided_by = p_operator_id,
      voided_at = now(),
      void_reason = p_reason
  where id = p_event_id
    and is_void = false;

  if not found then
    return p_event_id;
  end if;

  perform public.rpc_rebuild_container_side_effects(v_container_id, p_operator_id);
  perform public.rpc_rebuild_container_snapshot(v_container_id, p_operator_id);

  return p_event_id;
end;
$function$;

create or replace function public.rpc_yard_enter(
  p_container_id uuid,
  p_depot_id uuid,
  p_enter_time timestamp with time zone default now(),
  p_status_after text default 'AVAILABLE',
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_business_type text default 'YARD',
  p_business_id uuid default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
  v_active_depot uuid;
  v_active_enter_time timestamptz;
begin
  perform public.lock_container(p_container_id);

  if p_business_id is not null then
    select id
      into v_existing_event_id
    from public.container_event
    where container_id = p_container_id
      and is_void = false
      and business_type = p_business_type
      and business_id = p_business_id
      and event_type = 'YARD_ENTER'
    order by event_time desc, created_at desc
    limit 1;
  else
    select id
      into v_existing_event_id
    from public.container_event
    where container_id = p_container_id
      and is_void = false
      and event_type = 'YARD_ENTER'
      and to_depot_id = p_depot_id
      and event_time = p_enter_time
    order by created_at desc
    limit 1;
  end if;

  select depot_id, enter_time
    into v_active_depot, v_active_enter_time
  from public.yard_record
  where container_id = p_container_id
    and record_status = 'IN_YARD'
  order by enter_time desc
  limit 1;

  if v_existing_event_id is not null then
    if v_active_depot is not null
       and (v_active_depot is distinct from p_depot_id
            or v_active_enter_time is distinct from p_enter_time) then
      raise exception 'container % already has active yard_record at depot % enter_time %',
        p_container_id, v_active_depot, v_active_enter_time;
    end if;

    if v_active_depot is null then
      insert into public.yard_record(
        container_id,
        depot_id,
        enter_time,
        record_status,
        remark,
        created_by,
        updated_by
      )
      values(
        p_container_id,
        p_depot_id,
        p_enter_time,
        'IN_YARD',
        p_remark,
        p_operator_id,
        p_operator_id
      );
    end if;

    update public.container
    set lifecycle_stage = 'IN_YARD',
        status = p_status_after,
        current_depot_id = p_depot_id,
        current_transfer_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  if v_active_depot is not null then
    raise exception 'container % already has active yard_record at depot % enter_time %',
      p_container_id, v_active_depot, v_active_enter_time;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  insert into public.yard_record(
    container_id,
    depot_id,
    enter_time,
    record_status,
    remark,
    created_by,
    updated_by
  )
  values(
    p_container_id,
    p_depot_id,
    p_enter_time,
    'IN_YARD',
    p_remark,
    p_operator_id,
    p_operator_id
  );

  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = p_status_after,
      current_depot_id = p_depot_id,
      current_transfer_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    to_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark
  )
  values(
    p_container_id,
    'YARD_ENTER',
    p_business_type,
    p_business_id,
    p_depot_id,
    v_lifecycle_before,
    'IN_YARD',
    v_status_before,
    p_status_after,
    p_enter_time,
    p_operator_id,
    p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$;

create or replace function public.rpc_yard_exit(
  p_container_id uuid,
  p_depot_id uuid,
  p_exit_time timestamp with time zone default now(),
  p_operator_id uuid default null,
  p_operator_name text default null,
  p_business_type text default 'YARD',
  p_business_id uuid default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  if p_business_id is not null then
    select id
      into v_existing_event_id
    from public.container_event
    where container_id = p_container_id
      and is_void = false
      and business_type = p_business_type
      and business_id = p_business_id
      and event_type = 'YARD_EXIT'
    order by event_time desc, created_at desc
    limit 1;

    if v_existing_event_id is not null then
      update public.container
      set last_event_id = v_existing_event_id,
          updated_at = now(),
          updated_by = p_operator_id
      where id = p_container_id;

      return v_existing_event_id;
    end if;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.yard_record
  set exit_time = p_exit_time,
      record_status = 'EXITED',
      updated_by = p_operator_id,
      updated_at = now()
  where container_id = p_container_id
    and depot_id = p_depot_id
    and record_status = 'IN_YARD';

  if not found then
    raise exception 'active yard_record not found for container % at depot %', p_container_id, p_depot_id;
  end if;

  update public.container
  set current_depot_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id,
    event_type,
    business_type,
    business_id,
    from_depot_id,
    lifecycle_before,
    lifecycle_after,
    status_before,
    status_after,
    event_time,
    operator_id,
    operator_name,
    remark
  )
  values(
    p_container_id,
    'YARD_EXIT',
    p_business_type,
    p_business_id,
    p_depot_id,
    v_lifecycle_before,
    v_lifecycle_before,
    v_status_before,
    v_status_before,
    p_exit_time,
    p_operator_id,
    p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id = v_event_id,
      updated_at = now(),
      updated_by = p_operator_id
  where id = p_container_id;

  return v_event_id;
end;
$function$;
