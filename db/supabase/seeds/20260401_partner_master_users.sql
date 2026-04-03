BEGIN;

INSERT INTO public.users (
  id,
  user_code,
  email,
  full_name,
  role,
  status,
  phone,
  department,
  job_title,
  last_login_at,
  remarks,
  created_at
)
VALUES
  (
    '7a2b2ce8-e87a-4cc0-9165-52a6996fd701',
    'SP0001',
    'shiyun.pan@ew-logistics.com',
    'Shiyun Pan',
    'Sales',
    'Active',
    '+1-415-555-0101',
    'Commercial',
    'Sales Manager',
    '2026-04-01T18:00:00+00:00',
    'Seed user for partner buyer and PIC selection.',
    '2026-04-01T18:00:00+00:00'
  ),
  (
    '9b2b0c18-0101-43f4-a5bf-8d9128eaa7c2',
    'PP0001',
    'palaya.pan@ew-logistics.com',
    'Palaya Pan',
    'Sales',
    'Active',
    '+1-415-555-0102',
    'Commercial',
    'Account Executive',
    '2026-04-01T18:00:00+00:00',
    'Seed user for partner PIC lookup coverage.',
    '2026-04-01T18:00:00+00:00'
  )
ON CONFLICT (email) DO UPDATE
SET
  user_code = EXCLUDED.user_code,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  phone = EXCLUDED.phone,
  department = EXCLUDED.department,
  job_title = EXCLUDED.job_title,
  last_login_at = EXCLUDED.last_login_at,
  remarks = EXCLUDED.remarks;

COMMIT;

-- rows seeded: 2
