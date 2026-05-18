alter table public.transfer_order
  add column if not exists release_source text,
  add column if not exists source_purchase_order_id uuid,
  add column if not exists source_purchase_order_item_id uuid,
  add column if not exists vendor_release_number text,
  add column if not exists dispatch_plan_no text,
  add column if not exists carrier_plan_no text,
  add column if not exists dispatch_vendor_id uuid,
  add column if not exists onhire_no text,
  add column if not exists release_date date,
  add column if not exists pol_city_id uuid,
  add column if not exists pod_city_id uuid,
  add column if not exists carrier text,
  add column if not exists dispatch_arrange_date date,
  add column if not exists self_pickup_depot_id uuid,
  add column if not exists box_selection_mode text,
  add column if not exists release_qty integer not null default 0,
  add column if not exists assigned_qty integer not null default 0,
  add column if not exists unassigned_qty integer not null default 0,
  add column if not exists pickup_charge numeric(18,2) not null default 0,
  add column if not exists dpp numeric(18,2) not null default 0,
  add column if not exists free_days integer not null default 0,
  add column if not exists rv numeric(18,2) not null default 0,
  add column if not exists daily_rent numeric(18,2) not null default 0,
  add column if not exists trucking_cost numeric(18,2) not null default 0,
  add column if not exists handling_fee numeric(18,2) not null default 0,
  add column if not exists repair_cost_total numeric(18,2) not null default 0,
  add column if not exists damage_claim_total numeric(18,2) not null default 0;

alter table public.transfer_item
  add column if not exists repair_cost numeric(18,2) not null default 0,
  add column if not exists damage_claim numeric(18,2) not null default 0;

create index if not exists idx_transfer_order_release_source
  on public.transfer_order(release_source);

create index if not exists idx_transfer_order_source_purchase_order_id
  on public.transfer_order(source_purchase_order_id);

create index if not exists idx_transfer_order_source_purchase_order_item_id
  on public.transfer_order(source_purchase_order_item_id);

create index if not exists idx_transfer_order_dispatch_vendor_id
  on public.transfer_order(dispatch_vendor_id);

create index if not exists idx_transfer_order_pol_city_id
  on public.transfer_order(pol_city_id);

create index if not exists idx_transfer_order_pod_city_id
  on public.transfer_order(pod_city_id);

create index if not exists idx_transfer_order_self_pickup_depot_id
  on public.transfer_order(self_pickup_depot_id);

alter table public.transfer_order
  add constraint transfer_order_release_source_check
    check (
      release_source is null
      or release_source = any (
        array['INTERNAL_FACTORY'::text, 'INTERNAL_DEPOT'::text, 'VENDOR_REF'::text]
      )
    ) not valid,
  add constraint transfer_order_box_selection_mode_check
    check (
      box_selection_mode is null
      or box_selection_mode = any (
        array['UNSPECIFIED'::text, 'SPECIFIED'::text]
      )
    ) not valid,
  add constraint transfer_order_release_qty_nonnegative_check
    check (release_qty >= 0) not valid,
  add constraint transfer_order_assigned_qty_nonnegative_check
    check (assigned_qty >= 0) not valid,
  add constraint transfer_order_unassigned_qty_nonnegative_check
    check (unassigned_qty >= 0) not valid,
  add constraint transfer_order_free_days_nonnegative_check
    check (free_days >= 0) not valid,
  add constraint transfer_order_dpp_nonnegative_check
    check (dpp >= 0::numeric) not valid,
  add constraint transfer_order_rv_nonnegative_check
    check (rv >= 0::numeric) not valid,
  add constraint transfer_order_daily_rent_nonnegative_check
    check (daily_rent >= 0::numeric) not valid,
  add constraint transfer_order_trucking_cost_nonnegative_check
    check (trucking_cost >= 0::numeric) not valid,
  add constraint transfer_order_handling_fee_nonnegative_check
    check (handling_fee >= 0::numeric) not valid,
  add constraint transfer_order_repair_cost_total_nonnegative_check
    check (repair_cost_total >= 0::numeric) not valid,
  add constraint transfer_order_damage_claim_total_nonnegative_check
    check (damage_claim_total >= 0::numeric) not valid,
  add constraint transfer_order_assigned_qty_lte_release_qty_check
    check (assigned_qty <= release_qty) not valid,
  add constraint transfer_order_unassigned_qty_lte_release_qty_check
    check (unassigned_qty <= release_qty) not valid,
  add constraint transfer_order_release_qty_balance_check
    check (assigned_qty + unassigned_qty = release_qty) not valid;

alter table public.transfer_item
  add constraint transfer_item_repair_cost_nonnegative_check
    check (repair_cost >= 0::numeric) not valid,
  add constraint transfer_item_damage_claim_nonnegative_check
    check (damage_claim >= 0::numeric) not valid;

alter table public.transfer_order
  add constraint transfer_order_source_purchase_order_id_fkey
    foreign key (source_purchase_order_id)
    references public.purchase_order(id) not valid,
  add constraint transfer_order_source_purchase_order_item_id_fkey
    foreign key (source_purchase_order_item_id)
    references public.purchase_order_item(id) not valid,
  add constraint transfer_order_dispatch_vendor_id_fkey
    foreign key (dispatch_vendor_id)
    references public.lessees(id) not valid,
  add constraint transfer_order_pol_city_id_fkey
    foreign key (pol_city_id)
    references public.cities(id) not valid,
  add constraint transfer_order_pod_city_id_fkey
    foreign key (pod_city_id)
    references public.cities(id) not valid,
  add constraint transfer_order_self_pickup_depot_id_fkey
    foreign key (self_pickup_depot_id)
    references public.depots(id) not valid;

alter table public.transfer_order
  validate constraint transfer_order_release_source_check;
alter table public.transfer_order
  validate constraint transfer_order_box_selection_mode_check;
alter table public.transfer_order
  validate constraint transfer_order_release_qty_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_assigned_qty_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_unassigned_qty_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_free_days_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_dpp_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_rv_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_daily_rent_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_trucking_cost_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_handling_fee_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_repair_cost_total_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_damage_claim_total_nonnegative_check;
alter table public.transfer_order
  validate constraint transfer_order_assigned_qty_lte_release_qty_check;
alter table public.transfer_order
  validate constraint transfer_order_unassigned_qty_lte_release_qty_check;
alter table public.transfer_order
  validate constraint transfer_order_release_qty_balance_check;

alter table public.transfer_item
  validate constraint transfer_item_repair_cost_nonnegative_check;
alter table public.transfer_item
  validate constraint transfer_item_damage_claim_nonnegative_check;

alter table public.transfer_order
  validate constraint transfer_order_source_purchase_order_id_fkey;
alter table public.transfer_order
  validate constraint transfer_order_source_purchase_order_item_id_fkey;
alter table public.transfer_order
  validate constraint transfer_order_dispatch_vendor_id_fkey;
alter table public.transfer_order
  validate constraint transfer_order_pol_city_id_fkey;
alter table public.transfer_order
  validate constraint transfer_order_pod_city_id_fkey;
alter table public.transfer_order
  validate constraint transfer_order_self_pickup_depot_id_fkey;
