alter table public.purchase_finance_record
  add column if not exists settlement_credit_limit numeric(14,2);

alter table public.purchase_finance_record
  drop constraint if exists purchase_finance_record_settlement_credit_limit_check;

alter table public.purchase_finance_record
  add constraint purchase_finance_record_settlement_credit_limit_check check (
    settlement_credit_limit is null or settlement_credit_limit >= 0
  );

create or replace function public.purchase_finance_sync_from_order()
returns trigger
language plpgsql
as $$
begin
  if new.order_status = 'DRAFT' then
    delete from public.purchase_finance_record
    where purchase_order_id = new.id;
    return new;
  end if;

  insert into public.purchase_finance_record (
    purchase_order_id,
    order_no,
    supplier_id,
    payment_mode,
    contract_number,
    invoice_number,
    payment_account,
    due_date,
    settlement_payment_term,
    settlement_credit_days,
    settlement_credit_limit,
    settlement_advance_payment_percentage,
    settlement_balance_trigger_event,
    settlement_currency,
    settlement_prepayment_pool,
    settlement_prepayment_threshold,
    settlement_current_prepaid_balance,
    vendor_bank_information,
    grand_total,
    total_amount_paid,
    total_amount_unpaid,
    finance_status
  )
  values (
    new.id,
    new.order_no,
    new.supplier_id,
    new.payment_mode,
    new.contract_number,
    new.invoice_number,
    new.payment_account,
    new.due_date,
    new.settlement_payment_term,
    new.settlement_credit_days,
    new.settlement_credit_limit,
    new.settlement_advance_payment_percentage,
    new.settlement_balance_trigger_event,
    new.settlement_currency,
    new.settlement_prepayment_pool,
    new.settlement_prepayment_threshold,
    new.settlement_current_prepaid_balance,
    new.vendor_bank_information,
    coalesce(new.grand_total, 0),
    coalesce(new.total_amount_paid, 0),
    coalesce(new.total_amount_unpaid, 0),
    case
      when new.order_status = 'CANCELLED' then 'VOID'
      when coalesce(new.total_amount_unpaid, 0) = 0 and coalesce(new.grand_total, 0) > 0 then 'PAID'
      when coalesce(new.total_amount_paid, 0) > 0 then 'PARTIALLY_PAID'
      else 'PENDING'
    end
  )
  on conflict (purchase_order_id) do update
  set order_no = excluded.order_no,
      supplier_id = excluded.supplier_id,
      payment_mode = excluded.payment_mode,
      contract_number = excluded.contract_number,
      invoice_number = excluded.invoice_number,
      payment_account = excluded.payment_account,
      due_date = excluded.due_date,
      settlement_payment_term = excluded.settlement_payment_term,
      settlement_credit_days = excluded.settlement_credit_days,
      settlement_credit_limit = excluded.settlement_credit_limit,
      settlement_advance_payment_percentage = excluded.settlement_advance_payment_percentage,
      settlement_balance_trigger_event = excluded.settlement_balance_trigger_event,
      settlement_currency = excluded.settlement_currency,
      settlement_prepayment_pool = excluded.settlement_prepayment_pool,
      settlement_prepayment_threshold = excluded.settlement_prepayment_threshold,
      settlement_current_prepaid_balance = excluded.settlement_current_prepaid_balance,
      vendor_bank_information = excluded.vendor_bank_information,
      grand_total = excluded.grand_total,
      total_amount_paid = excluded.total_amount_paid,
      total_amount_unpaid = excluded.total_amount_unpaid,
      finance_status = excluded.finance_status,
      updated_at = timezone('utc', now());

  return new;
end
$$;

notify pgrst, 'reload schema';
