create table if not exists public.purchase_order_item_attachment_links (
  id uuid primary key default gen_random_uuid(),
  purchase_order_item_id uuid not null references public.purchase_order_item(id) on delete cascade,
  attachment_type text not null,
  url text not null,
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint purchase_order_item_attachment_links_attachment_type_check check (
    attachment_type = any (array['VENDOR_RELEASE'::text, 'GENERAL'::text])
  ),
  constraint purchase_order_item_attachment_links_url_check check (url <> '')
);

create index if not exists idx_purchase_order_item_attachment_links_item_id
  on public.purchase_order_item_attachment_links(purchase_order_item_id);

create index if not exists idx_purchase_order_item_attachment_links_attachment_type
  on public.purchase_order_item_attachment_links(attachment_type);

drop trigger if exists trg_purchase_order_item_attachment_links_updated_at
  on public.purchase_order_item_attachment_links;
create trigger trg_purchase_order_item_attachment_links_updated_at
before update on public.purchase_order_item_attachment_links
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.purchase_order_item_attachment_links to anon;
grant all on table public.purchase_order_item_attachment_links to authenticated;
grant all on table public.purchase_order_item_attachment_links to service_role;

alter table public.purchase_order_item_attachment_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'purchase_order_item_attachment_links'
      and policyname = 'purchase_order_item_attachment_links_public_select'
  ) then
    create policy "purchase_order_item_attachment_links_public_select"
      on public.purchase_order_item_attachment_links
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'purchase_order_item_attachment_links'
      and policyname = 'purchase_order_item_attachment_links_public_insert'
  ) then
    create policy "purchase_order_item_attachment_links_public_insert"
      on public.purchase_order_item_attachment_links
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'purchase_order_item_attachment_links'
      and policyname = 'purchase_order_item_attachment_links_public_update'
  ) then
    create policy "purchase_order_item_attachment_links_public_update"
      on public.purchase_order_item_attachment_links
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'purchase_order_item_attachment_links'
      and policyname = 'purchase_order_item_attachment_links_public_delete'
  ) then
    create policy "purchase_order_item_attachment_links_public_delete"
      on public.purchase_order_item_attachment_links
      for delete
      to public
      using (true);
  end if;
end
$$;

create table if not exists public.transfer_order_attachment_links (
  id uuid primary key default gen_random_uuid(),
  transfer_order_id uuid not null references public.transfer_order(id) on delete cascade,
  source_purchase_order_item_attachment_id uuid references public.purchase_order_item_attachment_links(id) on delete set null,
  url text not null,
  remark text,
  inherited boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transfer_order_attachment_links_url_check check (url <> '')
);

create index if not exists idx_transfer_order_attachment_links_transfer_order_id
  on public.transfer_order_attachment_links(transfer_order_id);

create index if not exists idx_transfer_order_attachment_links_source_attachment_id
  on public.transfer_order_attachment_links(source_purchase_order_item_attachment_id);

create index if not exists idx_transfer_order_attachment_links_inherited
  on public.transfer_order_attachment_links(inherited);

drop trigger if exists trg_transfer_order_attachment_links_updated_at
  on public.transfer_order_attachment_links;
create trigger trg_transfer_order_attachment_links_updated_at
before update on public.transfer_order_attachment_links
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.transfer_order_attachment_links to anon;
grant all on table public.transfer_order_attachment_links to authenticated;
grant all on table public.transfer_order_attachment_links to service_role;

alter table public.transfer_order_attachment_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order_attachment_links'
      and policyname = 'transfer_order_attachment_links_public_select'
  ) then
    create policy "transfer_order_attachment_links_public_select"
      on public.transfer_order_attachment_links
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order_attachment_links'
      and policyname = 'transfer_order_attachment_links_public_insert'
  ) then
    create policy "transfer_order_attachment_links_public_insert"
      on public.transfer_order_attachment_links
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order_attachment_links'
      and policyname = 'transfer_order_attachment_links_public_update'
  ) then
    create policy "transfer_order_attachment_links_public_update"
      on public.transfer_order_attachment_links
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order_attachment_links'
      and policyname = 'transfer_order_attachment_links_public_delete'
  ) then
    create policy "transfer_order_attachment_links_public_delete"
      on public.transfer_order_attachment_links
      for delete
      to public
      using (true);
  end if;
end
$$;

create or replace view public.v_vendor_release_grouped_remaining_qty as
with used_release as (
  select
    source_purchase_order_item_id,
    sum(coalesce(release_qty, 0))::integer as used_qty
  from public.transfer_order
  where release_source = 'VENDOR_REF'
    and status <> 'CANCELLED'
    and source_purchase_order_item_id is not null
  group by source_purchase_order_item_id
)
select
  poi.id as purchase_order_item_id,
  poi.purchase_order_id,
  po.order_no,
  po.purchase_type,
  poi.line_no,
  poi.vendor_release_number,
  poi.planned_qty as source_total_qty,
  coalesce(ur.used_qty, 0) as vendor_release_used_qty,
  greatest(poi.planned_qty - coalesce(ur.used_qty, 0), 0) as remaining_qty
from public.purchase_order_item poi
join public.purchase_order po
  on po.id = poi.purchase_order_id
left join used_release ur
  on ur.source_purchase_order_item_id = poi.id
where po.purchase_type in ('NEW_CONTAINER', 'USED_CONTAINER')
  and nullif(trim(coalesce(poi.vendor_release_number, '')), '') is not null;

create or replace view public.v_vendor_release_selector_rows as
select
  vr.purchase_order_item_id,
  vr.purchase_order_id,
  vr.order_no,
  vr.purchase_type,
  vr.line_no,
  vr.vendor_release_number,
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

create or replace view public.v_transfer_order_inherited_attachment_candidates as
select
  poi.id as purchase_order_item_id,
  poi.purchase_order_id,
  po.order_no,
  poi.line_no,
  poi.vendor_release_number,
  poial.id as purchase_order_item_attachment_id,
  poial.attachment_type,
  poial.url,
  poial.remark,
  poial.created_at,
  poial.updated_at
from public.purchase_order_item_attachment_links poial
join public.purchase_order_item poi
  on poi.id = poial.purchase_order_item_id
join public.purchase_order po
  on po.id = poi.purchase_order_id
where poial.attachment_type = 'VENDOR_RELEASE';

grant select on public.v_vendor_release_grouped_remaining_qty to anon;
grant select on public.v_vendor_release_grouped_remaining_qty to authenticated;
grant select on public.v_vendor_release_grouped_remaining_qty to service_role;

grant select on public.v_vendor_release_selector_rows to anon;
grant select on public.v_vendor_release_selector_rows to authenticated;
grant select on public.v_vendor_release_selector_rows to service_role;

grant select on public.v_transfer_order_inherited_attachment_candidates to anon;
grant select on public.v_transfer_order_inherited_attachment_candidates to authenticated;
grant select on public.v_transfer_order_inherited_attachment_candidates to service_role;

notify pgrst, 'reload schema';
