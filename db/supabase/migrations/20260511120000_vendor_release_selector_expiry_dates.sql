drop view if exists public.v_vendor_release_selector_rows;

create view public.v_vendor_release_selector_rows as
select
  vr.purchase_order_item_id,
  vr.purchase_order_id,
  vr.order_no,
  vr.purchase_type,
  vr.line_no,
  vr.vendor_release_number,
  po.vendor_release_date,
  po.freeday,
  poi.offline_date,
  poi.estimated_offline_date,
  poi.location_city_id,
  c.city_code as location_city_code,
  c.city_name as location_city_name,
  poi.depot_id,
  d.depot_code,
  d.depot_name,
  poi.container_size_code_id,
  csc.size_code,
  poi.container_type_code_id,
  ctc.type_code,
  concat(coalesce(csc.size_code, ''), coalesce(ctc.type_code, '')) as size_type,
  poi.container_condition_code_id,
  ccc.condition_code,
  poi.color,
  poi.machine_type,
  vr.source_total_qty,
  vr.vendor_release_used_qty,
  vr.remaining_qty,
  count(poial.id)::integer as vendor_release_attachment_count,
  (count(poial.id) filter (where poial.attachment_type = 'VENDOR_RELEASE') > 0) as has_vendor_release_attachment
from public.v_vendor_release_grouped_remaining_qty vr
join public.purchase_order_item poi
  on poi.id = vr.purchase_order_item_id
join public.purchase_order po
  on po.id = poi.purchase_order_id
left join public.cities c
  on c.id = poi.location_city_id
left join public.depots d
  on d.id = poi.depot_id
left join public.container_size_codes csc
  on csc.id = poi.container_size_code_id
left join public.container_type_codes ctc
  on ctc.id = poi.container_type_code_id
left join public.container_condition_codes ccc
  on ccc.id = poi.container_condition_code_id
left join public.purchase_order_item_attachment_links poial
  on poial.purchase_order_item_id = poi.id
  and poial.attachment_type = 'VENDOR_RELEASE'
where vr.remaining_qty > 0
group by
  vr.purchase_order_item_id,
  vr.purchase_order_id,
  vr.order_no,
  vr.purchase_type,
  vr.line_no,
  vr.vendor_release_number,
  po.vendor_release_date,
  po.freeday,
  poi.offline_date,
  poi.estimated_offline_date,
  poi.location_city_id,
  c.city_code,
  c.city_name,
  poi.depot_id,
  d.depot_code,
  d.depot_name,
  poi.container_size_code_id,
  csc.size_code,
  poi.container_type_code_id,
  ctc.type_code,
  poi.container_condition_code_id,
  ccc.condition_code,
  poi.color,
  poi.machine_type,
  vr.source_total_qty,
  vr.vendor_release_used_qty,
  vr.remaining_qty;

grant select on public.v_vendor_release_selector_rows to anon;
grant select on public.v_vendor_release_selector_rows to authenticated;
grant select on public.v_vendor_release_selector_rows to service_role;
