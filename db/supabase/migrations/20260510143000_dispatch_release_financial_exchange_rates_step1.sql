create table if not exists public.financial_exchange_rate (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,
  from_currency text not null,
  to_currency text not null,
  exchange_rate numeric(18,8) not null,
  is_active boolean not null default true,
  remark text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financial_exchange_rate_currency_direction_check check (from_currency <> to_currency),
  constraint financial_exchange_rate_positive_rate_check check (exchange_rate > 0),
  constraint financial_exchange_rate_from_currency_check
    check (from_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD')),
  constraint financial_exchange_rate_to_currency_check
    check (to_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD')),
  constraint financial_exchange_rate_rate_date_from_currency_to_currency_key
    unique (rate_date, from_currency, to_currency)
);

drop trigger if exists trg_financial_exchange_rate_updated_at on public.financial_exchange_rate;
create trigger trg_financial_exchange_rate_updated_at
before update on public.financial_exchange_rate
for each row execute function public.set_updated_at();

alter table public.transfer_order
  add column if not exists trucking_cost_total_in_header_currency numeric(18,2) not null default 0,
  add column if not exists repair_cost_total_in_header_currency numeric(18,2) not null default 0,
  add column if not exists damage_claim_total_in_header_currency numeric(18,2) not null default 0;

alter table public.transfer_order
  drop constraint if exists transfer_order_header_currency_check;

alter table public.transfer_order
  add constraint transfer_order_header_currency_check
  check (header_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD'));

alter table public.transfer_order
  drop constraint if exists transfer_order_item_cost_currency_check;

alter table public.transfer_order
  add constraint transfer_order_item_cost_currency_check
  check (item_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD'));

alter table public.transfer_item
  drop constraint if exists transfer_item_trucking_cost_currency_check;

alter table public.transfer_item
  add constraint transfer_item_trucking_cost_currency_check
  check (trucking_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD'));

alter table public.transfer_item
  drop constraint if exists transfer_item_repair_cost_currency_check;

alter table public.transfer_item
  add constraint transfer_item_repair_cost_currency_check
  check (repair_cost_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD'));

alter table public.transfer_item
  drop constraint if exists transfer_item_damage_claim_currency_check;

alter table public.transfer_item
  add constraint transfer_item_damage_claim_currency_check
  check (damage_claim_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD'));
