ALTER TABLE public.depots
    ADD COLUMN IF NOT EXISTS is_primary_depot boolean DEFAULT false NOT NULL;

UPDATE public.depots
SET depot_type = CASE
    WHEN depot_type IS NULL OR trim(depot_type) = '' THEN 'OTHER'
    WHEN depot_type = 'FACTORY_YARD' THEN 'FACTORY_YARD'
    WHEN depot_type = 'DEPOT' THEN 'CONTRACT'
    WHEN depot_type = 'OTHER' THEN 'OTHER'
    WHEN lower(trim(depot_type)) IN ('contract', 'contract depot') THEN 'CONTRACT'
    WHEN lower(trim(depot_type)) IN ('shipping lines', 'shipping_line', 'shipping line') THEN 'SHIPPING_LINES'
    WHEN lower(trim(depot_type)) IN ('trader') THEN 'TRADER'
    WHEN lower(trim(depot_type)) IN ('consignment') THEN 'CONSIGNMENT'
    ELSE 'OTHER'
END;

UPDATE public.depots
SET status = CASE
    WHEN status IS NULL OR trim(status) = '' THEN 'NORMAL'
    WHEN status IN ('ACTIVE', 'INACTIVE', 'HOLD') THEN
        CASE
            WHEN status = 'ACTIVE' THEN 'NORMAL'
            ELSE 'SUSPEND'
        END
    WHEN lower(trim(status)) = 'normal' THEN 'NORMAL'
    WHEN lower(trim(status)) = 'suspend' THEN 'SUSPEND'
    ELSE 'NORMAL'
END;

ALTER TABLE public.depots
    DROP CONSTRAINT IF EXISTS depots_status_check;

ALTER TABLE public.depots
    ADD CONSTRAINT depots_status_check
    CHECK (status = ANY (ARRAY['NORMAL'::text, 'SUSPEND'::text]));

ALTER TABLE public.depots
    DROP CONSTRAINT IF EXISTS depots_depot_type_check;

ALTER TABLE public.depots
    ADD CONSTRAINT depots_depot_type_check
    CHECK (
        depot_type IS NULL
        OR depot_type = ANY (
            ARRAY[
                'CONTRACT'::text,
                'FACTORY_YARD'::text,
                'SHIPPING_LINES'::text,
                'TRADER'::text,
                'CONSIGNMENT'::text,
                'OTHER'::text
            ]
        )
    );

CREATE INDEX IF NOT EXISTS idx_depots_is_primary_depot
    ON public.depots (is_primary_depot);
