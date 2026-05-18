set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_lease_onhire(p_lease_contract_id uuid, p_container_id uuid, p_onhire_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id=p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  select customer_id into v_customer_id
  from public.lease_contract
  where id = p_lease_contract_id;

  if not found then
    raise exception 'lease_contract not found: %', p_lease_contract_id;
  end if;

  update public.lease_item
  set item_status='ONHIRE',
      updated_at=now()
  where lease_contract_id = p_lease_contract_id
    and container_id = p_container_id;

  if not found then
    raise exception 'lease_item not found for lease_contract % and container %', p_lease_contract_id, p_container_id;
  end if;

  update public.container
  set lifecycle_stage='LEASE',
      status='ONHIRE',
      current_lease_id=p_lease_contract_id,
      current_customer_id=v_customer_id,
      current_transfer_id=null,
      updated_by=p_operator_id,
      updated_at=now()
  where id=p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'LEASE_ONHIRE', 'LEASE', p_lease_contract_id,
    v_lifecycle_before, 'LEASE',
    v_status_before, 'ONHIRE',
    p_onhire_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id=v_event_id,
      updated_at=now(),
      updated_by=p_operator_id
  where id=p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_sale_deliver(p_sales_order_id uuid, p_container_id uuid, p_delivery_id uuid DEFAULT NULL::uuid, p_delivered_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  select customer_id
    into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  -- 更新 sales_item
  update public.sales_item
  set item_status='DELIVERED',
      updated_at=now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  -- 更新 delivery（如果传了）
  if p_delivery_id is not null then
    update public.sales_delivery
    set delivery_status='DELIVERED',
        delivery_date=coalesce(delivery_date, p_delivered_time),
        updated_by=p_operator_id,
        updated_at=now()
    where id = p_delivery_id
      and sales_order_id = p_sales_order_id;
  end if;

  -- 更新 container：现在才真正 SOLD
  update public.container
  set lifecycle_stage='SOLD',
      status='SOLD',
      current_sale_id=p_sales_order_id,
      current_customer_id=v_customer_id,
      current_transfer_id=null,
      current_lease_id=null,
      updated_by=p_operator_id,
      updated_at=now()
  where id = p_container_id;

  -- 写事件
  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'SALE_DELIVERED', 'SALE', p_sales_order_id,
    v_lifecycle_before, 'SOLD',
    v_status_before, 'SOLD',
    p_delivered_time, p_operator_id, p_operator_name,
    p_remark
  )
  returning id into v_event_id;

  update public.container
  set last_event_id=v_event_id,
      updated_at=now(),
      updated_by=p_operator_id
  where id=p_container_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_transfer_out(p_transfer_order_id uuid, p_container_id uuid, p_departure_time timestamp with time zone DEFAULT now(), p_status_after text DEFAULT 'EW_DEPOT_PENDING'::text, p_transit_business_type text DEFAULT 'EW_DEPOT'::text, p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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

  -- 幂等：如果该业务事件已存在，直接返回已有事件id（并可选补齐快照）
  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and business_type = 'TRANSFER'
    and business_id = p_transfer_order_id
    and event_type = 'TRANSFER_OUT'
  order by event_time desc, created_at desc
  limit 1;

  if v_existing_event_id is not null then
    -- 可选：为了保证重复调用也能把快照补齐到“已发出”
    -- 这里只做轻量补齐，不再写事件
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

  -- 读取当前快照
  select lifecycle_stage, status, current_depot_id
    into v_lifecycle_before, v_status_before, v_current_depot
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  -- 读取调运单
  select from_depot_id, to_depot_id
    into v_from_depot, v_to_depot
  from public.transfer_order
  where id = p_transfer_order_id;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  -- 强校验：必须在 from_depot 发出
  if v_from_depot is not null and v_current_depot is distinct from v_from_depot then
    raise exception 'container current_depot_id (%) not match transfer from_depot_id (%)', v_current_depot, v_from_depot;
  end if;

  -- 关闭在场记录
  update public.yard_record
  set exit_time = p_departure_time,
      record_status = 'EXITED',
      updated_by = p_operator_id,
      updated_at = now()
  where container_id = p_container_id
    and depot_id = v_from_depot
    and record_status = 'IN_YARD';

  -- 确保 transfer_item 存在，并更新为 IN_TRANSIT
  insert into public.transfer_item(transfer_order_id, container_id, item_status, remark, created_at, updated_at)
  values (p_transfer_order_id, p_container_id, 'PLANNED', p_remark, now(), now())
  on conflict (transfer_order_id, container_id) do nothing;

  update public.transfer_item
  set item_status = 'IN_TRANSIT',
      updated_at = now()
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id;

  -- 更新 transfer_order 状态
  update public.transfer_order
  set status = case when status = 'CREATED' then 'IN_TRANSIT' else status end,
      departure_time = coalesce(departure_time, p_departure_time),
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_transfer_order_id;

  -- 更新 container 快照
  update public.container
  set lifecycle_stage = 'IN_TRANSIT',
      status = p_status_after,
      transit_business_type = p_transit_business_type,
      current_transfer_id = p_transfer_order_id,
      current_depot_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  -- 写事件 TRANSFER_OUT（这次不会冲突）
  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    from_depot_id, to_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'TRANSFER_OUT', 'TRANSFER', p_transfer_order_id,
    v_from_depot, v_to_depot,
    v_lifecycle_before, 'IN_TRANSIT',
    v_status_before, p_status_after,
    p_departure_time, p_operator_id, p_operator_name,
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
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_yard_enter(p_container_id uuid, p_depot_id uuid, p_enter_time timestamp with time zone DEFAULT now(), p_status_after text DEFAULT 'AVAILABLE'::text, p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_business_type text DEFAULT 'YARD'::text, p_business_id uuid DEFAULT NULL::uuid, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  -- 写在场记录
  insert into public.yard_record(
    container_id, depot_id, enter_time, record_status, remark, created_by, updated_by
  )
  values(
    p_container_id, p_depot_id, p_enter_time, 'IN_YARD', p_remark, p_operator_id, p_operator_id
  );

  -- 更新箱子快照（入场后通常可用）
  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = p_status_after,
      current_depot_id = p_depot_id,
      current_transfer_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  -- 写事件
  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    to_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'YARD_ENTER', p_business_type, p_business_id,
    p_depot_id,
    v_lifecycle_before, 'IN_YARD',
    v_status_before, p_status_after,
    p_enter_time, p_operator_id, p_operator_name,
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
$function$
;


