ALTER TABLE public.container_size_codes
    ADD COLUMN IF NOT EXISTS size_name text;

UPDATE public.container_size_codes
SET size_name = COALESCE(NULLIF(size_name, ''), NULLIF(remark, ''), size_code)
WHERE COALESCE(NULLIF(size_name, ''), '') = '';

GRANT SELECT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.container_size_codes TO anon;
GRANT ALL ON TABLE public.container_size_codes TO authenticated;
GRANT ALL ON TABLE public.container_size_codes TO service_role;

ALTER TABLE public.container_size_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'container_size_codes'
          AND policyname = 'container_size_codes_public_select'
    ) THEN
        CREATE POLICY container_size_codes_public_select
            ON public.container_size_codes
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'container_size_codes'
          AND policyname = 'container_size_codes_public_insert'
    ) THEN
        CREATE POLICY container_size_codes_public_insert
            ON public.container_size_codes
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'container_size_codes'
          AND policyname = 'container_size_codes_public_update'
    ) THEN
        CREATE POLICY container_size_codes_public_update
            ON public.container_size_codes
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
