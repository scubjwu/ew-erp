BEGIN;

INSERT INTO public.users (id, email, full_name, role, created_at, updated_at, user_code, status, phone, department, job_title, last_login_at, remarks) VALUES ('7a2b2ce8-e87a-4cc0-9165-52a6996fd701', 'shiyun.pan@ew-logistics.com', 'Shiyun Pan', 'Sales', '2026-04-01T18:00:00+00:00', '2026-04-03T04:24:23.915266+00:00', 'SP0001', 'Active', '+1-415-555-0101', 'Commercial', 'Sales Manager', '2026-04-01T18:00:00+00:00', 'Seed user for partner buyer and PIC selection.');
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at, user_code, status, phone, department, job_title, last_login_at, remarks) VALUES ('9b2b0c18-0101-43f4-a5bf-8d9128eaa7c2', 'palaya.pan@ew-logistics.com', 'Palaya Pan', 'Sales', '2026-04-01T18:00:00+00:00', '2026-04-03T04:24:23.915266+00:00', 'PP0001', 'Active', '+1-415-555-0102', 'Commercial', 'Account Executive', '2026-04-01T18:00:00+00:00', 'Seed user for partner PIC lookup coverage.');

COMMIT;

-- rows exported: 2
