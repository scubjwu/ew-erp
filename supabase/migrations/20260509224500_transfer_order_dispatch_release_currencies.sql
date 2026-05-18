alter table public.transfer_order
  add column if not exists header_currency text not null default 'USD',
  add column if not exists item_cost_currency text not null default 'USD';

alter table public.transfer_order
  drop constraint if exists transfer_order_header_currency_check;

alter table public.transfer_order
  add constraint transfer_order_header_currency_check
  check (header_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD'));

alter table public.transfer_order
  drop constraint if exists transfer_order_item_cost_currency_check;

alter table public.transfer_order
  add constraint transfer_order_item_cost_currency_check
  check (item_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD'));
