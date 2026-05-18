GRANT SELECT ON TABLE public.depots TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.depots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.depots TO anon;
GRANT ALL ON TABLE public.depots TO service_role;

ALTER TABLE public.depots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depots'
          AND policyname = 'depots_public_select'
    ) THEN
        CREATE POLICY depots_public_select
            ON public.depots
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depots'
          AND policyname = 'depots_public_insert'
    ) THEN
        CREATE POLICY depots_public_insert
            ON public.depots
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depots'
          AND policyname = 'depots_public_update'
    ) THEN
        CREATE POLICY depots_public_update
            ON public.depots
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
