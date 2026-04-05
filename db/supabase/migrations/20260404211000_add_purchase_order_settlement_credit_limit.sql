alter table public.purchase_order
  add column if not exists settlement_credit_limit numeric(14,2);

alter table public.purchase_order
  drop constraint if exists purchase_order_settlement_credit_limit_check;

alter table public.purchase_order
  add constraint purchase_order_settlement_credit_limit_check check (
    settlement_credit_limit is null or settlement_credit_limit >= 0
  );

notify pgrst, 'reload schema';
