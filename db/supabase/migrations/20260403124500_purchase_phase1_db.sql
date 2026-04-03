alter table if exists public.purchase_order
  add column if not exists supplier_id uuid,
  add column if not exists owner_id uuid,
  add column if not exists buyer_id uuid,
  add column if not exists estimated_offline_time timestamptz,
  add column if not exists contract_number text,
  add column if not exists invoice_number text,
  add column if not exists payment_mode text,
  add column if not exists payment_account text,
  add column if not exists due_date date,
  add column if not exists total_planned_qty integer not null default 0,
  add column if not exists total_received_qty integer not null default 0,
  add column if not exists total_available_qty integer not null default 0,
  add column if not exists grand_total numeric(14,2) not null default 0,
  add column if not exists vendor_bank_information jsonb,
  add column if not exists settlement_payment_term text,
  add column if not exists settlement_credit_days integer,
  add column if not exists settlement_advance_payment_percentage numeric(5,2),
  add column if not exists settlement_balance_trigger_event text,
  add column if not exists settlement_prepayment_pool boolean,
  add column if not exists settlement_prepayment_threshold numeric(12,2),
  add column if not exists settlement_current_prepaid_balance numeric(14,2);

update public.purchase_order
set supplier_id = null
where false;

update public.purchase_order
set buyer_id = coalesce(buyer_id, business_owner_id, created_by)
where buyer_id is null;

update public.purchase_order
set estimated_offline_time = coalesce(
  estimated_offline_time,
  case
    when estimated_offline_date is not null then estimated_offline_date::timestamptz
    else null
  end
)
where estimated_offline_time is null;

update public.purchase_order
set grand_total = coalesce(total_amount_payable, 0)
where grand_total = 0 and coalesce(total_amount_payable, 0) <> 0;

alter table if exists public.purchase_order_item
  add column if not exists location_city_id uuid,
  add column if not exists depot_id uuid,
  add column if not exists yom integer,
  add column if not exists offline_date date,
  add column if not exists financial_cost numeric(14,2) not null default 0,
  add column if not exists locking_bars_count integer,
  add column if not exists vents_count integer;

update public.purchase_order_item
set financial_cost = coalesce(operation_cost, 0)
where financial_cost = 0 and coalesce(operation_cost, 0) <> 0;

update public.purchase_order_item
set locking_bars_count = case when locking_bars then 4 else null end
where locking_bars_count is null and locking_bars is true;

update public.purchase_order_item
set vents_count = case when vents then 1 else null end
where vents_count is null and vents is true;

alter table if exists public.purchase_order_container
  add column if not exists location_city_id uuid,
  add column if not exists yom integer,
  add column if not exists offline_date date,
  add column if not exists purchase_price numeric(14,2) not null default 0,
  add column if not exists financial_cost numeric(14,2) not null default 0,
  add column if not exists container_status text;

update public.purchase_order_container
set offline_date = coalesce(offline_date, actual_offline_time::date)
where offline_date is null and actual_offline_time is not null;

update public.purchase_order_container
set container_status = case
  when item_status = 'OFFLINED' then 'READY'
  when item_status = 'INBOUND' then 'PICKED_UP'
  when item_status = 'CANCELLED' then 'CANCELLED'
  else 'PLANNED'
end
where container_status is null;

create table if not exists public.purchase_order_material_type (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_order(id) on delete cascade,
  material_type text not null,
  material_vendor_id uuid references public.material_vendors(id),
  material_vendor_name_snapshot text,
  material_vendor_code_snapshot text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint purchase_order_material_type_material_type_check check (
    material_type = any (
      array[
        '油漆'::text,
        '密封胶'::text,
        '胶条'::text,
        '地板'::text,
        '贴标'::text,
        '角件'::text,
        '锁杆'::text,
        '底漆'::text
      ]
    )
  ),
  constraint purchase_order_material_type_unique unique (purchase_order_id, material_type)
);

create index if not exists idx_purchase_order_material_type_order_id
  on public.purchase_order_material_type(purchase_order_id);

create index if not exists idx_purchase_order_material_type_vendor_id
  on public.purchase_order_material_type(material_vendor_id);

