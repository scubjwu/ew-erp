BEGIN;

INSERT INTO public.lessee_attachment_links (
  id,
  lessee_id,
  url,
  remark,
  created_at,
  updated_at
) VALUES
  (
    '7de36e4f-3860-4ed0-9261-5f91f26b6001',
    '6291eb9e-3e69-4515-8f0a-bbded37f4001',
    'https://example.com/lessees/bluewave-master-lease.pdf',
    'Master lease sample for tab testing.',
    '2026-04-01T18:17:00+00:00',
    '2026-04-01T18:17:00+00:00'
  ),
  (
    '75d5377a-e108-49ca-88c9-f7db6a5a6002',
    '77c1cc22-54e5-4bfa-bc8c-6d5165cc4002',
    'https://example.com/lessees/harbor-kyc.pdf',
    'KYC sample document.',
    '2026-04-01T18:17:30+00:00',
    '2026-04-01T18:17:30+00:00'
  )
ON CONFLICT (id) DO UPDATE
SET
  lessee_id = EXCLUDED.lessee_id,
  url = EXCLUDED.url,
  remark = EXCLUDED.remark,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- rows seeded: 2
