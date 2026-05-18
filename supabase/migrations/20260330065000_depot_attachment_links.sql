CREATE TABLE IF NOT EXISTS public.depot_attachment_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_id uuid NOT NULL REFERENCES public.depots(id) ON DELETE CASCADE,
    url text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT depot_attachment_links_url_check CHECK (url <> '')
);

CREATE INDEX IF NOT EXISTS idx_depot_attachment_links_depot_id
ON public.depot_attachment_links(depot_id);

DROP TRIGGER IF EXISTS trg_depot_attachment_links_updated_at ON public.depot_attachment_links;
CREATE TRIGGER trg_depot_attachment_links_updated_at
BEFORE UPDATE ON public.depot_attachment_links
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON TABLE public.depot_attachment_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.depot_attachment_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.depot_attachment_links TO anon;
GRANT ALL ON TABLE public.depot_attachment_links TO service_role;

ALTER TABLE public.depot_attachment_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depot_attachment_links'
          AND policyname = 'depot_attachment_links_public_select'
    ) THEN
        CREATE POLICY depot_attachment_links_public_select
            ON public.depot_attachment_links
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depot_attachment_links'
          AND policyname = 'depot_attachment_links_public_insert'
    ) THEN
        CREATE POLICY depot_attachment_links_public_insert
            ON public.depot_attachment_links
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depot_attachment_links'
          AND policyname = 'depot_attachment_links_public_update'
    ) THEN
        CREATE POLICY depot_attachment_links_public_update
            ON public.depot_attachment_links
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depot_attachment_links'
          AND policyname = 'depot_attachment_links_public_delete'
    ) THEN
        CREATE POLICY depot_attachment_links_public_delete
            ON public.depot_attachment_links
            FOR DELETE
            TO public
            USING (true);
    END IF;
END $$;
