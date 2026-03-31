GRANT SELECT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.operation_price_configs TO anon;
GRANT ALL ON TABLE public.operation_price_configs TO authenticated;
GRANT ALL ON TABLE public.operation_price_configs TO service_role;

GRANT SELECT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.container_size_codes TO anon;

ALTER TABLE public.operation_price_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'operation_price_configs'
          AND policyname = 'operation_price_configs_public_select'
    ) THEN
        CREATE POLICY operation_price_configs_public_select
            ON public.operation_price_configs
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'operation_price_configs'
          AND policyname = 'operation_price_configs_public_insert'
    ) THEN
        CREATE POLICY operation_price_configs_public_insert
            ON public.operation_price_configs
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'operation_price_configs'
          AND policyname = 'operation_price_configs_public_update'
    ) THEN
        CREATE POLICY operation_price_configs_public_update
            ON public.operation_price_configs
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;

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
END $$;
