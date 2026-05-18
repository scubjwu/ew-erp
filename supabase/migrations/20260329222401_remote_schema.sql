set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_transfer_in(p_transfer_order_id uuid, p_container_id uuid, p_arrival_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
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
begin
  perform public.lock_container(p_container_id);

  -- 幂等：同 business_id + event_type
  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
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

  -- 读取快照
  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
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

  -- transfer_item 必须存在
  insert into public.transfer_item(transfer_order_id, container_id, item_status, remark, created_at, updated_at)
  values (p_transfer_order_id, p_container_id, 'PLANNED', p_remark, now(), now())
  on conflict (transfer_order_id, container_id) do nothing;

  update public.transfer_item
  set item_status = 'ARRIVED',
      updated_at = now()
  where transfer_order_id = p_transfer_order_id
    and container_id = p_container_id;

  -- 更新 transfer_order 到达时间（首次写入）
  update public.transfer_order
  set arrival_time = coalesce(arrival_time, p_arrival_time),
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_transfer_order_id;

  -- 写事件 TRANSFER_IN（不改变 lifecycle/status）
  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    from_depot_id, to_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'TRANSFER_IN', 'TRANSFER', p_transfer_order_id,
    v_from_depot, v_to_depot,
    v_lifecycle_before, v_lifecycle_before,
    v_status_before, v_status_before,
    p_arrival_time, p_operator_id, p_operator_name,
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

CREATE OR REPLACE FUNCTION public.rpc_sale_deliver(p_sales_order_id uuid, p_container_id uuid, p_delivery_id uuid DEFAULT NULL::uuid, p_delivered_time timestamp with time zone DEFAULT now(), p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  -- 幂等：同 sales_order + container 的 SALE_DELIVERED 只能一次
  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_DELIVERED'
  order by event_time desc, created_at desc
  limit 1;

  -- 取客户
  select customer_id
    into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  if v_existing_event_id is not null then
    -- 重试时：把业务状态补齐到“已交付”
    update public.sales_item
    set item_status='DELIVERED',
        updated_at=now()
    where sales_order_id = p_sales_order_id
      and container_id = p_container_id;

    if p_delivery_id is not null then
      update public.sales_delivery
      set delivery_status='DELIVERED',
          delivery_date=coalesce(delivery_date, p_delivered_time),
          updated_by=p_operator_id,
          updated_at=now()
      where id = p_delivery_id
        and sales_order_id = p_sales_order_id;
    end if;

    update public.container
    set lifecycle_stage='SOLD',
        status='SOLD',
        current_sale_id=p_sales_order_id,
        current_customer_id=v_customer_id,
        current_transfer_id=null,
        current_lease_id=null,
        updated_by=p_operator_id,
        updated_at=now(),
        last_event_id=v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  -- 读取快照（for update）
  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  -- sales_item 必须存在并更新为 DELIVERED
  update public.sales_item
  set item_status='DELIVERED',
      updated_at=now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  -- delivery（可选）
  if p_delivery_id is not null then
    update public.sales_delivery
    set delivery_status='DELIVERED',
        delivery_date=coalesce(delivery_date, p_delivered_time),
        updated_by=p_operator_id,
        updated_at=now()
    where id = p_delivery_id
      and sales_order_id = p_sales_order_id;
  end if;

  -- 更新 container：交付完成才进入 SOLD
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

  -- 写事件（不会冲突）
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

CREATE OR REPLACE FUNCTION public.rpc_yard_enter(p_container_id uuid, p_depot_id uuid, p_enter_time timestamp with time zone DEFAULT now(), p_status_after text DEFAULT 'AVAILABLE'::text, p_operator_id uuid DEFAULT NULL::uuid, p_operator_name text DEFAULT NULL::text, p_business_type text DEFAULT 'YARD'::text, p_business_id uuid DEFAULT NULL::uuid, p_remark text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  -- 幂等优先：业务维度唯一（如果 business_id 不为空）
  if p_business_id is not null then
    select id into v_existing_event_id
    from public.container_event
    where container_id = p_container_id
      and business_type = p_business_type
      and business_id = p_business_id
      and event_type = 'YARD_ENTER'
    order by event_time desc, created_at desc
    limit 1;

    if v_existing_event_id is not null then
      -- 补齐快照
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
  end if;

  -- 弱幂等（business_id 为空时）：同 depot + 同 enter_time 不重复插 yard_record
  if p_business_id is null then
    if exists (
      select 1 from public.yard_record
      where container_id = p_container_id
        and depot_id = p_depot_id
        and enter_time = p_enter_time
        and record_status = 'IN_YARD'
    ) then
      -- 如果已经有同一条入场记录，尝试找最近一条 YARD_ENTER 事件返回（可能没有）
      select id into v_existing_event_id
      from public.container_event
      where container_id = p_container_id
        and event_type = 'YARD_ENTER'
        and to_depot_id = p_depot_id
        and event_time = p_enter_time
      order by created_at desc
      limit 1;

      if v_existing_event_id is not null then
        update public.container
        set lifecycle_stage='IN_YARD',
            status=p_status_after,
            current_depot_id=p_depot_id,
            current_transfer_id=null,
            updated_by=p_operator_id,
            updated_at=now(),
            last_event_id=v_existing_event_id
        where id=p_container_id;

        return v_existing_event_id;
      end if;
      -- 如果没有 event，就继续往下写 event（yard_record 不重复插）
    end if;
  end if;

  -- 读取快照（for update）
  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  -- 写在场记录（如果弱幂等命中则已存在，这里用 on conflict 不适用，因为没唯一键；我们用 exists 防重复）
  if not exists (
    select 1 from public.yard_record
    where container_id = p_container_id
      and depot_id = p_depot_id
      and enter_time = p_enter_time
      and record_status = 'IN_YARD'
  ) then
    insert into public.yard_record(
      container_id, depot_id, enter_time, record_status, remark, created_by, updated_by
    )
    values(
      p_container_id, p_depot_id, p_enter_time, 'IN_YARD', p_remark, p_operator_id, p_operator_id
    );
  end if;

  -- 更新 container 快照
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


