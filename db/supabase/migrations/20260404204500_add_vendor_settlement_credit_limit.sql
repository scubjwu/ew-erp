alter table public.vendors
  add column if not exists settlement_credit_limit numeric(14,2);

alter table public.vendors
  drop constraint if exists vendors_settlement_credit_limit_check;

alter table public.vendors
  add constraint vendors_settlement_credit_limit_check check (
    settlement_credit_limit is null or settlement_credit_limit >= 0
  );

notify pgrst, 'reload schema';
