CREATE TABLE IF NOT EXISTS public.company_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name_cn text NOT NULL,
    company_name_en text,
    address_cn text,
    address_en text,
    phone text,
    email text,
    location_code text,
    remark text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
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
        WHERE conname = 'company_profiles_pkey'
          AND conrelid = 'public.company_profiles'::regclass
    ) THEN
        ALTER TABLE public.company_profiles
            ADD CONSTRAINT company_profiles_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'company_profiles_status_check'
          AND conrelid = 'public.company_profiles'::regclass
    ) THEN
        ALTER TABLE public.company_profiles
            ADD CONSTRAINT company_profiles_status_check
            CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.region_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_code text NOT NULL,
    region_name text NOT NULL,
    description text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
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
        WHERE conname = 'region_codes_pkey'
          AND conrelid = 'public.region_codes'::regclass
    ) THEN
        ALTER TABLE public.region_codes
            ADD CONSTRAINT region_codes_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'region_codes_status_check'
          AND conrelid = 'public.region_codes'::regclass
    ) THEN
        ALTER TABLE public.region_codes
            ADD CONSTRAINT region_codes_status_check
            CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_region_codes_region_code
    ON public.region_codes (region_code);

CREATE TABLE IF NOT EXISTS public.operation_price_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    container_size_code_id uuid NOT NULL,
    container_condition_code_id uuid NOT NULL,
    addon_price numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
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
        WHERE conname = 'operation_price_configs_pkey'
          AND conrelid = 'public.operation_price_configs'::regclass
    ) THEN
        ALTER TABLE public.operation_price_configs
            ADD CONSTRAINT operation_price_configs_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'operation_price_configs_status_check'
          AND conrelid = 'public.operation_price_configs'::regclass
    ) THEN
        ALTER TABLE public.operation_price_configs
            ADD CONSTRAINT operation_price_configs_status_check
            CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text]));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'operation_price_configs_price_check'
          AND conrelid = 'public.operation_price_configs'::regclass
    ) THEN
        ALTER TABLE public.operation_price_configs
            ADD CONSTRAINT operation_price_configs_price_check
            CHECK (addon_price >= 0::numeric);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'operation_price_configs_effective_range_check'
          AND conrelid = 'public.operation_price_configs'::regclass
    ) THEN
        ALTER TABLE public.operation_price_configs
            ADD CONSTRAINT operation_price_configs_effective_range_check
            CHECK (effective_to IS NULL OR effective_to >= effective_from);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_operation_price_configs_key
    ON public.operation_price_configs (
        container_size_code_id,
        container_condition_code_id,
        effective_from
    );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'operation_price_configs_container_size_code_id_fkey'
          AND conrelid = 'public.operation_price_configs'::regclass
    ) THEN
        ALTER TABLE public.operation_price_configs
            ADD CONSTRAINT operation_price_configs_container_size_code_id_fkey
            FOREIGN KEY (container_size_code_id)
            REFERENCES public.container_size_codes(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'operation_price_configs_container_condition_code_id_fkey'
          AND conrelid = 'public.operation_price_configs'::regclass
    ) THEN
        ALTER TABLE public.operation_price_configs
            ADD CONSTRAINT operation_price_configs_container_condition_code_id_fkey
            FOREIGN KEY (container_condition_code_id)
            REFERENCES public.container_condition_codes(id);
    END IF;
END $$;

ALTER TABLE public.cities
    ADD COLUMN IF NOT EXISTS region_id uuid,
    ADD COLUMN IF NOT EXISTS remark text;

ALTER TABLE public.depots
    ADD COLUMN IF NOT EXISTS region_id uuid,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE'::text NOT NULL;

INSERT INTO public.region_codes (
    region_code,
    region_name,
    description,
    status
)
SELECT DISTINCT
    trim(src.region_name) AS region_code,
    trim(src.region_name) AS region_name,
    NULL::text AS description,
    'ACTIVE'::text AS status
FROM (
    SELECT region AS region_name FROM public.cities
    UNION ALL
    SELECT region AS region_name FROM public.depots
) AS src
WHERE src.region_name IS NOT NULL
  AND trim(src.region_name) <> ''
ON CONFLICT (region_code) DO NOTHING;

UPDATE public.cities AS c
SET region_id = r.id
FROM public.region_codes AS r
WHERE c.region_id IS NULL
  AND c.region IS NOT NULL
  AND trim(c.region) <> ''
  AND lower(trim(c.region)) = lower(r.region_code);

UPDATE public.depots AS d
SET region_id = r.id
FROM public.region_codes AS r
WHERE d.region_id IS NULL
  AND d.region IS NOT NULL
  AND trim(d.region) <> ''
  AND lower(trim(d.region)) = lower(r.region_code);

UPDATE public.depots
SET depot_type = CASE
    WHEN depot_type IS NULL OR trim(depot_type) = '' THEN 'OTHER'
    WHEN lower(trim(depot_type)) IN (
        'factory_yard',
        'factory yard',
        'factory',
        'factory depot',
        '箱厂堆场',
        '箱厂'
    ) THEN 'FACTORY_YARD'
    WHEN lower(trim(depot_type)) IN (
        'depot',
        'yard',
        '堆场'
    ) THEN 'DEPOT'
    ELSE 'OTHER'
END;

UPDATE public.depots
SET status = 'ACTIVE'
WHERE status IS NULL OR trim(status) = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cities_region_id_fkey'
          AND conrelid = 'public.cities'::regclass
    ) THEN
        ALTER TABLE public.cities
            ADD CONSTRAINT cities_region_id_fkey
            FOREIGN KEY (region_id)
            REFERENCES public.region_codes(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'depots_region_id_fkey'
          AND conrelid = 'public.depots'::regclass
    ) THEN
        ALTER TABLE public.depots
            ADD CONSTRAINT depots_region_id_fkey
            FOREIGN KEY (region_id)
            REFERENCES public.region_codes(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'depots_status_check'
          AND conrelid = 'public.depots'::regclass
    ) THEN
        ALTER TABLE public.depots
            ADD CONSTRAINT depots_status_check
            CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text, 'HOLD'::text]));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'depots_depot_type_check'
          AND conrelid = 'public.depots'::regclass
    ) THEN
        ALTER TABLE public.depots
            ADD CONSTRAINT depots_depot_type_check
            CHECK (depot_type IS NULL OR depot_type = ANY (ARRAY['FACTORY_YARD'::text, 'DEPOT'::text, 'OTHER'::text]));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cities_region_id
    ON public.cities (region_id);

CREATE INDEX IF NOT EXISTS idx_depots_region_id
    ON public.depots (region_id);

CREATE INDEX IF NOT EXISTS idx_depots_status
    ON public.depots (status);

CREATE INDEX IF NOT EXISTS idx_operation_price_configs_status
    ON public.operation_price_configs (status);

CREATE INDEX IF NOT EXISTS idx_operation_price_configs_size_condition
    ON public.operation_price_configs (
        container_size_code_id,
        container_condition_code_id
    );
