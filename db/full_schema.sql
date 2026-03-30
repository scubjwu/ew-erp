


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce((select role from public.users where id = auth.uid()), 'Anonymous');
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_user_role() = 'Admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_container"("p_container_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  b bytea;
  k1 int;
  k2 int;
begin
  b := uuid_send(p_container_id);

  -- Build two 32-bit signed ints from the 16 UUID bytes
  k1 := (get_byte(b,0)<<24) | (get_byte(b,1)<<16) | (get_byte(b,2)<<8) | get_byte(b,3);
  k2 := (get_byte(b,4)<<24) | (get_byte(b,5)<<16) | (get_byte(b,6)<<8) | get_byte(b,7);

  perform pg_advisory_xact_lock(k1, k2);
end;
$$;


ALTER FUNCTION "public"."lock_container"("p_container_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_lease_offhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_return_depot_id" "uuid", "p_offhire_time" timestamp with time zone DEFAULT "now"(), "p_status_after" "text" DEFAULT 'AVAILABLE'::"text", "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'LEASE'
    and business_id = p_lease_contract_id
    and event_type = 'LEASE_OFFHIRE'
  order by event_time desc, created_at desc
  limit 1;

  if v_existing_event_id is not null then
    update public.lease_item
    set item_status = 'OFFHIRE',
        updated_by = p_operator_id,
        updated_at = now()
    where lease_contract_id = p_lease_contract_id
      and container_id = p_container_id;

    if not exists (
      select 1 from public.yard_record
      where container_id = p_container_id
        and depot_id = p_return_depot_id
        and enter_time = p_offhire_time
        and record_status = 'IN_YARD'
    ) then
      insert into public.yard_record(
        container_id, depot_id, enter_time, record_status,
        remark, created_by, updated_by
      )
      values(
        p_container_id, p_return_depot_id, p_offhire_time, 'IN_YARD',
        p_remark, p_operator_id, p_operator_id
      );
    end if;

    update public.container
    set lifecycle_stage = 'IN_YARD',
        status = p_status_after,
        current_depot_id = p_return_depot_id,
        current_lease_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
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
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'LEASE_OFFHIRE', 'LEASE', p_lease_contract_id,
    v_lifecycle_before, 'IN_YARD',
    v_status_before, p_status_after,
    p_offhire_time, p_operator_id, p_operator_name, p_remark
  )
  returning id into v_event_id;

  insert into public.yard_record(
    container_id, depot_id, enter_time, record_status,
    remark, created_by, updated_by
  )
  values(
    p_container_id, p_return_depot_id, p_offhire_time, 'IN_YARD',
    p_remark, p_operator_id, p_operator_id
  );

  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = p_status_after,
      current_depot_id = p_return_depot_id,
      current_lease_id = null,
      updated_by = p_operator_id,
      updated_at = now(),
      last_event_id = v_event_id
  where id = p_container_id;

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."rpc_lease_offhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_return_depot_id" "uuid", "p_offhire_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_lease_onhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_onhire_time" timestamp with time zone DEFAULT "now"(), "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'LEASE'
    and business_id = p_lease_contract_id
    and event_type = 'LEASE_ONHIRE'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id into v_customer_id
  from public.lease_contract
  where id = p_lease_contract_id;

  if not found then
    raise exception 'lease_contract not found: %', p_lease_contract_id;
  end if;

  if v_existing_event_id is not null then
    update public.lease_item
    set item_status = 'ONHIRE',
        updated_by = p_operator_id,
        updated_at = now()
    where lease_contract_id = p_lease_contract_id
      and container_id = p_container_id;

    update public.container
    set lifecycle_stage = 'LEASE',
        status = 'ONHIRE',
        current_lease_id = p_lease_contract_id,
        current_customer_id = v_customer_id,
        current_transfer_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
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

  update public.lease_item
  set item_status = 'ONHIRE',
      updated_by = p_operator_id,
      updated_at = now()
  where lease_contract_id = p_lease_contract_id
    and container_id = p_container_id;

  if not found then
    raise exception 'lease_item not found for lease_contract % and container %', p_lease_contract_id, p_container_id;
  end if;

  update public.container
  set lifecycle_stage = 'LEASE',
      status = 'ONHIRE',
      current_lease_id = p_lease_contract_id,
      current_customer_id = v_customer_id,
      current_transfer_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

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
  set last_event_id = v_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."rpc_lease_onhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_onhire_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_rebuild_container_snapshot"("p_container_id" "uuid", "p_operator_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_last_event_id uuid;
  v_lifecycle text;
  v_status text;
  v_business_type text;
  v_business_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;

  v_customer_id uuid;
  v_depot_id uuid;
begin
  perform public.lock_container(p_container_id);

  -- 1) pick latest non-void event as the snapshot source
  select id, lifecycle_after, status_after, business_type, business_id, from_depot_id, to_depot_id
    into v_last_event_id, v_lifecycle, v_status, v_business_type, v_business_id, v_from_depot, v_to_depot
  from public.container_event
  where container_id = p_container_id
    and is_void = false
  order by event_time desc, created_at desc
  limit 1;

  if v_last_event_id is null then
    raise exception 'no valid event for container: %', p_container_id;
  end if;

  -- 2) rebuild current_customer_id from the latest business doc
  v_customer_id := null;

  if v_business_type = 'LEASE' and v_business_id is not null then
    select customer_id into v_customer_id
    from public.lease_contract
    where id = v_business_id;

  elsif v_business_type = 'SALE' and v_business_id is not null then
    select customer_id into v_customer_id
    from public.sales_order
    where id = v_business_id;

  elsif v_business_type = 'TRANSFER' and v_business_id is not null then
    select customer_id into v_customer_id
    from public.transfer_order
    where id = v_business_id;
  end if;

  -- 3) rebuild current_depot_id
  v_depot_id := null;

  if v_lifecycle = 'IN_YARD' then
    -- Prefer the authoritative active yard_record (you have unique index enforcing single active row)
    select depot_id into v_depot_id
    from public.yard_record
    where container_id = p_container_id
      and record_status = 'IN_YARD'
    order by enter_time desc
    limit 1;

    -- Fallback: latest non-void YARD_ENTER event
    if v_depot_id is null then
      select to_depot_id into v_depot_id
      from public.container_event
      where container_id = p_container_id
        and is_void = false
        and event_type = 'YARD_ENTER'
      order by event_time desc, created_at desc
      limit 1;
    end if;

    -- Last fallback: whatever depot fields the last event carried
    v_depot_id := coalesce(v_depot_id, v_to_depot, v_from_depot);
  end if;

  -- 4) update core snapshot first (must satisfy chk_container_status_by_lifecycle)
  update public.container
  set lifecycle_stage = v_lifecycle,
      status = v_status,
      last_event_id = v_last_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  -- 5) refill current pointers
  update public.container
  set current_transfer_id = case when v_business_type='TRANSFER' then v_business_id else null end,
      current_sale_id     = case when v_business_type='SALE' then v_business_id else null end,
      current_lease_id    = case when v_business_type='LEASE' then v_business_id else null end,
      current_customer_id = v_customer_id,
      current_depot_id    = v_depot_id
  where id = p_container_id;

  return v_last_event_id;
end;
$$;


