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

  return v_cancelled_count;
end
$$;
