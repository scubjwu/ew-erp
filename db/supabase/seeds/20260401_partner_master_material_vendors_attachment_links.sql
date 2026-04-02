BEGIN;

INSERT INTO public.material_vendor_attachment_links (
  id,
  material_vendor_id,
  url,
  remark,
  created_at,
  updated_at
) VALUES
  (
    'eb1784da-5234-45b9-98f8-4c35ae737001',
    'dcd7d69f-9137-41aa-8f87-5d20c0c13001',
    'https://example.com/material-vendors/paint-msds.pdf',
    'MSDS sample for paint category.',
    '2026-04-01T18:13:00+00:00',
    '2026-04-01T18:13:00+00:00'
  ),
  (
    '40517f29-f4e0-432d-a5d5-6359e2de7002',
    '5f4f6558-c670-40db-aeb0-9da332fe3002',
    'https://example.com/material-vendors/flooring-catalog.pdf',
    'Catalog sample for flooring materials.',
    '2026-04-01T18:13:30+00:00',
    '2026-04-01T18:13:30+00:00'
  )
ON CONFLICT (id) DO UPDATE
SET
  material_vendor_id = EXCLUDED.material_vendor_id,
  url = EXCLUDED.url,
  remark = EXCLUDED.remark,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- rows seeded: 2
