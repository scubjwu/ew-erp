UPDATE public.company_profiles
SET company_name_en = company_name_cn
WHERE company_name_en IS NULL OR trim(company_name_en) = '';

ALTER TABLE public.company_profiles
    ALTER COLUMN company_name_en SET NOT NULL;

ALTER TABLE public.company_profiles
    ALTER COLUMN company_name_cn DROP NOT NULL;
