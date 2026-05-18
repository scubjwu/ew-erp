comment on column public.financial_exchange_rate.rate_date is
  'Start From / effective-from date. The rate stays active until the next row for the same currency direction becomes effective.';

alter table public.financial_exchange_rate
  drop constraint if exists financial_exchange_rate_from_currency_check;

alter table public.financial_exchange_rate
  add constraint financial_exchange_rate_from_currency_check
  check (from_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD', 'GBP', 'RUB'));

alter table public.financial_exchange_rate
  drop constraint if exists financial_exchange_rate_to_currency_check;

alter table public.financial_exchange_rate
  add constraint financial_exchange_rate_to_currency_check
  check (to_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD', 'GBP', 'RUB'));

alter table public.transfer_order
  drop constraint if exists transfer_order_header_currency_check;

alter table public.transfer_order
  add constraint transfer_order_header_currency_check
  check (header_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD', 'GBP', 'RUB'));

alter table public.transfer_order
  drop constraint if exists transfer_order_item_cost_currency_check;

alter table public.transfer_order
  add constraint transfer_order_item_cost_currency_check
  check (item_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD', 'GBP', 'RUB'));

alter table public.transfer_item
  drop constraint if exists transfer_item_trucking_cost_currency_check;

alter table public.transfer_item
  add constraint transfer_item_trucking_cost_currency_check
  check (trucking_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD', 'GBP', 'RUB'));

alter table public.transfer_item
  drop constraint if exists transfer_item_repair_cost_currency_check;

alter table public.transfer_item
  add constraint transfer_item_repair_cost_currency_check
  check (repair_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD', 'GBP', 'RUB'));

alter table public.transfer_item
  drop constraint if exists transfer_item_damage_claim_currency_check;

alter table public.transfer_item
  add constraint transfer_item_damage_claim_currency_check
  check (damage_claim_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD', 'GBP', 'RUB'));
