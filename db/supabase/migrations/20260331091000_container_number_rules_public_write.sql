GRANT SELECT ON TABLE public.container_number_rules TO anon;
GRANT INSERT, UPDATE ON TABLE public.container_number_rules TO anon;
GRANT ALL ON TABLE public.container_number_rules TO authenticated;
GRANT ALL ON TABLE public.container_number_rules TO service_role;

ALTER TABLE public.container_number_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'container_number_rules'
          AND policyname = 'container_number_rules_public_select'
    ) THEN
        CREATE POLICY container_number_rules_public_select
            ON public.container_number_rules
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'container_number_rules'
          AND policyname = 'container_number_rules_public_insert'
    ) THEN
        CREATE POLICY container_number_rules_public_insert
            ON public.container_number_rules
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'container_number_rules'
          AND policyname = 'container_number_rules_public_update'
    ) THEN
        CREATE POLICY container_number_rules_public_update
            ON public.container_number_rules
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
