BEGIN;

INSERT INTO public.purchase_finance_record (id, purchase_order_id, order_no, supplier_id, payment_mode, contract_number, invoice_number, payment_account, due_date, settlement_payment_term, settlement_credit_days, settlement_advance_payment_percentage, settlement_balance_trigger_event, settlement_currency, settlement_prepayment_pool, settlement_prepayment_threshold, settlement_current_prepaid_balance, vendor_bank_information, grand_total, total_amount_paid, total_amount_unpaid, finance_status, created_at, updated_at) VALUES ('a0c508dd-4bb6-4577-bc92-355048a6b8a9', (SELECT id FROM public.purchase_order WHERE order_no = 'PO-RS-1775275409298' LIMIT 1), 'PO-RS-1775275409298', (SELECT id FROM public.vendors WHERE vendor_code = 'S09298' LIMIT 1), 'PREPAYMENT', 'CT-1775275409298', 'INV-1775275409298', 'RESET-SAFE-ACCOUNT-1775275409298', '2026-05-03', NULL, 30, 0.0, NULL, 'USD', false, 0.0, 0.0, '{"bank_code": null, "bank_name": null, "swift_code": null, "bank_address": null, "bank_account_name": null, "bank_account_number": null}'::jsonb, 2500.0, 0.0, 2500.0, 'PENDING', '2026-04-04T04:03:29.707832+00:00', '2026-04-04T04:03:29.77649+00:00') ON CONFLICT (purchase_order_id) DO NOTHING;

COMMIT;

-- rows exported: 1
