BEGIN;

INSERT INTO public.purchase_order_material_type (id, purchase_order_id, material_type, material_vendor_id, material_vendor_name_snapshot, material_vendor_code_snapshot, created_at, updated_at) VALUES ('2caa7f82-b438-4a43-9cfa-53116b14803b', (SELECT id FROM public.purchase_order WHERE order_no = 'PO-RS-1775275409298' LIMIT 1), '地板', (SELECT id FROM public.material_vendors WHERE vendor_code = 'DB0001' LIMIT 1), 'Evergreen Flooring', 'DB0001', '2026-04-04T04:03:29.801884+00:00', '2026-04-04T04:03:29.801884+00:00');

COMMIT;

-- rows exported: 1