create table if not exists public.purchase_finance_record (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null unique references public.purchase_order(id) on delete cascade,
  order_no text not null,
  supplier_id uuid references public.vendors(id),
  payment_mode text,
  contract_number text,
  invoice_number text,
  payment_account text,
  due_date date,
  settlement_payment_term text,
  settlement_credit_days integer,
  settlement_advance_payment_percentage numeric(5,2),
  settlement_balance_trigger_event text,
  settlement_currency text,
  settlement_prepayment_pool boolean,
  settlement_prepayment_threshold numeric(12,2),
  settlement_current_prepaid_balance numeric(14,2),
  vendor_bank_information jsonb,
  grand_total numeric(14,2) not null default 0,
  total_amount_paid numeric(14,2) not null default 0,
  total_amount_unpaid numeric(14,2) not null default 0,
  finance_status text not null default 'PENDING',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint purchase_finance_record_payment_mode_check check (
    payment_mode is null
    or payment_mode = any (
      array[
        'DEPOSIT_BALANCE'::text,
        'PREPAYMENT'::text,
        'VENDOR_CREDIT'::text
      ]
    )
  ),
  constraint purchase_finance_record_finance_status_check check (
    finance_status = any (
      array[
        'PENDING'::text,
        'PARTIALLY_PAID'::text,
        'PAID'::text,
        'VOID'::text
      ]
    )
  )
);

