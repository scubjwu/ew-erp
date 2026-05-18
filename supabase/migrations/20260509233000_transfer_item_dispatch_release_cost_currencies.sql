alter table public.transfer_item
  add column if not exists trucking_cost_currency text not null default 'USD',
  add column if not exists repair_cost_currency text not null default 'USD',
  add column if not exists damage_claim_currency text not null default 'USD';

alter table public.transfer_item
  drop constraint if exists transfer_item_trucking_cost_currency_check;

alter table public.transfer_item
  add constraint transfer_item_trucking_cost_currency_check
  check (trucking_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD'));

alter table public.transfer_item
  drop constraint if exists transfer_item_repair_cost_currency_check;

alter table public.transfer_item
  add constraint transfer_item_repair_cost_currency_check
  check (repair_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD'));

alter table public.transfer_item
  drop constraint if exists transfer_item_damage_claim_currency_check;

alter table public.transfer_item
  add constraint transfer_item_damage_claim_currency_check
  check (damage_claim_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD'));