ALTER FUNCTION "public"."rpc_rebuild_container_snapshot"("p_container_id" "uuid", "p_operator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sale_contract"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_contracted_time" timestamp with time zone DEFAULT "now"(), "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_CONTRACTED'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  if v_existing_event_id is not null then
    update public.sales_item
    set item_status='CONTRACTED',
        updated_by=p_operator_id,
        updated_at=now()
    where sales_order_id = p_sales_order_id
      and container_id = p_container_id;

    update public.container
    set current_sale_id = p_sales_order_id,
        current_customer_id = v_customer_id,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id=p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  update public.sales_item
  set item_status='CONTRACTED',
      updated_by=p_operator_id,
      updated_at=now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  update public.container
  set current_sale_id = p_sales_order_id,
      current_customer_id = v_customer_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'SALE_CONTRACTED', 'SALE', p_sales_order_id,
    v_lifecycle_before, v_lifecycle_before,
    v_status_before, v_status_before,
    p_contracted_time, p_operator_id, p_operator_name,
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
$$;


ALTER FUNCTION "public"."rpc_sale_contract"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_contracted_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sale_deliver"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_delivery_id" "uuid" DEFAULT NULL::"uuid", "p_delivered_time" timestamp with time zone DEFAULT "now"(), "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_customer_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  -- idempotency: only consider non-void SALE_DELIVERED
  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'SALE'
    and business_id = p_sales_order_id
    and event_type = 'SALE_DELIVERED'
  order by event_time desc, created_at desc
  limit 1;

  select customer_id into v_customer_id
  from public.sales_order
  where id = p_sales_order_id;

  if not found then
    raise exception 'sales_order not found: %', p_sales_order_id;
  end if;

  if v_existing_event_id is not null then
    -- retry: repair side effects + snapshot
    update public.sales_item
    set item_status = 'DELIVERED',
        updated_by = p_operator_id,
        updated_at = now()
    where sales_order_id = p_sales_order_id
      and container_id = p_container_id;

    if p_delivery_id is not null then
      update public.sales_delivery
      set delivery_status = 'DELIVERED',
          delivery_date = coalesce(delivery_date, p_delivered_time),
          updated_by = p_operator_id,
          updated_at = now()
      where id = p_delivery_id
        and sales_order_id = p_sales_order_id;
    end if;

    update public.container
    set lifecycle_stage = 'SOLD',
        status = 'SOLD',
        current_sale_id = p_sales_order_id,
        current_customer_id = v_customer_id,
        current_transfer_id = null,
        current_lease_id = null,
        updated_by = p_operator_id,
        updated_at = now(),
        last_event_id = v_existing_event_id
    where id = p_container_id;

    return v_existing_event_id;
  end if;

  -- lock current snapshot
  select lifecycle_stage, status
    into v_lifecycle_before, v_status_before
  from public.container
  where id = p_container_id
  for update;

  if not found then
    raise exception 'container not found: %', p_container_id;
  end if;

  -- sales_item must exist
  update public.sales_item
  set item_status = 'DELIVERED',
      updated_by = p_operator_id,
      updated_at = now()
  where sales_order_id = p_sales_order_id
    and container_id = p_container_id;

  if not found then
    raise exception 'sales_item not found for sales_order % and container %', p_sales_order_id, p_container_id;
  end if;

  -- delivery optional
  if p_delivery_id is not null then
    update public.sales_delivery
    set delivery_status = 'DELIVERED',
        delivery_date = coalesce(delivery_date, p_delivered_time),
        updated_by = p_operator_id,
        updated_at = now()
    where id = p_delivery_id
      and sales_order_id = p_sales_order_id;
  end if;

  -- now truly SOLD
  update public.container
  set lifecycle_stage = 'SOLD',
      status = 'SOLD',
      current_sale_id = p_sales_order_id,
      current_customer_id = v_customer_id,
      current_transfer_id = null,
      current_lease_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

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
  set last_event_id = v_event_id,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  return v_event_id;
end;
$$;


ALTER FUNCTION "public"."rpc_sale_deliver"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_delivery_id" "uuid", "p_delivered_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sale_fail"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_failed_time" timestamp with time zone DEFAULT "now"(), "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_contracted_event_id uuid;
begin
  perform public.lock_container(p_container_id);

  -- must have a non-void contracted event
  select id into v_contracted_event_id
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

  -- clear bindings (do not change lifecycle/status)
  update public.container
  set current_sale_id = null,
      current_customer_id = null,
      updated_by = p_operator_id,
      updated_at = now(),
      last_event_id = v_contracted_event_id
  where id = p_container_id;

  -- annotate contracted event (no new event to avoid uniqueness conflict)
  update public.container_event
  set remark = coalesce(remark,'')
              || ' | SALE FAILED at ' || p_failed_time::text
              || ' reason=' || coalesce(p_reason,''),
      operator_id = coalesce(operator_id, p_operator_id),
      operator_name = coalesce(operator_name, p_operator_name)
  where id = v_contracted_event_id;
end;
$$;


ALTER FUNCTION "public"."rpc_sale_fail"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_failed_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_transfer_cancel_item"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.lock_container(p_container_id);

  update public.transfer_item
  set item_status='CANCELLED',
      updated_by=p_operator_id,
      updated_at=now()
  where transfer_order_id=p_transfer_order_id
    and container_id=p_container_id;

  if not found then
    raise exception 'transfer_item not found for transfer_order % and container %', p_transfer_order_id, p_container_id;
  end if;

  update public.transfer_item
  set remark = coalesce(remark,'') || ' | CANCEL reason=' || coalesce(p_reason,''),
      updated_by=p_operator_id,
      updated_at=now()
  where transfer_order_id=p_transfer_order_id
    and container_id=p_container_id;

  update public.container
  set current_transfer_id = case when current_transfer_id = p_transfer_order_id then null else current_transfer_id end,
      updated_by=p_operator_id,
      updated_at=now()
  where id=p_container_id;
end;
$$;


ALTER FUNCTION "public"."rpc_transfer_cancel_item"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_operator_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_transfer_complete_if_all_arrived"("p_transfer_order_id" "uuid", "p_complete_time" timestamp with time zone DEFAULT "now"(), "p_operator_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_remaining int;
  v_current_status text;
  b bytea;
  k1 int;
  k2 int;
begin
  b := uuid_send(p_transfer_order_id);
  k1 := (get_byte(b,0)<<24) | (get_byte(b,1)<<16) | (get_byte(b,2)<<8) | get_byte(b,3);
  k2 := (get_byte(b,4)<<24) | (get_byte(b,5)<<16) | (get_byte(b,6)<<8) | get_byte(b,7);
  perform pg_advisory_xact_lock(k1, k2);

  select status into v_current_status
  from public.transfer_order
  where id = p_transfer_order_id
  for update;

  if not found then
    raise exception 'transfer_order not found: %', p_transfer_order_id;
  end if;

  if v_current_status in ('COMPLETED', 'CANCELLED') then
    return false;
  end if;

  select count(*) into v_remaining
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
$$;


ALTER FUNCTION "public"."rpc_transfer_complete_if_all_arrived"("p_transfer_order_id" "uuid", "p_complete_time" timestamp with time zone, "p_operator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_transfer_in"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_arrival_time" timestamp with time zone DEFAULT "now"(), "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_from_depot uuid;
  v_to_depot uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  select id into v_existing_event_id
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

  insert into public.transfer_item(
    transfer_order_id, container_id, item_status, remark,
    created_by, updated_by, created_at, updated_at
  )
  values (p_transfer_order_id, p_container_id, 'PLANNED', p_remark, p_operator_id, p_operator_id, now(), now())
  on conflict (transfer_order_id, container_id) do nothing;

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
$$;


ALTER FUNCTION "public"."rpc_transfer_in"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_arrival_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_transfer_out"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_departure_time" timestamp with time zone DEFAULT "now"(), "p_status_after" "text" DEFAULT 'EW_DEPOT_PENDING'::"text", "p_transit_business_type" "text" DEFAULT 'EW_DEPOT'::"text", "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  select id into v_existing_event_id
  from public.container_event
  where container_id = p_container_id
    and is_void = false
    and business_type = 'TRANSFER'
    and business_id = p_transfer_order_id
    and event_type = 'TRANSFER_OUT'
  order by event_time desc, created_at desc
  limit 1;

  if v_existing_event_id is not null then
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

  if v_from_depot is not null and v_current_depot is distinct from v_from_depot then
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

  insert into public.transfer_item(
    transfer_order_id, container_id, item_status, remark,
    created_by, updated_by, created_at, updated_at
  )
  values (
    p_transfer_order_id, p_container_id, 'PLANNED', p_remark,
    p_operator_id, p_operator_id, now(), now()
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
$$;


ALTER FUNCTION "public"."rpc_transfer_out"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_departure_time" timestamp with time zone, "p_status_after" "text", "p_transit_business_type" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_void_container_event"("p_event_id" "uuid", "p_reason" "text", "p_operator_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_container_id uuid;
begin
  select container_id into v_container_id
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

  -- 幂等：如果已经 void，直接返回
  if not found then
    return p_event_id;
  end if;

  -- 重建快照回滚
  perform public.rpc_rebuild_container_snapshot(v_container_id, p_operator_id);

  return p_event_id;
end;
$$;


ALTER FUNCTION "public"."rpc_void_container_event"("p_event_id" "uuid", "p_reason" "text", "p_operator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_yard_enter"("p_container_id" "uuid", "p_depot_id" "uuid", "p_enter_time" timestamp with time zone DEFAULT "now"(), "p_status_after" "text" DEFAULT 'AVAILABLE'::"text", "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_business_type" "text" DEFAULT 'YARD'::"text", "p_business_id" "uuid" DEFAULT NULL::"uuid", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  if p_business_id is not null then
    select id into v_existing_event_id
    from public.container_event
    where container_id = p_container_id
      and is_void = false
      and business_type = p_business_type
      and business_id = p_business_id
      and event_type = 'YARD_ENTER'
    order by event_time desc, created_at desc
    limit 1;

    if v_existing_event_id is not null then
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

  -- (弱幂等保持不动，但 event 查询也加 is_void=false)
  if p_business_id is null then
    if exists (
      select 1 from public.yard_record
      where container_id = p_container_id
        and depot_id = p_depot_id
        and enter_time = p_enter_time
        and record_status = 'IN_YARD'
    ) then
      select id into v_existing_event_id
      from public.container_event
      where container_id = p_container_id
        and is_void = false
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

  update public.container
  set lifecycle_stage = 'IN_YARD',
      status = p_status_after,
      current_depot_id = p_depot_id,
      current_transfer_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

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
$$;


ALTER FUNCTION "public"."rpc_yard_enter"("p_container_id" "uuid", "p_depot_id" "uuid", "p_enter_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_yard_exit"("p_container_id" "uuid", "p_depot_id" "uuid", "p_exit_time" timestamp with time zone DEFAULT "now"(), "p_operator_id" "uuid" DEFAULT NULL::"uuid", "p_operator_name" "text" DEFAULT NULL::"text", "p_business_type" "text" DEFAULT 'YARD'::"text", "p_business_id" "uuid" DEFAULT NULL::"uuid", "p_remark" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_event_id uuid;
  v_existing_event_id uuid;
  v_lifecycle_before text;
  v_status_before text;
begin
  perform public.lock_container(p_container_id);

  if p_business_id is not null then
    select id into v_existing_event_id
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

  update public.container
  set current_depot_id = null,
      updated_by = p_operator_id,
      updated_at = now()
  where id = p_container_id;

  insert into public.container_event(
    container_id, event_type, business_type, business_id,
    from_depot_id,
    lifecycle_before, lifecycle_after,
    status_before, status_after,
    event_time, operator_id, operator_name,
    remark
  )
  values(
    p_container_id, 'YARD_EXIT', p_business_type, p_business_id,
    p_depot_id,
    v_lifecycle_before, v_lifecycle_before,
    v_status_before, v_status_before,
    p_exit_time, p_operator_id, p_operator_name,
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
$$;


ALTER FUNCTION "public"."rpc_yard_exit"("p_container_id" "uuid", "p_depot_id" "uuid", "p_exit_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."business_cost" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_type" "text" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "container_id" "uuid",
    "cost_type" "text",
    "amount" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "occur_date" "date" NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cost_code_id" "uuid",
    "base_currency_amount" numeric(14,2) DEFAULT 0,
    CONSTRAINT "business_cost_business_type_check" CHECK (("business_type" = ANY (ARRAY['PURCHASE'::"text", 'TRANSFER'::"text", 'YARD'::"text", 'LEASE'::"text", 'SALE'::"text"]))),
    CONSTRAINT "chk_business_cost_base_currency" CHECK ((("currency" = 'USD'::"text") OR ("base_currency_amount" <> (0)::numeric))),
    CONSTRAINT "chk_business_cost_type_or_code" CHECK ((("cost_code_id" IS NOT NULL) OR ("cost_type" IS NOT NULL)))
);


ALTER TABLE "public"."business_cost" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_invoice" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_type" "text" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "invoice_type" "text" NOT NULL,
    "invoice_no" "text" NOT NULL,
    "invoice_date" "date",
    "amount" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "invoice_status" "text" NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "business_invoice_business_type_check" CHECK (("business_type" = ANY (ARRAY['PURCHASE'::"text", 'TRANSFER'::"text", 'YARD'::"text", 'LEASE'::"text", 'SALE'::"text"]))),
    CONSTRAINT "business_invoice_invoice_status_check" CHECK (("invoice_status" = ANY (ARRAY['DRAFT'::"text", 'ISSUED'::"text", 'VOID'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "business_invoice_invoice_type_check" CHECK (("invoice_type" = ANY (ARRAY['PAYABLE'::"text", 'RECEIVABLE'::"text"])))
);


ALTER TABLE "public"."business_invoice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_invoice_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "revenue_id" "uuid",
    "cost_id" "uuid",
    "billed_amount" numeric(14,2) NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_invoice_item_one_side" CHECK (((("revenue_id" IS NOT NULL) AND ("cost_id" IS NULL)) OR (("revenue_id" IS NULL) AND ("cost_id" IS NOT NULL))))
);


ALTER TABLE "public"."business_invoice_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_revenue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_type" "text" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "container_id" "uuid",
    "revenue_type" "text",
    "amount" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "occur_date" "date" NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revenue_code_id" "uuid",
    "base_currency_amount" numeric(14,2) DEFAULT 0,
    CONSTRAINT "business_revenue_business_type_check" CHECK (("business_type" = ANY (ARRAY['PURCHASE'::"text", 'TRANSFER'::"text", 'YARD'::"text", 'LEASE'::"text", 'SALE'::"text"]))),
    CONSTRAINT "chk_business_revenue_base_currency" CHECK ((("currency" = 'USD'::"text") OR ("base_currency_amount" <> (0)::numeric))),
    CONSTRAINT "chk_business_revenue_type_or_code" CHECK ((("revenue_code_id" IS NOT NULL) OR ("revenue_type" IS NOT NULL)))
);


ALTER TABLE "public"."business_revenue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city_code" "text" NOT NULL,
    "city_name" "text" NOT NULL,
    "state" "text",
    "country" "text" NOT NULL,
    "region" "text",
    "cma_city_code" "text",
    "oocl_city_code" "text",
    "hmm_city_code" "text",
    "zim_city_code" "text",
    "msk_city_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pic_id" "uuid"
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."container" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "container_number" "text" NOT NULL,
    "color" "text",
    "machine_type" "text",
    "flp" boolean DEFAULT false NOT NULL,
    "lbx" boolean DEFAULT false NOT NULL,
    "locking_bars" boolean DEFAULT false NOT NULL,
    "vents" boolean DEFAULT false NOT NULL,
    "manufacture_date" "date",
    "owner_type" "text" NOT NULL,
    "owner_id" "uuid",
    "lifecycle_stage" "text" NOT NULL,
    "status" "text" NOT NULL,
    "transit_business_type" "text",
    "current_depot_id" "uuid",
    "current_customer_id" "uuid",
    "current_transfer_id" "uuid",
    "current_lease_id" "uuid",
    "current_sale_id" "uuid",
    "last_event_id" "uuid",
    "purchase_date" "date",
    "purchase_price" numeric(14,2),
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "container_type_code_id" "uuid" NOT NULL,
    "container_condition_code_id" "uuid",
    "container_size_code_id" "uuid" NOT NULL,
    "book_value" numeric(14,2) DEFAULT 0,
    CONSTRAINT "chk_container_status_by_lifecycle" CHECK (((("lifecycle_stage" = 'IN_YARD'::"text") AND ("status" = ANY (ARRAY['AVAILABLE'::"text", 'MNR'::"text", 'RESERVED'::"text", 'HOLD'::"text"]))) OR (("lifecycle_stage" = 'IN_TRANSIT'::"text") AND ("status" = ANY (ARRAY['ONHIRE_IN_TRANSIT'::"text", 'GATEBUY_PENDING'::"text", 'EW_DEPOT_PENDING'::"text", 'MISUSE'::"text", 'THIRD_PARTY_TRANSIT'::"text"]))) OR (("lifecycle_stage" = 'LEASE'::"text") AND ("status" = ANY (ARRAY['ONHIRE'::"text", 'OVERDUE'::"text"]))) OR (("lifecycle_stage" = 'SOLD'::"text") AND ("status" = 'SOLD'::"text")) OR (("lifecycle_stage" = 'TOTAL_LOSS'::"text") AND ("status" = 'TOTAL_LOSS'::"text")))),
    CONSTRAINT "container_lifecycle_stage_check" CHECK (("lifecycle_stage" = ANY (ARRAY['IN_YARD'::"text", 'IN_TRANSIT'::"text", 'LEASE'::"text", 'SOLD'::"text", 'TOTAL_LOSS'::"text"]))),
    CONSTRAINT "container_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['OWN'::"text", 'LEASED'::"text"]))),
    CONSTRAINT "container_transit_business_type_check" CHECK (("transit_business_type" = ANY (ARRAY['ONE_WAY_LEASE'::"text", 'GATEBUY'::"text", 'EW_DEPOT'::"text", 'MISUSE'::"text", 'THIRD_PARTY'::"text"])))
);


ALTER TABLE "public"."container" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."container_condition_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition_code" "text" NOT NULL,
    "condition_name" "text" NOT NULL,
    "sort_order" integer DEFAULT 999 NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "container_condition_codes_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."container_condition_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."container_event" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "container_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_sub_type" "text",
    "business_type" "text",
    "business_id" "uuid",
    "from_depot_id" "uuid",
    "to_depot_id" "uuid",
    "lifecycle_before" "text",
    "lifecycle_after" "text",
    "status_before" "text",
    "status_after" "text",
    "event_time" timestamp with time zone NOT NULL,
    "operator_id" "uuid",
    "operator_name" "text",
    "amount" numeric(14,2),
    "currency" "text" DEFAULT 'USD'::"text",
    "remark" "text",
    "extra_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_void" boolean DEFAULT false NOT NULL,
    "voided_by" "uuid",
    "voided_at" timestamp with time zone,
    "void_reason" "text",
    CONSTRAINT "container_event_business_type_check" CHECK (("business_type" = ANY (ARRAY['PURCHASE'::"text", 'TRANSFER'::"text", 'YARD'::"text", 'LEASE'::"text", 'SALE'::"text", 'REPAIR'::"text", 'OTHER'::"text"]))),
    CONSTRAINT "container_event_event_type_check" CHECK (("event_type" = ANY (ARRAY['PURCHASE'::"text", 'YARD_ENTER'::"text", 'YARD_EXIT'::"text", 'TRANSFER_OUT'::"text", 'TRANSFER_IN'::"text", 'LEASE_ONHIRE'::"text", 'LEASE_OFFHIRE'::"text", 'SALE_CONTRACTED'::"text", 'SALE_DELIVERED'::"text", 'TOTAL_LOSS'::"text", 'REPAIR'::"text", 'SCRAP'::"text"])))
);


ALTER TABLE "public"."container_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."container_number_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prefix" "text" NOT NULL,
    "serial_length" integer NOT NULL,
    "start_serial" integer DEFAULT 0 NOT NULL,
    "end_serial" integer NOT NULL,
    "current_serial" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "example_container_number" "text",
    "remark" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "container_size_code_id" "uuid" NOT NULL,
    CONSTRAINT "chk_container_number_rules_current" CHECK ((("current_serial" >= "start_serial") AND ("current_serial" <= "end_serial"))),
    CONSTRAINT "chk_container_number_rules_range" CHECK (("end_serial" >= "start_serial")),
    CONSTRAINT "container_number_rules_serial_length_check" CHECK (("serial_length" > 0)),
    CONSTRAINT "container_number_rules_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."container_number_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."container_size_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "size_code" "text" NOT NULL,
    "remark" "text",
    "sort_order" integer DEFAULT 999 NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "container_size_codes_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."container_size_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."container_type_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type_code" "text" NOT NULL,
    "remark" "text",
    "sort_order" integer DEFAULT 999 NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "container_type_codes_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."container_type_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cost_code" "text" NOT NULL,
    "cost_name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 999 NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cost_codes_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."cost_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "customer_grade" "text" DEFAULT 'C'::"text",
    "status" "text" DEFAULT 'Normal'::"text" NOT NULL,
    "contact_phone" "text",
    "finance_emails" "text"[] DEFAULT '{}'::"text"[],
    "ops_emails" "text"[] DEFAULT '{}'::"text"[],
    "purchasing_emails" "text"[] DEFAULT '{}'::"text"[],
    "credit_limit" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "credit_term_days" integer DEFAULT 3 NOT NULL,
    "depot_info" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "customer_custom_id" "text",
    "address" "text",
    "notes" "text",
    "assigned_sales_id" "uuid"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."depots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "depot_code" "text" NOT NULL,
    "depot_name" "text" NOT NULL,
    "region" "text",
    "depot_type" "text",
    "working_hour" "text",
    "depot_address" "text",
    "contact_person" "text",
    "contact_email" "text",
    "account_email" "text",
    "depot_tel" "text",
    "currency" "text" DEFAULT 'USD'::"text",
    "gate_in_out_cost" numeric(12,2) DEFAULT 0.00,
    "lift_in_out_cost" numeric(12,2) DEFAULT 0.00,
    "storage_rate_20" numeric(12,2) DEFAULT 0.00,
    "storage_rate_40" numeric(12,2) DEFAULT 0.00,
    "storage_rate_45" numeric(12,2) DEFAULT 0.00,
    "storage_rate_53" numeric(12,2) DEFAULT 0.00,
    "free_days" integer DEFAULT 0,
    "digging_cost" numeric(12,2) DEFAULT 0.00,
    "pti_cost" numeric(12,2) DEFAULT 0.00,
    "labour_cost" numeric(12,2) DEFAULT 0.00,
    "min_repair_cost" numeric(12,2) DEFAULT 0.00,
    "survey_cost" numeric(12,2) DEFAULT 0.00,
    "inspection_cost" numeric(12,2) DEFAULT 0.00,
    "est_recovery_fee" numeric(12,2) DEFAULT 0.00,
    "remark1" "text",
    "remark2" "text",
    "remark3" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "city_id" "uuid"
);


ALTER TABLE "public"."depots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finance_record" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_type" "text" NOT NULL,
    "business_id" "uuid" NOT NULL,
    "record_type" "text" NOT NULL,
    "counterparty_type" "text",
    "counterparty_id" "uuid",
    "amount" numeric(14,2) NOT NULL,
    "paid_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "due_date" "date",
    "paid_date" "date",
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_id" "uuid",
    "base_currency_amount" numeric(14,2) DEFAULT 0,
    CONSTRAINT "chk_finance_record_base_currency" CHECK ((("currency" = 'USD'::"text") OR ("base_currency_amount" <> (0)::numeric))),
    CONSTRAINT "finance_record_business_type_check" CHECK (("business_type" = ANY (ARRAY['PURCHASE'::"text", 'TRANSFER'::"text", 'YARD'::"text", 'LEASE'::"text", 'SALE'::"text"]))),
    CONSTRAINT "finance_record_counterparty_type_check" CHECK ((("counterparty_type" IS NULL) OR ("counterparty_type" = ANY (ARRAY['SUPPLIER'::"text", 'CUSTOMER'::"text", 'DEPOT'::"text", 'VENDOR'::"text", 'OTHER'::"text"])))),
    CONSTRAINT "finance_record_record_type_check" CHECK (("record_type" = ANY (ARRAY['PAYABLE'::"text", 'RECEIVABLE'::"text"]))),
    CONSTRAINT "finance_record_status_check" CHECK (("status" = ANY (ARRAY['UNPAID'::"text", 'PARTIAL'::"text", 'PAID'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."finance_record" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lease_bill" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lease_contract_id" "uuid" NOT NULL,
    "bill_no" "text" NOT NULL,
    "bill_start_date" "date" NOT NULL,
    "bill_end_date" "date" NOT NULL,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "bill_status" "text" NOT NULL,
    "due_date" "date",
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lease_bill_bill_status_check" CHECK (("bill_status" = ANY (ARRAY['DRAFT'::"text", 'ISSUED'::"text", 'PARTIAL_PAID'::"text", 'PAID'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."lease_bill" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lease_bill_detail" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bill_id" "uuid" NOT NULL,
    "lease_item_id" "uuid" NOT NULL,
    "billed_start_date" "date" NOT NULL,
    "billed_end_date" "date" NOT NULL,
    "billed_days" integer NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lease_bill_detail" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lease_contract" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_no" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "status" "text" NOT NULL,
    "settlement_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lease_contract_status_check" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'ACTIVE'::"text", 'FINISHED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."lease_contract" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lease_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lease_contract_id" "uuid" NOT NULL,
    "container_id" "uuid" NOT NULL,
    "rent_price_per_day" numeric(14,2) DEFAULT 0 NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "item_status" "text" NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "lease_item_item_status_check" CHECK (("item_status" = ANY (ARRAY['ONHIRE'::"text", 'OFFHIRE'::"text", 'OVERDUE'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."lease_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_no" "text" NOT NULL,
    "purchase_type" "text" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "depot_id" "uuid",
    "liner_company" "text",
    "business_owner_id" "uuid",
    "purchase_date" "date" NOT NULL,
    "estimated_offline_date" "date",
    "settlement_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "exchange_rate" numeric(14,6) DEFAULT 1 NOT NULL,
    "total_amount_payable" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_amount_paid" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_amount_unpaid" numeric(14,2) DEFAULT 0 NOT NULL,
    "order_status" "text" NOT NULL,
    "offline_status" "text" DEFAULT 'NOT_STARTED'::"text" NOT NULL,
    "inbound_status" "text" DEFAULT 'NOT_STARTED'::"text" NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "purchase_order_inbound_status_check" CHECK (("inbound_status" = ANY (ARRAY['NOT_STARTED'::"text", 'PARTIAL'::"text", 'COMPLETED'::"text"]))),
    CONSTRAINT "purchase_order_offline_status_check" CHECK (("offline_status" = ANY (ARRAY['NOT_STARTED'::"text", 'PARTIAL'::"text", 'COMPLETED'::"text"]))),
    CONSTRAINT "purchase_order_order_status_check" CHECK (("order_status" = ANY (ARRAY['DRAFT'::"text", 'CONFIRMED'::"text", 'PARTIAL_RECEIVED'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "purchase_order_purchase_type_check" CHECK (("purchase_type" = ANY (ARRAY['FACTORY_ORDER'::"text", 'USED_CONTAINER'::"text"])))
);


ALTER TABLE "public"."purchase_order" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_container" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid" NOT NULL,
    "purchase_order_item_id" "uuid" NOT NULL,
    "container_id" "uuid",
    "container_number" "text",
    "country_code" "text",
    "depot_id" "uuid",
    "estimated_offline_time" timestamp with time zone,
    "actual_offline_time" timestamp with time zone,
    "inbound_time" timestamp with time zone,
    "item_status" "text" NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "container_type_code_id" "uuid",
    "container_condition_code_id" "uuid",
    "container_size_code_id" "uuid",
    CONSTRAINT "purchase_order_container_item_status_check" CHECK (("item_status" = ANY (ARRAY['PLANNED'::"text", 'BOX_NO_ASSIGNED'::"text", 'OFFLINED'::"text", 'INBOUND'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."purchase_order_container" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid" NOT NULL,
    "line_no" integer NOT NULL,
    "color" "text",
    "manufacture_date" "date",
    "machine_type" "text",
    "planned_qty" integer NOT NULL,
    "unit_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "operation_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "settlement_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "line_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "flp" boolean DEFAULT false NOT NULL,
    "lbx" boolean DEFAULT false NOT NULL,
    "locking_bars" boolean DEFAULT false NOT NULL,
    "vents" boolean DEFAULT false NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "container_type_code_id" "uuid",
    "container_condition_code_id" "uuid",
    "container_size_code_id" "uuid",
    CONSTRAINT "purchase_order_item_planned_qty_check" CHECK (("planned_qty" >= 0))
);


ALTER TABLE "public"."purchase_order_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revenue_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "revenue_code" "text" NOT NULL,
    "revenue_name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 999 NOT NULL,
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "revenue_codes_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."revenue_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_delivery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sales_order_id" "uuid" NOT NULL,
    "delivery_no" "text",
    "delivery_date" timestamp with time zone,
    "delivery_depot_id" "uuid",
    "delivery_status" "text" NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sales_delivery_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['PLANNED'::"text", 'IN_TRANSIT'::"text", 'DELIVERED'::"text", 'FAILED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."sales_delivery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sales_order_id" "uuid" NOT NULL,
    "container_id" "uuid" NOT NULL,
    "unit_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "item_status" "text" NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "sales_item_item_status_check" CHECK (("item_status" = ANY (ARRAY['CONTRACTED'::"text", 'IN_DELIVERY'::"text", 'DELIVERED'::"text", 'FAILED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."sales_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_order" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_no" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "sale_date" "date" NOT NULL,
    "settlement_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "exchange_rate" numeric(14,6) DEFAULT 1 NOT NULL,
    "status" "text" NOT NULL,
    "total_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sales_order_status_check" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'CONTRACTED'::"text", 'PARTIAL_DELIVERED'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."sales_order" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_code" "text" NOT NULL,
    "supplier_name" "text" NOT NULL,
    "status" "text" DEFAULT 'NORMAL'::"text" NOT NULL,
    "contact_person" "text",
    "contact_phone" "text",
    "contact_email" "text",
    "finance_emails" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "purchasing_emails" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "address" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "payment_term_days" integer DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "suppliers_status_check" CHECK (("status" = ANY (ARRAY['NORMAL'::"text", 'HOLD'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transfer_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_order_id" "uuid" NOT NULL,
    "container_id" "uuid" NOT NULL,
    "item_status" "text" NOT NULL,
    "remark" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "transfer_item_item_status_check" CHECK (("item_status" = ANY (ARRAY['PLANNED'::"text", 'IN_TRANSIT'::"text", 'ARRIVED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."transfer_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transfer_order" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_no" "text" NOT NULL,
    "transfer_type" "text",
    "from_depot_id" "uuid",
    "to_depot_id" "uuid",
    "customer_id" "uuid",
    "status" "text" NOT NULL,
    "departure_time" timestamp with time zone,
    "arrival_time" timestamp with time zone,
    "total_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_revenue" numeric(14,2) DEFAULT 0 NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transfer_order_status_check" CHECK (("status" = ANY (ARRAY['CREATED'::"text", 'IN_TRANSIT'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "transfer_order_transfer_type_check" CHECK (("transfer_type" = ANY (ARRAY['NORMAL'::"text", 'ONE_WAY_LEASE'::"text", 'REPOSITION'::"text", 'THIRD_PARTY'::"text"])))
);


ALTER TABLE "public"."transfer_order" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'Sales'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_container_event" AS
 SELECT "id",
    "container_id",
    "event_type",
    "event_sub_type",
    "business_type",
    "business_id",
    "from_depot_id",
    "to_depot_id",
    "lifecycle_before",
    "lifecycle_after",
    "status_before",
    "status_after",
    "event_time",
    "operator_id",
    "operator_name",
    "amount",
    "currency",
    "remark",
    "extra_data",
    "created_at",
    "is_void",
    "voided_by",
    "voided_at",
    "void_reason"
   FROM "public"."container_event"
  WHERE ("is_void" = false);


ALTER VIEW "public"."v_container_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yard_record" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "container_id" "uuid" NOT NULL,
    "depot_id" "uuid" NOT NULL,
    "enter_time" timestamp with time zone NOT NULL,
    "exit_time" timestamp with time zone,
    "record_status" "text" NOT NULL,
    "remark" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "yard_record_record_status_check" CHECK (("record_status" = ANY (ARRAY['IN_YARD'::"text", 'EXITED'::"text"])))
);


ALTER TABLE "public"."yard_record" OWNER TO "postgres";


ALTER TABLE ONLY "public"."business_cost"
    ADD CONSTRAINT "business_cost_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_invoice_item"
    ADD CONSTRAINT "business_invoice_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_invoice"
    ADD CONSTRAINT "business_invoice_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_revenue"
    ADD CONSTRAINT "business_revenue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_city_code_key" UNIQUE ("city_code");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."container_condition_codes"
    ADD CONSTRAINT "container_condition_codes_condition_code_key" UNIQUE ("condition_code");



ALTER TABLE ONLY "public"."container_condition_codes"
    ADD CONSTRAINT "container_condition_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_container_number_key" UNIQUE ("container_number");



ALTER TABLE ONLY "public"."container_event"
    ADD CONSTRAINT "container_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."container_number_rules"
    ADD CONSTRAINT "container_number_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."container_size_codes"
    ADD CONSTRAINT "container_size_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."container_size_codes"
    ADD CONSTRAINT "container_size_codes_size_code_key" UNIQUE ("size_code");



ALTER TABLE ONLY "public"."container_type_codes"
    ADD CONSTRAINT "container_type_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."container_type_codes"
    ADD CONSTRAINT "container_type_codes_type_code_key" UNIQUE ("type_code");



ALTER TABLE ONLY "public"."cost_codes"
    ADD CONSTRAINT "cost_codes_cost_code_key" UNIQUE ("cost_code");



ALTER TABLE ONLY "public"."cost_codes"
    ADD CONSTRAINT "cost_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_company_name_key" UNIQUE ("company_name");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_customer_custom_id_key" UNIQUE ("customer_custom_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."depots"
    ADD CONSTRAINT "depots_depot_code_key" UNIQUE ("depot_code");



ALTER TABLE ONLY "public"."depots"
    ADD CONSTRAINT "depots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finance_record"
    ADD CONSTRAINT "finance_record_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lease_bill"
    ADD CONSTRAINT "lease_bill_bill_no_key" UNIQUE ("bill_no");



ALTER TABLE ONLY "public"."lease_bill_detail"
    ADD CONSTRAINT "lease_bill_detail_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lease_bill"
    ADD CONSTRAINT "lease_bill_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lease_contract"
    ADD CONSTRAINT "lease_contract_contract_no_key" UNIQUE ("contract_no");



ALTER TABLE ONLY "public"."lease_contract"
    ADD CONSTRAINT "lease_contract_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lease_item"
    ADD CONSTRAINT "lease_item_lease_contract_id_container_id_key" UNIQUE ("lease_contract_id", "container_id");



ALTER TABLE ONLY "public"."lease_item"
    ADD CONSTRAINT "lease_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "purchase_order_container_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_item"
    ADD CONSTRAINT "purchase_order_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_item"
    ADD CONSTRAINT "purchase_order_item_purchase_order_id_line_no_key" UNIQUE ("purchase_order_id", "line_no");



ALTER TABLE ONLY "public"."purchase_order"
    ADD CONSTRAINT "purchase_order_order_no_key" UNIQUE ("order_no");



ALTER TABLE ONLY "public"."purchase_order"
    ADD CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_codes"
    ADD CONSTRAINT "revenue_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenue_codes"
    ADD CONSTRAINT "revenue_codes_revenue_code_key" UNIQUE ("revenue_code");



ALTER TABLE ONLY "public"."sales_delivery"
    ADD CONSTRAINT "sales_delivery_delivery_no_key" UNIQUE ("delivery_no");



ALTER TABLE ONLY "public"."sales_delivery"
    ADD CONSTRAINT "sales_delivery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_item"
    ADD CONSTRAINT "sales_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_item"
    ADD CONSTRAINT "sales_item_sales_order_id_container_id_key" UNIQUE ("sales_order_id", "container_id");



ALTER TABLE ONLY "public"."sales_order"
    ADD CONSTRAINT "sales_order_order_no_key" UNIQUE ("order_no");



ALTER TABLE ONLY "public"."sales_order"
    ADD CONSTRAINT "sales_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_supplier_name_key" UNIQUE ("supplier_name");



ALTER TABLE ONLY "public"."transfer_item"
    ADD CONSTRAINT "transfer_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transfer_item"
    ADD CONSTRAINT "transfer_item_transfer_order_id_container_id_key" UNIQUE ("transfer_order_id", "container_id");



ALTER TABLE ONLY "public"."transfer_order"
    ADD CONSTRAINT "transfer_order_order_no_key" UNIQUE ("order_no");



ALTER TABLE ONLY "public"."transfer_order"
    ADD CONSTRAINT "transfer_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_invoice"
    ADD CONSTRAINT "uq_business_invoice_business_invoice_no" UNIQUE ("business_type", "business_id", "invoice_no");



ALTER TABLE ONLY "public"."purchase_order_item"
    ADD CONSTRAINT "uq_purchase_order_item_order_line" UNIQUE ("purchase_order_id", "line_no");



ALTER TABLE ONLY "public"."transfer_item"
    ADD CONSTRAINT "uq_transfer_item_order_container" UNIQUE ("transfer_order_id", "container_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_full_name_unique" UNIQUE ("full_name");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yard_record"
    ADD CONSTRAINT "yard_record_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_business_cost_business" ON "public"."business_cost" USING "btree" ("business_type", "business_id");



CREATE INDEX "idx_business_cost_code" ON "public"."business_cost" USING "btree" ("cost_code_id");



CREATE INDEX "idx_business_cost_container_id" ON "public"."business_cost" USING "btree" ("container_id");



CREATE INDEX "idx_business_cost_date" ON "public"."business_cost" USING "btree" ("occur_date");



CREATE INDEX "idx_business_invoice_business" ON "public"."business_invoice" USING "btree" ("business_type", "business_id");



CREATE INDEX "idx_business_invoice_type" ON "public"."business_invoice" USING "btree" ("invoice_type");



CREATE INDEX "idx_business_revenue_business" ON "public"."business_revenue" USING "btree" ("business_type", "business_id");



CREATE INDEX "idx_business_revenue_code" ON "public"."business_revenue" USING "btree" ("revenue_code_id");



CREATE INDEX "idx_business_revenue_container_id" ON "public"."business_revenue" USING "btree" ("container_id");



CREATE INDEX "idx_business_revenue_date" ON "public"."business_revenue" USING "btree" ("occur_date");



CREATE INDEX "idx_cities_city_code" ON "public"."cities" USING "btree" ("city_code");



CREATE INDEX "idx_cities_city_name" ON "public"."cities" USING "btree" ("city_name");



CREATE INDEX "idx_container_condition_code_id" ON "public"."container" USING "btree" ("container_condition_code_id");



CREATE INDEX "idx_container_condition_codes_code" ON "public"."container_condition_codes" USING "btree" ("condition_code");



CREATE INDEX "idx_container_container_condition_code_id" ON "public"."container" USING "btree" ("container_condition_code_id");



CREATE INDEX "idx_container_container_type_code_id" ON "public"."container" USING "btree" ("container_type_code_id");



CREATE INDEX "idx_container_current_customer_id" ON "public"."container" USING "btree" ("current_customer_id");



CREATE INDEX "idx_container_current_depot_id" ON "public"."container" USING "btree" ("current_depot_id");



CREATE INDEX "idx_container_current_lease" ON "public"."container" USING "btree" ("current_lease_id");



CREATE INDEX "idx_container_current_lease_id" ON "public"."container" USING "btree" ("current_lease_id");



CREATE INDEX "idx_container_current_sale" ON "public"."container" USING "btree" ("current_sale_id");



CREATE INDEX "idx_container_current_sale_id" ON "public"."container" USING "btree" ("current_sale_id");



CREATE INDEX "idx_container_current_transfer" ON "public"."container" USING "btree" ("current_transfer_id");



CREATE INDEX "idx_container_current_transfer_id" ON "public"."container" USING "btree" ("current_transfer_id");



CREATE INDEX "idx_container_event_business" ON "public"."container_event" USING "btree" ("business_type", "business_id");



CREATE INDEX "idx_container_event_container_time" ON "public"."container_event" USING "btree" ("container_id", "event_time" DESC);



CREATE INDEX "idx_container_event_from_depot" ON "public"."container_event" USING "btree" ("from_depot_id");



CREATE INDEX "idx_container_event_to_depot" ON "public"."container_event" USING "btree" ("to_depot_id");



CREATE INDEX "idx_container_event_type" ON "public"."container_event" USING "btree" ("event_type");



CREATE INDEX "idx_container_event_valid_time" ON "public"."container_event" USING "btree" ("container_id", "event_time" DESC) WHERE ("is_void" = false);



CREATE INDEX "idx_container_lifecycle" ON "public"."container" USING "btree" ("lifecycle_stage");



CREATE INDEX "idx_container_lifecycle_stage" ON "public"."container" USING "btree" ("lifecycle_stage");



CREATE INDEX "idx_container_size_code_id" ON "public"."container" USING "btree" ("container_size_code_id");



CREATE INDEX "idx_container_status" ON "public"."container" USING "btree" ("status");



CREATE INDEX "idx_container_type_code_id" ON "public"."container" USING "btree" ("container_type_code_id");



CREATE INDEX "idx_container_type_codes_code" ON "public"."container_type_codes" USING "btree" ("type_code");



CREATE INDEX "idx_container_yard_filter" ON "public"."container" USING "btree" ("current_depot_id", "lifecycle_stage", "status");



CREATE INDEX "idx_cost_codes_cost_code" ON "public"."cost_codes" USING "btree" ("cost_code");



CREATE INDEX "idx_customers_company_name" ON "public"."customers" USING "btree" ("company_name");



CREATE INDEX "idx_customers_custom_id" ON "public"."customers" USING "btree" ("customer_custom_id");



CREATE INDEX "idx_depots_code" ON "public"."depots" USING "btree" ("depot_code");



CREATE INDEX "idx_depots_name" ON "public"."depots" USING "btree" ("depot_name");



CREATE INDEX "idx_finance_record_business" ON "public"."finance_record" USING "btree" ("business_type", "business_id");



CREATE INDEX "idx_finance_record_counterparty" ON "public"."finance_record" USING "btree" ("counterparty_type", "counterparty_id");



CREATE INDEX "idx_finance_record_status" ON "public"."finance_record" USING "btree" ("status");



CREATE INDEX "idx_invoice_item_cost" ON "public"."business_invoice_item" USING "btree" ("cost_id");



CREATE INDEX "idx_invoice_item_invoice" ON "public"."business_invoice_item" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_item_revenue" ON "public"."business_invoice_item" USING "btree" ("revenue_id");



CREATE INDEX "idx_lease_bill_contract" ON "public"."lease_bill" USING "btree" ("lease_contract_id");



CREATE INDEX "idx_lease_bill_detail_bill" ON "public"."lease_bill_detail" USING "btree" ("bill_id");



CREATE INDEX "idx_lease_bill_detail_item" ON "public"."lease_bill_detail" USING "btree" ("lease_item_id");



CREATE INDEX "idx_lease_bill_lease_contract_id" ON "public"."lease_bill" USING "btree" ("lease_contract_id");



CREATE INDEX "idx_lease_bill_status" ON "public"."lease_bill" USING "btree" ("bill_status");



CREATE INDEX "idx_lease_contract_customer_id" ON "public"."lease_contract" USING "btree" ("customer_id");



CREATE INDEX "idx_lease_contract_status" ON "public"."lease_contract" USING "btree" ("status");



CREATE INDEX "idx_lease_item_container" ON "public"."lease_item" USING "btree" ("container_id");



CREATE INDEX "idx_lease_item_container_id" ON "public"."lease_item" USING "btree" ("container_id");



CREATE INDEX "idx_lease_item_contract" ON "public"."lease_item" USING "btree" ("lease_contract_id");



CREATE INDEX "idx_lease_item_lease_contract_id" ON "public"."lease_item" USING "btree" ("lease_contract_id");



CREATE INDEX "idx_lease_item_status" ON "public"."lease_item" USING "btree" ("item_status");



CREATE INDEX "idx_lease_status" ON "public"."lease_contract" USING "btree" ("status");



CREATE INDEX "idx_po_status" ON "public"."purchase_order" USING "btree" ("order_status");



CREATE INDEX "idx_purchase_order_business_owner_id" ON "public"."purchase_order" USING "btree" ("business_owner_id");



CREATE INDEX "idx_purchase_order_container_container_id" ON "public"."purchase_order_container" USING "btree" ("container_id");



CREATE INDEX "idx_purchase_order_container_depot_id" ON "public"."purchase_order_container" USING "btree" ("depot_id");



CREATE INDEX "idx_purchase_order_container_purchase_order_id" ON "public"."purchase_order_container" USING "btree" ("purchase_order_id");



CREATE INDEX "idx_purchase_order_container_purchase_order_item_id" ON "public"."purchase_order_container" USING "btree" ("purchase_order_item_id");



CREATE INDEX "idx_purchase_order_date" ON "public"."purchase_order" USING "btree" ("purchase_date");



CREATE INDEX "idx_purchase_order_depot_id" ON "public"."purchase_order" USING "btree" ("depot_id");



CREATE INDEX "idx_purchase_order_item_container_condition_code_id" ON "public"."purchase_order_item" USING "btree" ("container_condition_code_id");



CREATE INDEX "idx_purchase_order_item_container_type_code_id" ON "public"."purchase_order_item" USING "btree" ("container_type_code_id");



CREATE INDEX "idx_purchase_order_item_order" ON "public"."purchase_order_item" USING "btree" ("purchase_order_id");



CREATE INDEX "idx_purchase_order_item_purchase_order_id" ON "public"."purchase_order_item" USING "btree" ("purchase_order_id");



CREATE INDEX "idx_purchase_order_order_status" ON "public"."purchase_order" USING "btree" ("order_status");



CREATE INDEX "idx_purchase_order_supplier_id" ON "public"."purchase_order" USING "btree" ("supplier_id");



CREATE INDEX "idx_revenue_codes_revenue_code" ON "public"."revenue_codes" USING "btree" ("revenue_code");



CREATE INDEX "idx_sales_delivery_order" ON "public"."sales_delivery" USING "btree" ("sales_order_id");



CREATE INDEX "idx_sales_delivery_sales_order_id" ON "public"."sales_delivery" USING "btree" ("sales_order_id");



CREATE INDEX "idx_sales_delivery_status" ON "public"."sales_delivery" USING "btree" ("delivery_status");



CREATE INDEX "idx_sales_item_container" ON "public"."sales_item" USING "btree" ("container_id");



CREATE INDEX "idx_sales_item_container_id" ON "public"."sales_item" USING "btree" ("container_id");



CREATE INDEX "idx_sales_item_order" ON "public"."sales_item" USING "btree" ("sales_order_id");



CREATE INDEX "idx_sales_item_sales_order_id" ON "public"."sales_item" USING "btree" ("sales_order_id");



CREATE INDEX "idx_sales_item_status" ON "public"."sales_item" USING "btree" ("item_status");



CREATE INDEX "idx_sales_order_customer" ON "public"."sales_order" USING "btree" ("customer_id");



CREATE INDEX "idx_sales_order_customer_id" ON "public"."sales_order" USING "btree" ("customer_id");



CREATE INDEX "idx_sales_order_date" ON "public"."sales_order" USING "btree" ("sale_date");



CREATE INDEX "idx_sales_order_status" ON "public"."sales_order" USING "btree" ("status");



CREATE INDEX "idx_so_status" ON "public"."sales_order" USING "btree" ("status");



CREATE INDEX "idx_transfer_item_container" ON "public"."transfer_item" USING "btree" ("container_id");



CREATE INDEX "idx_transfer_item_container_id" ON "public"."transfer_item" USING "btree" ("container_id");



CREATE INDEX "idx_transfer_item_order" ON "public"."transfer_item" USING "btree" ("transfer_order_id");



CREATE INDEX "idx_transfer_item_transfer_order_id" ON "public"."transfer_item" USING "btree" ("transfer_order_id");



CREATE INDEX "idx_transfer_order_customer" ON "public"."transfer_order" USING "btree" ("customer_id");



CREATE INDEX "idx_transfer_order_customer_id" ON "public"."transfer_order" USING "btree" ("customer_id");



CREATE INDEX "idx_transfer_order_from_depot" ON "public"."transfer_order" USING "btree" ("from_depot_id");



CREATE INDEX "idx_transfer_order_from_depot_id" ON "public"."transfer_order" USING "btree" ("from_depot_id");



CREATE INDEX "idx_transfer_order_status" ON "public"."transfer_order" USING "btree" ("status");



CREATE INDEX "idx_transfer_order_to_depot" ON "public"."transfer_order" USING "btree" ("to_depot_id");



CREATE INDEX "idx_transfer_order_to_depot_id" ON "public"."transfer_order" USING "btree" ("to_depot_id");



CREATE INDEX "idx_transfer_status" ON "public"."transfer_order" USING "btree" ("status");



CREATE INDEX "idx_yard_record_container" ON "public"."yard_record" USING "btree" ("container_id");



CREATE INDEX "idx_yard_record_container_id" ON "public"."yard_record" USING "btree" ("container_id");



CREATE INDEX "idx_yard_record_container_time" ON "public"."yard_record" USING "btree" ("container_id", "enter_time" DESC);



CREATE INDEX "idx_yard_record_depot" ON "public"."yard_record" USING "btree" ("depot_id");



CREATE INDEX "idx_yard_record_depot_id" ON "public"."yard_record" USING "btree" ("depot_id");



CREATE INDEX "idx_yard_record_status" ON "public"."yard_record" USING "btree" ("record_status");



CREATE UNIQUE INDEX "uq_container_event_one_per_business" ON "public"."container_event" USING "btree" ("container_id", "business_type", "business_id", "event_type") WHERE (("is_void" = false) AND ("business_type" IS NOT NULL) AND ("business_id" IS NOT NULL));



CREATE UNIQUE INDEX "uq_container_number_rules_active_per_size" ON "public"."container_number_rules" USING "btree" ("container_size_code_id") WHERE ("status" = 'ACTIVE'::"text");



CREATE UNIQUE INDEX "uq_invoice_item_invoice_cost" ON "public"."business_invoice_item" USING "btree" ("invoice_id", "cost_id") WHERE ("cost_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_invoice_item_invoice_revenue" ON "public"."business_invoice_item" USING "btree" ("invoice_id", "revenue_id") WHERE ("revenue_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_suppliers_supplier_code" ON "public"."suppliers" USING "btree" ("supplier_code");



CREATE UNIQUE INDEX "uq_yard_record_one_active_per_container" ON "public"."yard_record" USING "btree" ("container_id") WHERE ("record_status" = 'IN_YARD'::"text");



CREATE UNIQUE INDEX "uq_yard_record_one_active_per_container2" ON "public"."yard_record" USING "btree" ("container_id") WHERE (("exit_time" IS NULL) AND ("record_status" = 'IN_YARD'::"text"));



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."cities" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."depots" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "trg_business_cost_updated_at" BEFORE UPDATE ON "public"."business_cost" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_business_invoice_updated_at" BEFORE UPDATE ON "public"."business_invoice" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_business_revenue_updated_at" BEFORE UPDATE ON "public"."business_revenue" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_container_condition_codes_updated_at" BEFORE UPDATE ON "public"."container_condition_codes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_container_number_rules_updated_at" BEFORE UPDATE ON "public"."container_number_rules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_container_size_codes_updated_at" BEFORE UPDATE ON "public"."container_size_codes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_container_type_codes_updated_at" BEFORE UPDATE ON "public"."container_type_codes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_container_updated_at" BEFORE UPDATE ON "public"."container" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cost_codes_updated_at" BEFORE UPDATE ON "public"."cost_codes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_finance_record_updated_at" BEFORE UPDATE ON "public"."finance_record" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lease_bill_detail_updated_at" BEFORE UPDATE ON "public"."lease_bill_detail" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lease_bill_updated_at" BEFORE UPDATE ON "public"."lease_bill" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lease_contract_updated_at" BEFORE UPDATE ON "public"."lease_contract" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lease_item_updated_at" BEFORE UPDATE ON "public"."lease_item" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_purchase_order_container_updated_at" BEFORE UPDATE ON "public"."purchase_order_container" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_purchase_order_item_updated_at" BEFORE UPDATE ON "public"."purchase_order_item" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_purchase_order_updated_at" BEFORE UPDATE ON "public"."purchase_order" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_revenue_codes_updated_at" BEFORE UPDATE ON "public"."revenue_codes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_delivery_updated_at" BEFORE UPDATE ON "public"."sales_delivery" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_item_updated_at" BEFORE UPDATE ON "public"."sales_item" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_order_updated_at" BEFORE UPDATE ON "public"."sales_order" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_transfer_item_updated_at" BEFORE UPDATE ON "public"."transfer_item" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_transfer_order_updated_at" BEFORE UPDATE ON "public"."transfer_order" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_yard_record_updated_at" BEFORE UPDATE ON "public"."yard_record" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."business_cost"
    ADD CONSTRAINT "business_cost_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id");



ALTER TABLE ONLY "public"."business_cost"
    ADD CONSTRAINT "business_cost_cost_code_id_fkey" FOREIGN KEY ("cost_code_id") REFERENCES "public"."cost_codes"("id");



ALTER TABLE ONLY "public"."business_cost"
    ADD CONSTRAINT "business_cost_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."business_cost"
    ADD CONSTRAINT "business_cost_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."business_invoice"
    ADD CONSTRAINT "business_invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."business_invoice_item"
    ADD CONSTRAINT "business_invoice_item_cost_id_fkey" FOREIGN KEY ("cost_id") REFERENCES "public"."business_cost"("id");



ALTER TABLE ONLY "public"."business_invoice_item"
    ADD CONSTRAINT "business_invoice_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."business_invoice"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_invoice_item"
    ADD CONSTRAINT "business_invoice_item_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "public"."business_revenue"("id");



ALTER TABLE ONLY "public"."business_invoice"
    ADD CONSTRAINT "business_invoice_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."business_revenue"
    ADD CONSTRAINT "business_revenue_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id");



ALTER TABLE ONLY "public"."business_revenue"
    ADD CONSTRAINT "business_revenue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."business_revenue"
    ADD CONSTRAINT "business_revenue_revenue_code_id_fkey" FOREIGN KEY ("revenue_code_id") REFERENCES "public"."revenue_codes"("id");



ALTER TABLE ONLY "public"."business_revenue"
    ADD CONSTRAINT "business_revenue_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."container_condition_codes"
    ADD CONSTRAINT "container_condition_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_container_condition_code_id_fkey" FOREIGN KEY ("container_condition_code_id") REFERENCES "public"."container_condition_codes"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_container_size_code_id_fkey" FOREIGN KEY ("container_size_code_id") REFERENCES "public"."container_size_codes"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_container_type_code_id_fkey" FOREIGN KEY ("container_type_code_id") REFERENCES "public"."container_type_codes"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_current_customer_id_fkey" FOREIGN KEY ("current_customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_current_depot_id_fkey" FOREIGN KEY ("current_depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."container_event"
    ADD CONSTRAINT "container_event_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."container_event"
    ADD CONSTRAINT "container_event_from_depot_id_fkey" FOREIGN KEY ("from_depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."container_event"
    ADD CONSTRAINT "container_event_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container_event"
    ADD CONSTRAINT "container_event_to_depot_id_fkey" FOREIGN KEY ("to_depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."container_event"
    ADD CONSTRAINT "container_event_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container_number_rules"
    ADD CONSTRAINT "container_number_rules_container_size_code_id_fkey" FOREIGN KEY ("container_size_code_id") REFERENCES "public"."container_size_codes"("id");



ALTER TABLE ONLY "public"."container_number_rules"
    ADD CONSTRAINT "container_number_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container_size_codes"
    ADD CONSTRAINT "container_size_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container_type_codes"
    ADD CONSTRAINT "container_type_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "container_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."cost_codes"
    ADD CONSTRAINT "cost_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_assigned_sales_id_fkey" FOREIGN KEY ("assigned_sales_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."depots"
    ADD CONSTRAINT "depots_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."finance_record"
    ADD CONSTRAINT "finance_record_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."finance_record"
    ADD CONSTRAINT "finance_record_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."business_invoice"("id");



ALTER TABLE ONLY "public"."finance_record"
    ADD CONSTRAINT "finance_record_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "fk_container_current_lease" FOREIGN KEY ("current_lease_id") REFERENCES "public"."lease_contract"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "fk_container_current_sale" FOREIGN KEY ("current_sale_id") REFERENCES "public"."sales_order"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "fk_container_current_transfer" FOREIGN KEY ("current_transfer_id") REFERENCES "public"."transfer_order"("id");



ALTER TABLE ONLY "public"."container"
    ADD CONSTRAINT "fk_container_last_event" FOREIGN KEY ("last_event_id") REFERENCES "public"."container_event"("id");



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "fk_poc_condition_code" FOREIGN KEY ("container_condition_code_id") REFERENCES "public"."container_condition_codes"("id");



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "fk_poc_type_code" FOREIGN KEY ("container_type_code_id") REFERENCES "public"."container_type_codes"("id");



ALTER TABLE ONLY "public"."lease_bill"
    ADD CONSTRAINT "lease_bill_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lease_bill_detail"
    ADD CONSTRAINT "lease_bill_detail_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."lease_bill"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_bill_detail"
    ADD CONSTRAINT "lease_bill_detail_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lease_bill_detail"
    ADD CONSTRAINT "lease_bill_detail_lease_item_id_fkey" FOREIGN KEY ("lease_item_id") REFERENCES "public"."lease_item"("id");



ALTER TABLE ONLY "public"."lease_bill_detail"
    ADD CONSTRAINT "lease_bill_detail_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lease_bill"
    ADD CONSTRAINT "lease_bill_lease_contract_id_fkey" FOREIGN KEY ("lease_contract_id") REFERENCES "public"."lease_contract"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_bill"
    ADD CONSTRAINT "lease_bill_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lease_contract"
    ADD CONSTRAINT "lease_contract_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lease_contract"
    ADD CONSTRAINT "lease_contract_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."lease_contract"
    ADD CONSTRAINT "lease_contract_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lease_item"
    ADD CONSTRAINT "lease_item_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id");



ALTER TABLE ONLY "public"."lease_item"
    ADD CONSTRAINT "lease_item_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lease_item"
    ADD CONSTRAINT "lease_item_lease_contract_id_fkey" FOREIGN KEY ("lease_contract_id") REFERENCES "public"."lease_contract"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_item"
    ADD CONSTRAINT "lease_item_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."purchase_order"
    ADD CONSTRAINT "purchase_order_business_owner_id_fkey" FOREIGN KEY ("business_owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "purchase_order_container_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id");



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "purchase_order_container_container_size_code_id_fkey" FOREIGN KEY ("container_size_code_id") REFERENCES "public"."container_size_codes"("id");



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "purchase_order_container_depot_id_fkey" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "purchase_order_container_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_container"
    ADD CONSTRAINT "purchase_order_container_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_item"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order"
    ADD CONSTRAINT "purchase_order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."purchase_order"
    ADD CONSTRAINT "purchase_order_depot_id_fkey" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."purchase_order_item"
    ADD CONSTRAINT "purchase_order_item_container_condition_code_id_fkey" FOREIGN KEY ("container_condition_code_id") REFERENCES "public"."container_condition_codes"("id");



ALTER TABLE ONLY "public"."purchase_order_item"
    ADD CONSTRAINT "purchase_order_item_container_size_code_id_fkey" FOREIGN KEY ("container_size_code_id") REFERENCES "public"."container_size_codes"("id");



ALTER TABLE ONLY "public"."purchase_order_item"
    ADD CONSTRAINT "purchase_order_item_container_type_code_id_fkey" FOREIGN KEY ("container_type_code_id") REFERENCES "public"."container_type_codes"("id");



ALTER TABLE ONLY "public"."purchase_order_item"
    ADD CONSTRAINT "purchase_order_item_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order"
    ADD CONSTRAINT "purchase_order_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."purchase_order"
    ADD CONSTRAINT "purchase_order_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."revenue_codes"
    ADD CONSTRAINT "revenue_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_delivery"
    ADD CONSTRAINT "sales_delivery_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_delivery"
    ADD CONSTRAINT "sales_delivery_delivery_depot_id_fkey" FOREIGN KEY ("delivery_depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."sales_delivery"
    ADD CONSTRAINT "sales_delivery_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_delivery"
    ADD CONSTRAINT "sales_delivery_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_item"
    ADD CONSTRAINT "sales_item_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id");



ALTER TABLE ONLY "public"."sales_item"
    ADD CONSTRAINT "sales_item_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_item"
    ADD CONSTRAINT "sales_item_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_item"
    ADD CONSTRAINT "sales_item_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_order"
    ADD CONSTRAINT "sales_order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_order"
    ADD CONSTRAINT "sales_order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."sales_order"
    ADD CONSTRAINT "sales_order_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."transfer_item"
    ADD CONSTRAINT "transfer_item_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id");



ALTER TABLE ONLY "public"."transfer_item"
    ADD CONSTRAINT "transfer_item_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."transfer_item"
    ADD CONSTRAINT "transfer_item_transfer_order_id_fkey" FOREIGN KEY ("transfer_order_id") REFERENCES "public"."transfer_order"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transfer_item"
    ADD CONSTRAINT "transfer_item_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."transfer_order"
    ADD CONSTRAINT "transfer_order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."transfer_order"
    ADD CONSTRAINT "transfer_order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."transfer_order"
    ADD CONSTRAINT "transfer_order_from_depot_id_fkey" FOREIGN KEY ("from_depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."transfer_order"
    ADD CONSTRAINT "transfer_order_to_depot_id_fkey" FOREIGN KEY ("to_depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."transfer_order"
    ADD CONSTRAINT "transfer_order_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."yard_record"
    ADD CONSTRAINT "yard_record_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "public"."container"("id");



ALTER TABLE ONLY "public"."yard_record"
    ADD CONSTRAINT "yard_record_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."yard_record"
    ADD CONSTRAINT "yard_record_depot_id_fkey" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id");



ALTER TABLE ONLY "public"."yard_record"
    ADD CONSTRAINT "yard_record_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



CREATE POLICY "Enable full access for customers" ON "public"."customers" USING (true) WITH CHECK (true);



CREATE POLICY "Enable full access for users" ON "public"."users" USING (true) WITH CHECK (true);



ALTER TABLE "public"."business_cost" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_cost_select_all" ON "public"."business_cost" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."business_invoice" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_invoice_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_invoice_item_select_all" ON "public"."business_invoice_item" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "business_invoice_select_all" ON "public"."business_invoice" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."business_revenue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "business_revenue_select_all" ON "public"."business_revenue" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cities_admin_write" ON "public"."cities" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "cities_select_all" ON "public"."cities" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."container" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "container_admin_write" ON "public"."container" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."container_condition_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "container_condition_codes_admin_write" ON "public"."container_condition_codes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "container_condition_codes_select_all" ON "public"."container_condition_codes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."container_event" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "container_event_select_all" ON "public"."container_event" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."container_number_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "container_number_rules_admin_write" ON "public"."container_number_rules" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "container_number_rules_select_all" ON "public"."container_number_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "container_select_all" ON "public"."container" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."container_size_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "container_size_codes_admin_write" ON "public"."container_size_codes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "container_size_codes_select_all" ON "public"."container_size_codes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."container_type_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "container_type_codes_admin_write" ON "public"."container_type_codes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "container_type_codes_select_all" ON "public"."container_type_codes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cost_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cost_codes_admin_write" ON "public"."cost_codes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "cost_codes_select_all" ON "public"."cost_codes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_admin_write" ON "public"."customers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "customers_select_all" ON "public"."customers" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."depots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "depots_admin_write" ON "public"."depots" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "depots_select_all" ON "public"."depots" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."finance_record" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "finance_record_select_all" ON "public"."finance_record" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."lease_bill" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lease_bill_detail" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lease_bill_detail_select_all" ON "public"."lease_bill_detail" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "lease_bill_select_all" ON "public"."lease_bill" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."lease_contract" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lease_contract_select_all" ON "public"."lease_contract" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."lease_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lease_item_select_all" ON "public"."lease_item" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."purchase_order" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_order_container" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchase_order_container_select_all" ON "public"."purchase_order_container" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."purchase_order_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchase_order_item_select_all" ON "public"."purchase_order_item" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "purchase_order_select_all" ON "public"."purchase_order" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."revenue_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "revenue_codes_admin_write" ON "public"."revenue_codes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "revenue_codes_select_all" ON "public"."revenue_codes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sales_delivery" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_delivery_select_all" ON "public"."sales_delivery" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sales_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_item_select_all" ON "public"."sales_item" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sales_order" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_order_select_all" ON "public"."sales_order" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_admin_write" ON "public"."suppliers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "suppliers_select_all" ON "public"."suppliers" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."transfer_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transfer_item_select_all" ON "public"."transfer_item" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."transfer_order" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transfer_order_select_all" ON "public"."transfer_order" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_admin_write" ON "public"."users" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "users_select_self" ON "public"."users" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."yard_record" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "yard_record_select_all" ON "public"."yard_record" FOR SELECT TO "authenticated" USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_container"("p_container_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lock_container"("p_container_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_container"("p_container_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_lease_offhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_return_depot_id" "uuid", "p_offhire_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_lease_offhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_return_depot_id" "uuid", "p_offhire_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_lease_offhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_return_depot_id" "uuid", "p_offhire_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_lease_onhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_onhire_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_lease_onhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_onhire_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_lease_onhire"("p_lease_contract_id" "uuid", "p_container_id" "uuid", "p_onhire_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_rebuild_container_snapshot"("p_container_id" "uuid", "p_operator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_rebuild_container_snapshot"("p_container_id" "uuid", "p_operator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_rebuild_container_snapshot"("p_container_id" "uuid", "p_operator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sale_contract"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_contracted_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sale_contract"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_contracted_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sale_contract"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_contracted_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sale_deliver"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_delivery_id" "uuid", "p_delivered_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sale_deliver"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_delivery_id" "uuid", "p_delivered_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sale_deliver"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_delivery_id" "uuid", "p_delivered_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sale_fail"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_failed_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sale_fail"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_failed_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sale_fail"("p_sales_order_id" "uuid", "p_container_id" "uuid", "p_failed_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_transfer_cancel_item"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_operator_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_transfer_cancel_item"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_operator_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_transfer_cancel_item"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_operator_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_transfer_complete_if_all_arrived"("p_transfer_order_id" "uuid", "p_complete_time" timestamp with time zone, "p_operator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_transfer_complete_if_all_arrived"("p_transfer_order_id" "uuid", "p_complete_time" timestamp with time zone, "p_operator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_transfer_complete_if_all_arrived"("p_transfer_order_id" "uuid", "p_complete_time" timestamp with time zone, "p_operator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_transfer_in"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_arrival_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_transfer_in"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_arrival_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_transfer_in"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_arrival_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_transfer_out"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_departure_time" timestamp with time zone, "p_status_after" "text", "p_transit_business_type" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_transfer_out"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_departure_time" timestamp with time zone, "p_status_after" "text", "p_transit_business_type" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_transfer_out"("p_transfer_order_id" "uuid", "p_container_id" "uuid", "p_departure_time" timestamp with time zone, "p_status_after" "text", "p_transit_business_type" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_void_container_event"("p_event_id" "uuid", "p_reason" "text", "p_operator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_void_container_event"("p_event_id" "uuid", "p_reason" "text", "p_operator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_void_container_event"("p_event_id" "uuid", "p_reason" "text", "p_operator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_yard_enter"("p_container_id" "uuid", "p_depot_id" "uuid", "p_enter_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_yard_enter"("p_container_id" "uuid", "p_depot_id" "uuid", "p_enter_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_yard_enter"("p_container_id" "uuid", "p_depot_id" "uuid", "p_enter_time" timestamp with time zone, "p_status_after" "text", "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_yard_exit"("p_container_id" "uuid", "p_depot_id" "uuid", "p_exit_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_yard_exit"("p_container_id" "uuid", "p_depot_id" "uuid", "p_exit_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_yard_exit"("p_container_id" "uuid", "p_depot_id" "uuid", "p_exit_time" timestamp with time zone, "p_operator_id" "uuid", "p_operator_name" "text", "p_business_type" "text", "p_business_id" "uuid", "p_remark" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."business_cost" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."business_cost" TO "authenticated";
GRANT ALL ON TABLE "public"."business_cost" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."business_invoice" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."business_invoice" TO "authenticated";
GRANT ALL ON TABLE "public"."business_invoice" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."business_invoice_item" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."business_invoice_item" TO "authenticated";
GRANT ALL ON TABLE "public"."business_invoice_item" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."business_revenue" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."business_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."business_revenue" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."container" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."container" TO "authenticated";
GRANT ALL ON TABLE "public"."container" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."container_condition_codes" TO "anon";
GRANT ALL ON TABLE "public"."container_condition_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."container_condition_codes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."container_event" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."container_event" TO "authenticated";
GRANT ALL ON TABLE "public"."container_event" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."container_number_rules" TO "anon";
GRANT ALL ON TABLE "public"."container_number_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."container_number_rules" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."container_size_codes" TO "anon";
GRANT ALL ON TABLE "public"."container_size_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."container_size_codes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."container_type_codes" TO "anon";
GRANT ALL ON TABLE "public"."container_type_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."container_type_codes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cost_codes" TO "anon";
GRANT ALL ON TABLE "public"."cost_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_codes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."depots" TO "anon";
GRANT ALL ON TABLE "public"."depots" TO "authenticated";
GRANT ALL ON TABLE "public"."depots" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."finance_record" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."finance_record" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_record" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lease_bill" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."lease_bill" TO "authenticated";
GRANT ALL ON TABLE "public"."lease_bill" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lease_bill_detail" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."lease_bill_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."lease_bill_detail" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lease_contract" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."lease_contract" TO "authenticated";
GRANT ALL ON TABLE "public"."lease_contract" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lease_item" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."lease_item" TO "authenticated";
GRANT ALL ON TABLE "public"."lease_item" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."purchase_order" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."purchase_order" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."purchase_order_container" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."purchase_order_container" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_container" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."purchase_order_item" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."purchase_order_item" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_item" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."revenue_codes" TO "anon";
GRANT ALL ON TABLE "public"."revenue_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_codes" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."sales_delivery" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."sales_delivery" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_delivery" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."sales_item" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."sales_item" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_item" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."sales_order" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."sales_order" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."transfer_item" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."transfer_item" TO "authenticated";
GRANT ALL ON TABLE "public"."transfer_item" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."transfer_order" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."transfer_order" TO "authenticated";
GRANT ALL ON TABLE "public"."transfer_order" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."users" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_container_event" TO "anon";
GRANT ALL ON TABLE "public"."v_container_event" TO "authenticated";
GRANT ALL ON TABLE "public"."v_container_event" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."yard_record" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."yard_record" TO "authenticated";
GRANT ALL ON TABLE "public"."yard_record" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







