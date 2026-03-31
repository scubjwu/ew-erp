GRANT ALL ON TABLE public.cities TO anon;

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cities'
          AND policyname = 'Enable full access for cities'
    ) THEN
        CREATE POLICY "Enable full access for cities"
            ON public.cities
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
