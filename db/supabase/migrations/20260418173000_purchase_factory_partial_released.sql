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
        'PARTIAL_RELEASED'::text,
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
  if v_order.vendor_release_date is not null then
    return 'RELEASED';
  end if;
  return 'SUBMITTED';
end
$$;

update public.purchase_order po
set order_status = case
  when po.order_status = 'CANCELLED' then 'CANCELLED'
  when po.order_status = 'DRAFT' then 'DRAFT'
  else public.purchase_resolve_order_status(po.id)
end;
