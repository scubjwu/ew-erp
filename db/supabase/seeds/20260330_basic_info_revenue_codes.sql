BEGIN;

INSERT INTO public.revenue_codes (id, revenue_code, revenue_name, description, sort_order, status, created_by, created_at, updated_at) VALUES ('184dabb7-8d7e-4a3a-b0bf-fa2f2718e5b7', 'OCE', 'Ocean Freight', '海运费：集装箱国际或沿海海上运输的运费收入。', 999, 'ACTIVE', NULL, '2026-03-30T23:35:10.956425+00:00', '2026-03-30T23:35:10.956425+00:00');
INSERT INTO public.revenue_codes (id, revenue_code, revenue_name, description, sort_order, status, created_by, created_at, updated_at) VALUES ('1c7e9991-e914-445c-ab9e-5b09a01f97d6', 'TRK', 'Trucking Revenue', '拖车收入：为客户提供陆路拖运服务所收取的运费收入。', 999, 'ACTIVE', NULL, '2026-03-30T23:35:10.956425+00:00', '2026-03-30T23:35:10.956425+00:00');
INSERT INTO public.revenue_codes (id, revenue_code, revenue_name, description, sort_order, status, created_by, created_at, updated_at) VALUES ('31da5816-ce90-4557-95e4-a4e4f48c0d79', 'OTH', 'Miscellaneous / Others', '其他收入：无法归类到特定科目的杂项收入。', 999, 'ACTIVE', NULL, '2026-03-30T23:35:10.956425+00:00', '2026-03-30T23:35:10.956425+00:00');
INSERT INTO public.revenue_codes (id, revenue_code, revenue_name, description, sort_order, status, created_by, created_at, updated_at) VALUES ('8be125f1-0b8d-4c9f-b019-3b2b44d7e302', 'REN', 'Rental Income', '租柜费：出租集装箱收取的租金收入。', 999, 'ACTIVE', NULL, '2026-03-30T23:35:10.956425+00:00', '2026-03-30T23:35:10.956425+00:00');
INSERT INTO public.revenue_codes (id, revenue_code, revenue_name, description, sort_order, status, created_by, created_at, updated_at) VALUES ('9aeb8f8e-b180-4de1-8d44-49742e69c3d4', 'PUC', 'Pick-up Charge', '调运收入：客户提柜时支付的调拨、提取服务费。', 999, 'ACTIVE', NULL, '2026-03-30T23:35:10.956425+00:00', '2026-03-30T23:35:10.956425+00:00');
INSERT INTO public.revenue_codes (id, revenue_code, revenue_name, description, sort_order, status, created_by, created_at, updated_at) VALUES ('ba39f8e8-0f06-4408-9a19-c6146c755cfc', 'RPR', 'Repair Recovery', '修柜补偿：向客户/租箱人收取的烂箱修理补偿款。', 999, 'ACTIVE', NULL, '2026-03-30T23:35:10.956425+00:00', '2026-03-30T23:35:10.956425+00:00');
INSERT INTO public.revenue_codes (id, revenue_code, revenue_name, description, sort_order, status, created_by, created_at, updated_at) VALUES ('e534495b-cc6d-4e46-afce-5b022ec52939', 'DMR', 'Demurrage / Overdue', '超期费：客户在码头或场站存放集装箱超过免租期产生的逾期费收入。', 999, 'ACTIVE', NULL, '2026-03-30T23:35:10.956425+00:00', '2026-03-30T23:35:10.956425+00:00');

COMMIT;

-- rows exported: 7
