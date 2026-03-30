GRANT SELECT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.company_profiles TO anon;
GRANT ALL ON TABLE public.company_profiles TO authenticated;
GRANT ALL ON TABLE public.company_profiles TO service_role;

GRANT SELECT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.company_bank_accounts TO anon;
GRANT ALL ON TABLE public.company_bank_accounts TO authenticated;
GRANT ALL ON TABLE public.company_bank_accounts TO service_role;

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_bank_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'company_profiles'
          AND policyname = 'Enable full access for company_profiles'
    ) THEN
        CREATE POLICY "Enable full access for company_profiles"
            ON public.company_profiles
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'company_bank_accounts'
          AND policyname = 'Enable full access for company_bank_accounts'
    ) THEN
        CREATE POLICY "Enable full access for company_bank_accounts"
            ON public.company_bank_accounts
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