create index if not exists idx_purchase_finance_record_supplier_id
  on public.purchase_finance_record(supplier_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_supplier_id_vendors_fkey'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_supplier_id_vendors_fkey
      foreign key (supplier_id) references public.vendors(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_owner_id_fkey'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_owner_id_fkey
      foreign key (owner_id) references public.container_owners(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_buyer_id_fkey'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_buyer_id_fkey
      foreign key (buyer_id) references public.users(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_payment_mode_check'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_payment_mode_check
      check (
        payment_mode is null
        or payment_mode = any (
          array[
            'DEPOSIT_BALANCE'::text,
            'PREPAYMENT'::text,
            'VENDOR_CREDIT'::text
          ]
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_purchase_type_check'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_purchase_type_check
      check (
        purchase_type = any (
          array[
            'FACTORY_ORDER'::text,
            'USED_CONTAINER'::text,
            'NEW_CONTAINER'::text
          ]
        )
      );
  else
    alter table public.purchase_order drop constraint purchase_order_purchase_type_check;
    alter table public.purchase_order
      add constraint purchase_order_purchase_type_check
      check (
        purchase_type = any (
          array[
            'FACTORY_ORDER'::text,
            'USED_CONTAINER'::text,
            'NEW_CONTAINER'::text
          ]
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_total_planned_qty_check'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_total_planned_qty_check
      check (total_planned_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_total_received_qty_check'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_total_received_qty_check
      check (total_received_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_total_available_qty_check'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_total_available_qty_check
      check (total_available_qty >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_item_location_city_id_fkey'
      and conrelid = 'public.purchase_order_item'::regclass
  ) then
    alter table public.purchase_order_item
      add constraint purchase_order_item_location_city_id_fkey
      foreign key (location_city_id) references public.cities(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_item_depot_id_fkey'
      and conrelid = 'public.purchase_order_item'::regclass
  ) then
    alter table public.purchase_order_item
      add constraint purchase_order_item_depot_id_fkey
      foreign key (depot_id) references public.depots(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_item_yom_check'
      and conrelid = 'public.purchase_order_item'::regclass
  ) then
    alter table public.purchase_order_item
      add constraint purchase_order_item_yom_check
      check (yom is null or yom between 1900 and 2100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_item_locking_bars_count_check'
      and conrelid = 'public.purchase_order_item'::regclass
  ) then
    alter table public.purchase_order_item
      add constraint purchase_order_item_locking_bars_count_check
      check (locking_bars_count is null or locking_bars_count in (3, 4));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_item_vents_count_check'
      and conrelid = 'public.purchase_order_item'::regclass
  ) then
    alter table public.purchase_order_item
      add constraint purchase_order_item_vents_count_check
      check (vents_count is null or vents_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_container_location_city_id_fkey'
      and conrelid = 'public.purchase_order_container'::regclass
  ) then
    alter table public.purchase_order_container
      add constraint purchase_order_container_location_city_id_fkey
      foreign key (location_city_id) references public.cities(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_container_yom_check'
      and conrelid = 'public.purchase_order_container'::regclass
  ) then
    alter table public.purchase_order_container
      add constraint purchase_order_container_yom_check
      check (yom is null or yom between 1900 and 2100);
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_container_item_status_check'
      and conrelid = 'public.purchase_order_container'::regclass
  ) then
    alter table public.purchase_order_container
      drop constraint purchase_order_container_item_status_check;
  end if;

  alter table public.purchase_order_container
    add constraint purchase_order_container_item_status_check
    check (
      item_status = any (
        array[
          'PLANNED'::text,
          'BOX_NO_ASSIGNED'::text,
          'OFFLINED'::text,
          'INBOUND'::text,
          'READY'::text,
          'PICKED_UP'::text,
          'CANCELLED'::text
        ]
      )
    );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_container_container_status_check'
      and conrelid = 'public.purchase_order_container'::regclass
  ) then
    alter table public.purchase_order_container
      add constraint purchase_order_container_container_status_check
      check (
        container_status = any (
          array[
            'PLANNED'::text,
            'READY'::text,
            'PICKED_UP'::text,
            'CANCELLED'::text
          ]
        )
      );
  end if;
end
$$;

create index if not exists idx_purchase_order_supplier_id_vendors
  on public.purchase_order(supplier_id);

create index if not exists idx_purchase_order_owner_id
  on public.purchase_order(owner_id);

create index if not exists idx_purchase_order_buyer_id
  on public.purchase_order(buyer_id);

create index if not exists idx_purchase_order_payment_mode
  on public.purchase_order(payment_mode);

create index if not exists idx_purchase_order_item_location_city_id
  on public.purchase_order_item(location_city_id);

create index if not exists idx_purchase_order_item_depot_id_v2
  on public.purchase_order_item(depot_id);

create index if not exists idx_purchase_order_container_location_city_id
  on public.purchase_order_container(location_city_id);

create index if not exists idx_purchase_order_container_container_status
  on public.purchase_order_container(container_status);

create or replace function public.purchase_order_sync_vendor_snapshot()
returns trigger
language plpgsql
as $$
declare
  v_vendor public.vendors%rowtype;
begin
  if new.supplier_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' or new.supplier_id is distinct from old.supplier_id then
    select *
      into v_vendor
      from public.vendors
      where id = new.supplier_id;

    if not found then
      raise exception 'Vendor % not found', new.supplier_id;
    end if;

    new.settlement_payment_term := v_vendor.settlement_payment_term;
    new.settlement_credit_days := v_vendor.settlement_credit_days;
    new.settlement_advance_payment_percentage := v_vendor.settlement_advance_payment_percentage;
    new.settlement_balance_trigger_event := v_vendor.settlement_balance_trigger_event;
    new.settlement_currency := coalesce(v_vendor.settlement_currency, new.settlement_currency, 'USD');
    new.settlement_prepayment_pool := v_vendor.settlement_prepayment_pool;
    new.settlement_prepayment_threshold := v_vendor.settlement_prepayment_threshold;
    new.settlement_current_prepaid_balance := v_vendor.settlement_current_prepaid_balance;
    new.vendor_bank_information := jsonb_build_object(
      'bank_account_name', v_vendor.bank_account_name,
      'bank_account_number', v_vendor.bank_account_number,
      'bank_name', v_vendor.bank_name,
      'bank_code', v_vendor.bank_code,
      'bank_address', v_vendor.bank_address,
      'swift_code', v_vendor.swift_code
    );
  end if;

  return new;
end
$$;

create or replace function public.purchase_order_item_derive_fields()
returns trigger
language plpgsql
as $$
begin
  new.financial_cost := coalesce(new.financial_cost, new.operation_cost, 0);
  new.line_amount := round(
    coalesce(new.planned_qty, 0)::numeric
    * coalesce(nullif(new.settlement_price, 0), new.unit_price, 0),
    2
  );
  return new;
end
$$;

create or replace function public.purchase_order_container_sync_status_fields()
returns trigger
language plpgsql
as $$
begin
  if new.container_status is null and new.item_status is not null then
    new.container_status := case
      when new.item_status = 'OFFLINED' then 'READY'
      when new.item_status = 'INBOUND' then 'PICKED_UP'
      when new.item_status = 'CANCELLED' then 'CANCELLED'
      else 'PLANNED'
    end;
  end if;

  if new.container_status is not null and (tg_op = 'INSERT' or new.container_status is distinct from old.container_status) then
    new.item_status := case new.container_status
      when 'READY' then 'OFFLINED'
      when 'PICKED_UP' then 'INBOUND'
      when 'CANCELLED' then 'CANCELLED'
      else 'PLANNED'
    end;
  elsif new.item_status is not null and (tg_op = 'INSERT' or new.item_status is distinct from old.item_status) then
    new.container_status := case
      when new.item_status = 'OFFLINED' then 'READY'
      when new.item_status = 'INBOUND' then 'PICKED_UP'
      when new.item_status = 'CANCELLED' then 'CANCELLED'
      else 'PLANNED'
    end;
  end if;

  if new.actual_offline_time is not null then
    new.offline_date := new.actual_offline_time::date;
    if new.container_status = 'PLANNED' then
      new.container_status := 'READY';
      new.item_status := 'OFFLINED';
    end if;
  end if;

  return new;
end
$$;

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
    coalesce(count(*) filter (where container_status = 'PICKED_UP'), 0),
    coalesce(count(*) filter (where actual_offline_time is not null), 0)
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

create or replace function public.purchase_order_after_item_or_container_change()
returns trigger
language plpgsql
as $$
declare
  v_purchase_order_id uuid;
begin
  v_purchase_order_id := coalesce(new.purchase_order_id, old.purchase_order_id);
  if v_purchase_order_id is not null then
    perform public.purchase_order_refresh_totals(v_purchase_order_id);
  end if;
  return null;
end
$$;

create or replace function public.purchase_finance_sync_from_order()
returns trigger
language plpgsql
as $$
begin
  if new.order_status = 'DRAFT' then
    delete from public.purchase_finance_record
    where purchase_order_id = new.id;
    return new;
  end if;

  insert into public.purchase_finance_record (
    purchase_order_id,
    order_no,
    supplier_id,
    payment_mode,
    contract_number,
    invoice_number,
    payment_account,
    due_date,
    settlement_payment_term,
    settlement_credit_days,
    settlement_advance_payment_percentage,
    settlement_balance_trigger_event,
    settlement_currency,
    settlement_prepayment_pool,
    settlement_prepayment_threshold,
    settlement_current_prepaid_balance,
    vendor_bank_information,
    grand_total,
    total_amount_paid,
    total_amount_unpaid,
    finance_status
  )
  values (
    new.id,
    new.order_no,
    new.supplier_id,
    new.payment_mode,
    new.contract_number,
    new.invoice_number,
    new.payment_account,
    new.due_date,
    new.settlement_payment_term,
    new.settlement_credit_days,
    new.settlement_advance_payment_percentage,
    new.settlement_balance_trigger_event,
    new.settlement_currency,
    new.settlement_prepayment_pool,
    new.settlement_prepayment_threshold,
    new.settlement_current_prepaid_balance,
    new.vendor_bank_information,
    coalesce(new.grand_total, 0),
    coalesce(new.total_amount_paid, 0),
    coalesce(new.total_amount_unpaid, 0),
    case
      when new.order_status = 'CANCELLED' then 'VOID'
      when coalesce(new.total_amount_unpaid, 0) = 0 and coalesce(new.grand_total, 0) > 0 then 'PAID'
      when coalesce(new.total_amount_paid, 0) > 0 then 'PARTIALLY_PAID'
      else 'PENDING'
    end
  )
  on conflict (purchase_order_id) do update
  set order_no = excluded.order_no,
      supplier_id = excluded.supplier_id,
      payment_mode = excluded.payment_mode,
      contract_number = excluded.contract_number,
      invoice_number = excluded.invoice_number,
      payment_account = excluded.payment_account,
      due_date = excluded.due_date,
      settlement_payment_term = excluded.settlement_payment_term,
      settlement_credit_days = excluded.settlement_credit_days,
      settlement_advance_payment_percentage = excluded.settlement_advance_payment_percentage,
      settlement_balance_trigger_event = excluded.settlement_balance_trigger_event,
      settlement_currency = excluded.settlement_currency,
      settlement_prepayment_pool = excluded.settlement_prepayment_pool,
      settlement_prepayment_threshold = excluded.settlement_prepayment_threshold,
      settlement_current_prepaid_balance = excluded.settlement_current_prepaid_balance,
      vendor_bank_information = excluded.vendor_bank_information,
      grand_total = excluded.grand_total,
      total_amount_paid = excluded.total_amount_paid,
      total_amount_unpaid = excluded.total_amount_unpaid,
      finance_status = excluded.finance_status,
      updated_at = timezone('utc', now());

  return new;
end
$$;

create or replace function public.purchase_order_material_type_resolve_vendor()
returns trigger
language plpgsql
as $$
declare
  v_purchase_type text;
  v_material_vendor public.material_vendors%rowtype;
begin
  select purchase_type
    into v_purchase_type
    from public.purchase_order
    where id = new.purchase_order_id;

  if v_purchase_type is distinct from 'FACTORY_ORDER' then
    raise exception 'Material types are only allowed for FACTORY_ORDER purchase orders';
  end if;

  if new.material_vendor_id is null then
    select *
      into v_material_vendor
      from public.material_vendors
      where material_category = new.material_type
        and is_default_vendor = true
        and status <> 'Deleted'
      limit 1;

    if not found then
      raise exception 'No default material vendor configured for material type %', new.material_type;
    end if;

    new.material_vendor_id := v_material_vendor.id;
    new.material_vendor_name_snapshot := coalesce(v_material_vendor.company_name, v_material_vendor.legal_company_name);
    new.material_vendor_code_snapshot := v_material_vendor.vendor_code;
  else
    select *
      into v_material_vendor
      from public.material_vendors
      where id = new.material_vendor_id;

    if not found then
      raise exception 'Material vendor % not found', new.material_vendor_id;
    end if;

    if v_material_vendor.material_category <> new.material_type then
      raise exception 'Material vendor % does not match material type %', new.material_vendor_id, new.material_type;
    end if;

    new.material_vendor_name_snapshot := coalesce(new.material_vendor_name_snapshot, coalesce(v_material_vendor.company_name, v_material_vendor.legal_company_name));
    new.material_vendor_code_snapshot := coalesce(new.material_vendor_code_snapshot, v_material_vendor.vendor_code);
  end if;

  return new;
end
$$;

drop trigger if exists trg_purchase_order_sync_vendor_snapshot on public.purchase_order;
create trigger trg_purchase_order_sync_vendor_snapshot
before insert or update of supplier_id on public.purchase_order
for each row execute function public.purchase_order_sync_vendor_snapshot();

drop trigger if exists trg_purchase_order_item_derive_fields on public.purchase_order_item;
create trigger trg_purchase_order_item_derive_fields
before insert or update of planned_qty, unit_price, settlement_price, financial_cost, operation_cost
on public.purchase_order_item
for each row execute function public.purchase_order_item_derive_fields();

drop trigger if exists trg_purchase_order_container_sync_status_fields on public.purchase_order_container;
create trigger trg_purchase_order_container_sync_status_fields
before insert or update of item_status, container_status, actual_offline_time
on public.purchase_order_container
for each row execute function public.purchase_order_container_sync_status_fields();

drop trigger if exists trg_purchase_order_refresh_from_item on public.purchase_order_item;
create trigger trg_purchase_order_refresh_from_item
after insert or update or delete on public.purchase_order_item
for each row execute function public.purchase_order_after_item_or_container_change();

drop trigger if exists trg_purchase_order_refresh_from_container on public.purchase_order_container;
create trigger trg_purchase_order_refresh_from_container
after insert or update or delete on public.purchase_order_container
for each row execute function public.purchase_order_after_item_or_container_change();

drop trigger if exists trg_purchase_finance_sync_from_order on public.purchase_order;
create trigger trg_purchase_finance_sync_from_order
after insert or update of order_no, order_status, supplier_id, payment_mode, contract_number, invoice_number, payment_account, due_date, settlement_payment_term, settlement_credit_days, settlement_advance_payment_percentage, settlement_balance_trigger_event, settlement_currency, settlement_prepayment_pool, settlement_prepayment_threshold, settlement_current_prepaid_balance, vendor_bank_information, grand_total, total_amount_paid, total_amount_unpaid
on public.purchase_order
for each row execute function public.purchase_finance_sync_from_order();

drop trigger if exists trg_purchase_order_material_type_resolve_vendor on public.purchase_order_material_type;
create trigger trg_purchase_order_material_type_resolve_vendor
before insert or update of purchase_order_id, material_type, material_vendor_id
on public.purchase_order_material_type
for each row execute function public.purchase_order_material_type_resolve_vendor();

drop trigger if exists trg_purchase_order_material_type_updated_at on public.purchase_order_material_type;
create trigger trg_purchase_order_material_type_updated_at
before update on public.purchase_order_material_type
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_finance_record_updated_at on public.purchase_finance_record;
create trigger trg_purchase_finance_record_updated_at
before update on public.purchase_finance_record
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.purchase_order_material_type to anon;
grant all on table public.purchase_order_material_type to authenticated;
grant all on table public.purchase_order_material_type to service_role;

grant select, insert, update, delete on table public.purchase_finance_record to anon;
grant all on table public.purchase_finance_record to authenticated;
grant all on table public.purchase_finance_record to service_role;

alter table public.purchase_order_material_type enable row level security;
alter table public.purchase_finance_record enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'purchase_order_material_type'
      and policyname = 'purchase_order_material_type_public_all'
  ) then
    create policy purchase_order_material_type_public_all
      on public.purchase_order_material_type
      for all
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'purchase_finance_record'
      and policyname = 'purchase_finance_record_public_all'
  ) then
    create policy purchase_finance_record_public_all
      on public.purchase_finance_record
      for all
      to public
      using (true)
      with check (true);
  end if;
end
$$;

notify pgrst, 'reload schema';
