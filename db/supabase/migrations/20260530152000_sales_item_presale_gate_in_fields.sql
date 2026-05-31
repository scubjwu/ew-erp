alter table if exists public.sales_item
  add column if not exists sales_delivery_id uuid,
  add column if not exists gate_in_date date,
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_item_sales_delivery_id_fkey'
      and conrelid = 'public.sales_item'::regclass
  ) then
    alter table public.sales_item
      add constraint sales_item_sales_delivery_id_fkey
      foreign key (sales_delivery_id) references public.sales_delivery(id);
  end if;
end $$;

notify pgrst, 'reload schema';
