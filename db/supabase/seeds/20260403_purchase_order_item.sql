BEGIN;

INSERT INTO public.purchase_order_item (id, purchase_order_id, line_no, color, manufacture_date, machine_type, planned_qty, unit_price, operation_cost, settlement_price, line_amount, flp, lbx, locking_bars, vents, remark, created_at, updated_at, container_type_code_id, container_condition_code_id, container_size_code_id, location_city_id, depot_id, yom, offline_date, financial_cost, locking_bars_count, vents_count) VALUES ('70c89098-4e5a-457e-b99a-66040fdf6d5b', (SELECT id FROM public.purchase_order WHERE order_no = 'PO-RS-1775275409298' LIMIT 1), 1, 'Blue', NULL, 'RS-MODEL', 2, 1200.0, 0.0, 1250.0, 2500.0, true, false, false, false, 'reset-safe-1775275409298', '2026-04-04T04:03:29.742495+00:00', '2026-04-04T04:03:29.742495+00:00', (SELECT id FROM public.container_type_codes WHERE type_code = 'HCHOT' LIMIT 1), (SELECT id FROM public.container_condition_codes WHERE condition_code = 'Brand New' LIMIT 1), (SELECT id FROM public.container_size_codes WHERE size_code = '20' LIMIT 1), (SELECT id FROM public.cities WHERE city_code = 'ADWEN' LIMIT 1), (SELECT id FROM public.depots WHERE depot_code = 'USLAX001' LIMIT 1), 2026, '2026-04-10', 45.0, 4, 2);

COMMIT;

-- rows exported: 1
