BEGIN;

INSERT INTO public.vendor_attachment_links (
  id,
  vendor_id,
  url,
  remark,
  created_at,
  updated_at
) VALUES
  (
    '36db2baf-a2df-4d8f-91e6-d267a1483f01',
    'f71328bf-fb55-4d43-8fd8-72e28b87d201',
    'https://example.com/vendors/xhc-business-license.pdf',
    'Business license sample for vendor detail testing.',
    '2026-04-01T18:07:00+00:00',
    '2026-04-01T18:07:00+00:00'
  ),
  (
    '3ea5a94f-770f-4f5b-9002-0a2d8af93f02',
    '2f6a9a61-5d65-4bf7-a0ab-6f429d6e2202',
    'https://example.com/vendors/pacific-bank-proof.pdf',
    'Bank proof document for attachment tab testing.',
    '2026-04-01T18:08:00+00:00',
    '2026-04-01T18:08:00+00:00'
  )
ON CONFLICT (id) DO UPDATE
SET
  vendor_id = EXCLUDED.vendor_id,
  url = EXCLUDED.url,
  remark = EXCLUDED.remark,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- rows seeded: 2
