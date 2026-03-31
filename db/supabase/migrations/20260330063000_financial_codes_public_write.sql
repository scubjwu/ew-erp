GRANT SELECT ON TABLE public.cost_codes TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cost_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cost_codes TO anon;
GRANT ALL ON TABLE public.cost_codes TO service_role;

GRANT SELECT ON TABLE public.revenue_codes TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.revenue_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.revenue_codes TO anon;
GRANT ALL ON TABLE public.revenue_codes TO service_role;

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cost_codes'
          AND policyname = 'cost_codes_public_select'
    ) THEN
        CREATE POLICY cost_codes_public_select
            ON public.cost_codes
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cost_codes'
          AND policyname = 'cost_codes_public_insert'
    ) THEN
        CREATE POLICY cost_codes_public_insert
            ON public.cost_codes
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cost_codes'
          AND policyname = 'cost_codes_public_update'
    ) THEN
        CREATE POLICY cost_codes_public_update
            ON public.cost_codes
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'revenue_codes'
          AND policyname = 'revenue_codes_public_select'
    ) THEN
        CREATE POLICY revenue_codes_public_select
            ON public.revenue_codes
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'revenue_codes'
          AND policyname = 'revenue_codes_public_insert'
    ) THEN
        CREATE POLICY revenue_codes_public_insert
            ON public.revenue_codes
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'revenue_codes'
          AND policyname = 'revenue_codes_public_update'
    ) THEN
        CREATE POLICY revenue_codes_public_update
            ON public.revenue_codes
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
