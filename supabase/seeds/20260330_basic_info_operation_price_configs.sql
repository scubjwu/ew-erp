BEGIN;

INSERT INTO public.operation_price_configs (id, container_size_code_id, container_condition_code_id, addon_price, currency, effective_from, effective_to, status, remark, created_by, updated_by, created_at, updated_at) VALUES ('0dfdd63e-68e0-4eda-a655-d46afbbc63ef', (SELECT id FROM public.container_size_codes WHERE size_code = '40' LIMIT 1), (SELECT id FROM public.container_condition_codes WHERE condition_code = 'Brand New' LIMIT 1), 20.0, 'USD', '2026-01-01', '2026-12-31', 'ACTIVE', NULL, NULL, NULL, '2026-03-31T16:43:48.493942+00:00', '2026-03-31T16:43:48.493942+00:00');
INSERT INTO public.operation_price_configs (id, container_size_code_id, container_condition_code_id, addon_price, currency, effective_from, effective_to, status, remark, created_by, updated_by, created_at, updated_at) VALUES ('bdd55d63-038b-4476-9c97-7ecde8981ad0', (SELECT id FROM public.container_size_codes WHERE size_code = '20' LIMIT 1), (SELECT id FROM public.container_condition_codes WHERE condition_code = 'Brand New' LIMIT 1), 10.0, 'USD', '2026-01-01', '2026-12-31', 'ACTIVE', NULL, NULL, NULL, '2026-03-31T16:43:08.883082+00:00', '2026-03-31T16:43:08.883082+00:00');

COMMIT;

-- rows exported: 2
