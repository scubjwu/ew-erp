BEGIN;

INSERT INTO public.container_number_rules (id, prefix, serial_length, start_serial, end_serial, current_serial, status, example_container_number, remark, created_by, created_at, updated_at, container_size_code_id) VALUES ('8bdd428d-0432-489d-8a0f-a282a8674fbb', 'EWLU', 6, 700000, 999999, 710256, 'ACTIVE', 'EWLU7102570', NULL, NULL, '2026-03-31T17:45:22.936431+00:00', '2026-04-19T23:47:38.449552+00:00', (SELECT id FROM public.container_size_codes WHERE size_code = '40' LIMIT 1));
INSERT INTO public.container_number_rules (id, prefix, serial_length, start_serial, end_serial, current_serial, status, example_container_number, remark, created_by, created_at, updated_at, container_size_code_id) VALUES ('c87c4aa0-9034-4b11-ba3b-d5ed7435438c', 'EWLU', 6, 200000, 699999, 202908, 'ACTIVE', 'EWLU2029096', NULL, NULL, '2026-03-31T17:45:47.951715+00:00', '2026-04-19T16:42:46.566331+00:00', (SELECT id FROM public.container_size_codes WHERE size_code = '20' LIMIT 1));

COMMIT;

-- rows exported: 2
