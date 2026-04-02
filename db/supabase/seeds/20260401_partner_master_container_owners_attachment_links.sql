BEGIN;

INSERT INTO public.container_owner_attachment_links (
  id,
  container_owner_id,
  url,
  remark,
  created_at,
  updated_at
) VALUES
  (
    '96d00169-d1f4-49ca-ba07-c4b8e9e88001',
    'd2aa003b-50c6-4912-bc04-79b965e57001',
    'https://example.com/container-owners/oceancore-facility-letter.pdf',
    'Facility letter sample for attachment rendering.',
    '2026-04-01T18:21:00+00:00',
    '2026-04-01T18:21:00+00:00'
  ),
  (
    '3de3e478-91a3-4d1a-a56c-49aa8d9f8002',
    '289fb682-1b21-44ce-90e7-178f82047002',
    'https://example.com/container-owners/westharbor-ownership-proof.pdf',
    'Ownership proof sample document.',
    '2026-04-01T18:21:30+00:00',
    '2026-04-01T18:21:30+00:00'
  )
ON CONFLICT (id) DO UPDATE
SET
  container_owner_id = EXCLUDED.container_owner_id,
  url = EXCLUDED.url,
  remark = EXCLUDED.remark,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- rows seeded: 2
