DO $$
DECLARE
    target_table text;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'company_profiles',
        'company_bank_accounts',
        'region_codes',
        'cities',
        'depots',
        'cost_codes',
        'revenue_codes',
        'container_condition_codes',
        'container_size_codes',
        'container_type_codes',
        'operation_price_configs',
        'container_number_rules'
    ]
    LOOP
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', target_table);
        EXECUTE format('GRANT INSERT, UPDATE ON TABLE public.%I TO anon', target_table);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated', target_table);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', target_table);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.depot_attachment_links TO anon;
GRANT ALL ON TABLE public.depot_attachment_links TO authenticated;
GRANT ALL ON TABLE public.depot_attachment_links TO service_role;
ALTER TABLE public.depot_attachment_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.depot_additional_costs TO anon;
GRANT ALL ON TABLE public.depot_additional_costs TO authenticated;
GRANT ALL ON TABLE public.depot_additional_costs TO service_role;
ALTER TABLE public.depot_additional_costs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'company_profiles' AND policyname = 'company_profiles_public_select'
    ) THEN
        CREATE POLICY company_profiles_public_select
            ON public.company_profiles FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'company_profiles' AND policyname = 'company_profiles_public_insert'
    ) THEN
        CREATE POLICY company_profiles_public_insert
            ON public.company_profiles FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'company_profiles' AND policyname = 'company_profiles_public_update'
    ) THEN
        CREATE POLICY company_profiles_public_update
            ON public.company_profiles FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'company_bank_accounts' AND policyname = 'company_bank_accounts_public_select'
    ) THEN
        CREATE POLICY company_bank_accounts_public_select
            ON public.company_bank_accounts FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'company_bank_accounts' AND policyname = 'company_bank_accounts_public_insert'
    ) THEN
        CREATE POLICY company_bank_accounts_public_insert
            ON public.company_bank_accounts FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'company_bank_accounts' AND policyname = 'company_bank_accounts_public_update'
    ) THEN
        CREATE POLICY company_bank_accounts_public_update
            ON public.company_bank_accounts FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'region_codes' AND policyname = 'region_codes_public_select'
    ) THEN
        CREATE POLICY region_codes_public_select
            ON public.region_codes FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'region_codes' AND policyname = 'region_codes_public_insert'
    ) THEN
        CREATE POLICY region_codes_public_insert
            ON public.region_codes FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'region_codes' AND policyname = 'region_codes_public_update'
    ) THEN
        CREATE POLICY region_codes_public_update
            ON public.region_codes FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'cities' AND policyname = 'cities_public_select'
    ) THEN
        CREATE POLICY cities_public_select
            ON public.cities FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'cities' AND policyname = 'cities_public_insert'
    ) THEN
        CREATE POLICY cities_public_insert
            ON public.cities FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'cities' AND policyname = 'cities_public_update'
    ) THEN
        CREATE POLICY cities_public_update
            ON public.cities FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_attachment_links' AND policyname = 'depot_attachment_links_public_select'
    ) THEN
        CREATE POLICY depot_attachment_links_public_select
            ON public.depot_attachment_links FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_attachment_links' AND policyname = 'depot_attachment_links_public_insert'
    ) THEN
        CREATE POLICY depot_attachment_links_public_insert
            ON public.depot_attachment_links FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_attachment_links' AND policyname = 'depot_attachment_links_public_update'
    ) THEN
        CREATE POLICY depot_attachment_links_public_update
            ON public.depot_attachment_links FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_attachment_links' AND policyname = 'depot_attachment_links_public_delete'
    ) THEN
        CREATE POLICY depot_attachment_links_public_delete
            ON public.depot_attachment_links FOR DELETE TO public USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_additional_costs' AND policyname = 'depot_additional_costs_public_select'
    ) THEN
        CREATE POLICY depot_additional_costs_public_select
            ON public.depot_additional_costs FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_additional_costs' AND policyname = 'depot_additional_costs_public_insert'
    ) THEN
        CREATE POLICY depot_additional_costs_public_insert
            ON public.depot_additional_costs FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_additional_costs' AND policyname = 'depot_additional_costs_public_update'
    ) THEN
        CREATE POLICY depot_additional_costs_public_update
            ON public.depot_additional_costs FOR UPDATE TO public USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'depot_additional_costs' AND policyname = 'depot_additional_costs_public_delete'
    ) THEN
        CREATE POLICY depot_additional_costs_public_delete
            ON public.depot_additional_costs FOR DELETE TO public USING (true);
    END IF;
END $$;
