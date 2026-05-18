ALTER TABLE public.company_profiles
    ADD COLUMN IF NOT EXISTS fax text,
    ADD COLUMN IF NOT EXISTS postal_code text,
    ADD COLUMN IF NOT EXISTS record_date date,
    ADD COLUMN IF NOT EXISTS business_code text,
    ADD COLUMN IF NOT EXISTS system_code text,
    ADD COLUMN IF NOT EXISTS group_code text,
    ADD COLUMN IF NOT EXISTS data_code text,
    ADD COLUMN IF NOT EXISTS certificate_code text,
    ADD COLUMN IF NOT EXISTS invoice_code text,
    ADD COLUMN IF NOT EXISTS version_info text;

CREATE INDEX IF NOT EXISTS idx_company_profiles_business_code
    ON public.company_profiles (business_code);

CREATE INDEX IF NOT EXISTS idx_company_profiles_system_code
    ON public.company_profiles (system_code);

CREATE INDEX IF NOT EXISTS idx_company_profiles_group_code
    ON public.company_profiles (group_code);
