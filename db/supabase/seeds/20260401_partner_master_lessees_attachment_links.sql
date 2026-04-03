BEGIN;

INSERT INTO public.lessee_attachment_links (id, lessee_id, url, remark, created_at, updated_at) VALUES ('8b792f5c-af66-455d-9e72-f797cda57d71', '534887df-80ad-4452-99a1-0c7420110b6d', 'https://example.com/reset-safe-lessee-1775254216274.pdf', 'reset-safe-1775254216274', '2026-04-03T22:10:16.525856+00:00', '2026-04-03T22:10:16.525856+00:00');
INSERT INTO public.lessee_attachment_links (id, lessee_id, url, remark, created_at, updated_at) VALUES ('9b03d281-47d1-4b8c-8677-cf064ab8388b', '78bfe801-47a7-45bc-9de7-3fd9b18bc497', 'https://example.com/reset-safe-lessee-1775254099889.pdf', 'reset-safe-1775254099889', '2026-04-03T22:08:20.109637+00:00', '2026-04-03T22:08:20.109637+00:00');

COMMIT;

-- rows exported: 2
