GRANT SELECT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.region_codes TO anon;
GRANT ALL ON TABLE public.region_codes TO authenticated;
GRANT ALL ON TABLE public.region_codes TO service_role;

ALTER TABLE public.region_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'region_codes'
          AND policyname = 'Enable full access for region_codes'
    ) THEN
        CREATE POLICY "Enable full access for region_codes"
            ON public.region_codes
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
