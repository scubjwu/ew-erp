BEGIN;

INSERT INTO public.vendor_attachment_links (id, vendor_id, url, remark, created_at, updated_at) VALUES ('8900bb7a-048a-4b27-ba1b-60667751a96a', '6f736dd0-da39-46f6-933d-26c351827e6f', 'https://example.com/reset-safe-vendor-1775254099889.pdf', 'reset-safe-1775254099889', '2026-04-03T22:08:20.034702+00:00', '2026-04-03T22:08:20.034702+00:00');
INSERT INTO public.vendor_attachment_links (id, vendor_id, url, remark, created_at, updated_at) VALUES ('cc7ce249-79bc-4866-acf7-9896601cb9d5', '4f31c50c-4e34-41c0-9f22-5b855055c552', 'https://example.com/reset-safe-vendor-1775254216274.pdf', 'reset-safe-1775254216274', '2026-04-03T22:10:16.426789+00:00', '2026-04-03T22:10:16.426789+00:00');

COMMIT;

-- rows exported: 2
