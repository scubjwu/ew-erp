alter table public.transfer_item
  add column if not exists trucking_cost numeric(18,2) not null default 0;

alter table public.transfer_item
  drop constraint if exists transfer_item_trucking_cost_nonnegative_check;

alter table public.transfer_item
  add constraint transfer_item_trucking_cost_nonnegative_check
  check (trucking_cost >= 0);
