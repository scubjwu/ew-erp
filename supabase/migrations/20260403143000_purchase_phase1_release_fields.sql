alter table if exists public.purchase_order
  add column if not exists freeday integer,
  add column if not exists vendor_release_number text,
  add column if not exists vendor_release_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_freeday_check'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order
      add constraint purchase_order_freeday_check
      check (freeday is null or freeday >= 0);
  end if;
end $$;
