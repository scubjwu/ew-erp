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
    coalesce(count(*) filter (where container_status in ('READY', 'IN_YARD', 'PICKED_UP') or actual_offline_time is not null), 0)
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
