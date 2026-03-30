CREATE TABLE IF NOT EXISTS public.company_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_profile_id uuid NOT NULL,
    account_name text NOT NULL,
    account_number text NOT NULL,
    bank_name text NOT NULL,
    bank_code text,
    bank_address text,
    swift_code text,
    remark text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'company_bank_accounts_pkey'
          AND conrelid = 'public.company_bank_accounts'::regclass
    ) THEN
        ALTER TABLE public.company_bank_accounts
            ADD CONSTRAINT company_bank_accounts_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'company_bank_accounts_company_profile_id_fkey'
          AND conrelid = 'public.company_bank_accounts'::regclass
    ) THEN
        ALTER TABLE public.company_bank_accounts
            ADD CONSTRAINT company_bank_accounts_company_profile_id_fkey
            FOREIGN KEY (company_profile_id)
            REFERENCES public.company_profiles(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_company_profile_id
    ON public.company_bank_accounts (company_profile_id);

CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_bank_name
    ON public.company_bank_accounts (bank_name);
