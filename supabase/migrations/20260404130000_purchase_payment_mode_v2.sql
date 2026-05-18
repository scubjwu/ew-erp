update public.purchase_order
set payment_mode = case payment_mode
  when 'DEPOSIT_BALANCE' then 'ADVANCE_PAYMENT'
  when 'VENDOR_CREDIT' then 'CREDIT'
  else payment_mode
end
where payment_mode in ('DEPOSIT_BALANCE', 'VENDOR_CREDIT');

update public.purchase_finance_record
set payment_mode = case payment_mode
  when 'DEPOSIT_BALANCE' then 'ADVANCE_PAYMENT'
  when 'VENDOR_CREDIT' then 'CREDIT'
  else payment_mode
end
where payment_mode in ('DEPOSIT_BALANCE', 'VENDOR_CREDIT');

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_payment_mode_check'
      and conrelid = 'public.purchase_order'::regclass
  ) then
    alter table public.purchase_order drop constraint purchase_order_payment_mode_check;
  end if;

  alter table public.purchase_order
    add constraint purchase_order_payment_mode_check
    check (
      payment_mode is null
      or payment_mode = any (
        array[
          'PREPAYMENT'::text,
          'ADVANCE_PAYMENT'::text,
          'CREDIT'::text
        ]
      )
    );

  if exists (
    select 1
    from pg_constraint
    where conname = 'purchase_finance_record_payment_mode_check'
      and conrelid = 'public.purchase_finance_record'::regclass
  ) then
    alter table public.purchase_finance_record drop constraint purchase_finance_record_payment_mode_check;
  end if;

  alter table public.purchase_finance_record
    add constraint purchase_finance_record_payment_mode_check
    check (
      payment_mode is null
      or payment_mode = any (
        array[
          'PREPAYMENT'::text,
          'ADVANCE_PAYMENT'::text,
          'CREDIT'::text
        ]
      )
    );
end $$;
