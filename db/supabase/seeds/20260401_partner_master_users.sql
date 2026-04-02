BEGIN;

INSERT INTO public.users (id, email, full_name, role, created_at)
VALUES
  ('7a2b2ce8-e87a-4cc0-9165-52a6996fd701', 'shiyun.pan@ew-logistics.com', 'Shiyun Pan', 'Sales', '2026-04-01T18:00:00+00:00'),
  ('9b2b0c18-0101-43f4-a5bf-8d9128eaa7c2', 'palaya.pan@ew-logistics.com', 'Palaya Pan', 'Sales', '2026-04-01T18:00:00+00:00')
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

COMMIT;

-- rows seeded: 2
