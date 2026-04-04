BEGIN;

INSERT INTO public.vendor_attachment_links (id, vendor_id, url, remark, created_at, updated_at) VALUES ('1e2c0535-aa38-4f95-890d-5c62af4a2193', '973dd0b9-cf1e-405c-b15a-b59264429025', 'https://example.com/reset-safe-vendor-1775282551814.pdf', 'reset-safe-1775282551814', '2026-04-04T06:02:31.897211+00:00', '2026-04-04T06:02:31.897211+00:00');
INSERT INTO public.vendor_attachment_links (id, vendor_id, url, remark, created_at, updated_at) VALUES ('c5d51f8b-4b3b-46c0-bc3f-1ce0efe8cc6b', 'e8bb7c91-797a-41d5-871f-89ae6146bc3b', 'https://example.com/reset-safe-vendor-1775282501708.pdf', 'reset-safe-1775282501708', '2026-04-04T06:01:41.760203+00:00', '2026-04-04T06:01:41.760203+00:00');

COMMIT;

-- rows exported: 2
