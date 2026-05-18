BEGIN;

INSERT INTO public.customers (id, company_name, customer_grade, status, contact_phone, finance_emails, ops_emails, purchasing_emails, credit_limit, credit_term_days, depot_info, created_at, updated_at, customer_custom_id, address, notes, assigned_sales_id, contact_person, assigned_sales, company_name_other_language, region_id) VALUES ('b674b331-799a-4f8a-ac32-b073f37b3617', '艾瑞斯公司', 'C', 'Normal', NULL, '{"palaya@ew-logistics.com"}', '{"palaya@ew-logistics.com"}', '{"palaya@ew-logistics.com"}', 0.0, 3, '{}'::jsonb, '2026-03-31T22:42:20.701313+00:00', '2026-03-31T22:42:20.566+00:00', 'CCYITQ', '深圳宝安', NULL, NULL, 'Palaya Pan', 'Shiyun Pan', 'IRIS Company', NULL);
INSERT INTO public.customers (id, company_name, customer_grade, status, contact_phone, finance_emails, ops_emails, purchasing_emails, credit_limit, credit_term_days, depot_info, created_at, updated_at, customer_custom_id, address, notes, assigned_sales_id, contact_person, assigned_sales, company_name_other_language, region_id) VALUES ('8c80e6c2-a7d4-4930-a14b-17d1b7d1d248', 'ABC Company', 'C', 'Normal', NULL, '{"palaya.pan@gmail.com"}', '{"palaya.pan@gmail.com"}', '{"palaya.pan@gmail.com"}', 0.0, 3, '{}'::jsonb, '2026-03-31T20:32:56.870319+00:00', '2026-03-31T20:32:56.870319+00:00', 'CX3AO2', NULL, NULL, NULL, NULL, 'Shiyun Pan', NULL, NULL);

COMMIT;

-- rows exported: 2
