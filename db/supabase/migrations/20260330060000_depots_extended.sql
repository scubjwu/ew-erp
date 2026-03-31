ALTER TABLE public.depots
    ADD COLUMN IF NOT EXISTS depot_name_cn text,
    ADD COLUMN IF NOT EXISTS depot_address_cn text,
    ADD COLUMN IF NOT EXISTS fax text,
    ADD COLUMN IF NOT EXISTS gate_email text,
    ADD COLUMN IF NOT EXISTS country_code text,
    ADD COLUMN IF NOT EXISTS country_name text,
    ADD COLUMN IF NOT EXISTS gate_in_20_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS gate_out_20_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS gate_in_40_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS gate_out_40_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS lift_in_20_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS lift_out_20_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS lift_in_40_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS lift_out_40_cost numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS user_return_surcharge_in numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS user_return_surcharge_out numeric(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS settlement_cycle text,
    ADD COLUMN IF NOT EXISTS payment_remark text,
    ADD COLUMN IF NOT EXISTS other_terms_remark text,
    ADD COLUMN IF NOT EXISTS business_contact_person text,
    ADD COLUMN IF NOT EXISTS data_updated_on date,
    ADD COLUMN IF NOT EXISTS remark text;

UPDATE public.depots
SET depot_name_cn = depot_name
WHERE depot_name_cn IS NULL
  AND depot_name IS NOT NULL
  AND trim(depot_name) <> '';

UPDATE public.depots
SET depot_address_cn = depot_address
WHERE depot_address_cn IS NULL
  AND depot_address IS NOT NULL
  AND trim(depot_address) <> '';

UPDATE public.depots AS d
SET country_name = c.country,
    country_code = left(c.city_code, 2)
FROM public.cities AS c
WHERE d.city_id = c.id
  AND (
    d.country_name IS NULL
    OR trim(d.country_name) = ''
    OR d.country_code IS NULL
    OR trim(d.country_code) = ''
  );

UPDATE public.depots
SET remark = concat_ws(E'\n', nullif(trim(remark1), ''), nullif(trim(remark2), ''), nullif(trim(remark3), ''))
WHERE (remark IS NULL OR trim(remark) = '')
  AND (
    (remark1 IS NOT NULL AND trim(remark1) <> '')
    OR (remark2 IS NOT NULL AND trim(remark2) <> '')
    OR (remark3 IS NOT NULL AND trim(remark3) <> '')
  );

CREATE INDEX IF NOT EXISTS idx_depots_country_code
    ON public.depots (country_code);

CREATE INDEX IF NOT EXISTS idx_depots_country_name
    ON public.depots (country_name);

CREATE INDEX IF NOT EXISTS idx_depots_gate_email
    ON public.depots (gate_email);
