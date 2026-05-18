grant select, insert, update, delete on table public.transfer_order to anon;
grant all on table public.transfer_order to authenticated;
grant all on table public.transfer_order to service_role;

grant select, insert, update, delete on table public.transfer_item to anon;
grant all on table public.transfer_item to authenticated;
grant all on table public.transfer_item to service_role;

grant select, insert, update, delete on table public.business_cost to anon;
grant all on table public.business_cost to authenticated;
grant all on table public.business_cost to service_role;

grant select, insert, update, delete on table public.business_revenue to anon;
grant all on table public.business_revenue to authenticated;
grant all on table public.business_revenue to service_role;

grant select, insert, update, delete on table public.finance_record to anon;
grant all on table public.finance_record to authenticated;
grant all on table public.finance_record to service_role;

grant select, insert, update, delete on table public.business_invoice to anon;
grant all on table public.business_invoice to authenticated;
grant all on table public.business_invoice to service_role;

grant select, insert, update, delete on table public.business_invoice_item to anon;
grant all on table public.business_invoice_item to authenticated;
grant all on table public.business_invoice_item to service_role;

alter table public.transfer_order enable row level security;
alter table public.transfer_item enable row level security;
alter table public.business_cost enable row level security;
alter table public.business_revenue enable row level security;
alter table public.finance_record enable row level security;
alter table public.business_invoice enable row level security;
alter table public.business_invoice_item enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order'
      and policyname = 'transfer_order_public_select'
  ) then
    create policy "transfer_order_public_select"
      on public.transfer_order
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order'
      and policyname = 'transfer_order_public_insert'
  ) then
    create policy "transfer_order_public_insert"
      on public.transfer_order
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order'
      and policyname = 'transfer_order_public_update'
  ) then
    create policy "transfer_order_public_update"
      on public.transfer_order
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_order'
      and policyname = 'transfer_order_public_delete'
  ) then
    create policy "transfer_order_public_delete"
      on public.transfer_order
      for delete
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_item'
      and policyname = 'transfer_item_public_select'
  ) then
    create policy "transfer_item_public_select"
      on public.transfer_item
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_item'
      and policyname = 'transfer_item_public_insert'
  ) then
    create policy "transfer_item_public_insert"
      on public.transfer_item
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_item'
      and policyname = 'transfer_item_public_update'
  ) then
    create policy "transfer_item_public_update"
      on public.transfer_item
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transfer_item'
      and policyname = 'transfer_item_public_delete'
  ) then
    create policy "transfer_item_public_delete"
      on public.transfer_item
      for delete
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_cost'
      and policyname = 'business_cost_public_select'
  ) then
    create policy "business_cost_public_select"
      on public.business_cost
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_cost'
      and policyname = 'business_cost_public_insert'
  ) then
    create policy "business_cost_public_insert"
      on public.business_cost
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_cost'
      and policyname = 'business_cost_public_update'
  ) then
    create policy "business_cost_public_update"
      on public.business_cost
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_cost'
      and policyname = 'business_cost_public_delete'
  ) then
    create policy "business_cost_public_delete"
      on public.business_cost
      for delete
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_revenue'
      and policyname = 'business_revenue_public_select'
  ) then
    create policy "business_revenue_public_select"
      on public.business_revenue
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_revenue'
      and policyname = 'business_revenue_public_insert'
  ) then
    create policy "business_revenue_public_insert"
      on public.business_revenue
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_revenue'
      and policyname = 'business_revenue_public_update'
  ) then
    create policy "business_revenue_public_update"
      on public.business_revenue
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_revenue'
      and policyname = 'business_revenue_public_delete'
  ) then
    create policy "business_revenue_public_delete"
      on public.business_revenue
      for delete
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_record'
      and policyname = 'finance_record_public_select'
  ) then
    create policy "finance_record_public_select"
      on public.finance_record
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_record'
      and policyname = 'finance_record_public_insert'
  ) then
    create policy "finance_record_public_insert"
      on public.finance_record
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_record'
      and policyname = 'finance_record_public_update'
  ) then
    create policy "finance_record_public_update"
      on public.finance_record
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'finance_record'
      and policyname = 'finance_record_public_delete'
  ) then
    create policy "finance_record_public_delete"
      on public.finance_record
      for delete
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice'
      and policyname = 'business_invoice_public_select'
  ) then
    create policy "business_invoice_public_select"
      on public.business_invoice
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice'
      and policyname = 'business_invoice_public_insert'
  ) then
    create policy "business_invoice_public_insert"
      on public.business_invoice
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice'
      and policyname = 'business_invoice_public_update'
  ) then
    create policy "business_invoice_public_update"
      on public.business_invoice
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice'
      and policyname = 'business_invoice_public_delete'
  ) then
    create policy "business_invoice_public_delete"
      on public.business_invoice
      for delete
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice_item'
      and policyname = 'business_invoice_item_public_select'
  ) then
    create policy "business_invoice_item_public_select"
      on public.business_invoice_item
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice_item'
      and policyname = 'business_invoice_item_public_insert'
  ) then
    create policy "business_invoice_item_public_insert"
      on public.business_invoice_item
      for insert
      to public
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice_item'
      and policyname = 'business_invoice_item_public_update'
  ) then
    create policy "business_invoice_item_public_update"
      on public.business_invoice_item
      for update
      to public
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_invoice_item'
      and policyname = 'business_invoice_item_public_delete'
  ) then
    create policy "business_invoice_item_public_delete"
      on public.business_invoice_item
      for delete
      to public
      using (true);
  end if;
end
$$;
