ALTER TABLE public.depots
ADD COLUMN IF NOT EXISTS depot_attachment_url text;

CREATE TABLE IF NOT EXISTS public.depot_additional_costs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_id uuid NOT NULL REFERENCES public.depots(id) ON DELETE CASCADE,
    cost_item text NOT NULL,
    rate numeric(12,2) NOT NULL DEFAULT 0.00,
    currency text NOT NULL DEFAULT 'USD',
    remark text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT depot_additional_costs_currency_check CHECK (currency <> ''),
    CONSTRAINT depot_additional_costs_cost_item_check CHECK (cost_item <> '')
);

CREATE INDEX IF NOT EXISTS idx_depot_additional_costs_depot_id
ON public.depot_additional_costs(depot_id);

DROP TRIGGER IF EXISTS trg_depot_additional_costs_updated_at ON public.depot_additional_costs;
CREATE TRIGGER trg_depot_additional_costs_updated_at
BEFORE UPDATE ON public.depot_additional_costs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON TABLE public.depot_additional_costs TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.depot_additional_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.depot_additional_costs TO anon;
GRANT ALL ON TABLE public.depot_additional_costs TO service_role;

ALTER TABLE public.depot_additional_costs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depot_additional_costs'
          AND policyname = 'depot_additional_costs_public_select'
    ) THEN
        CREATE POLICY depot_additional_costs_public_select
            ON public.depot_additional_costs
            FOR SELECT
            TO public
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depot_additional_costs'
          AND policyname = 'depot_additional_costs_public_insert'
    ) THEN
        CREATE POLICY depot_additional_costs_public_insert
            ON public.depot_additional_costs
            FOR INSERT
            TO public
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'depot_additional_costs'
          AND policyname = 'depot_additional_costs_public_update'
    ) THEN
        CREATE POLICY depot_additional_costs_public_update
            ON public.depot_additional_costs
            FOR UPDATE
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
