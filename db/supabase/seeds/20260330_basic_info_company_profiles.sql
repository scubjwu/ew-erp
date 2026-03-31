BEGIN;

INSERT INTO public.company_profiles (
    id,
    company_name_cn,
    company_name_en,
    address_cn,
    address_en,
    phone,
    email,
    location_code,
    remark,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at,
    fax,
    postal_code,
    record_date,
    business_code,
    system_code,
    group_code,
    data_code,
    certificate_code,
    invoice_code,
    version_info
) VALUES (
    '6b6ce1ae-891a-4f89-87d2-1b8c1f7f0c10',
    '屹达国际物流有限公司',
    'EW INTERNATIONAL LOGISTICS COMPANY LIMITED',
    '香港尖沙咀么地道62号永安广场9楼',
    '9/F, Wing On Plaza, 62 Mody Road, Tsim Sha Tsui, Hong Kong',
    '+852 36890791',
    'sales@ew-logistics.com',
    'C:\\EWL',
    'Seeded default company profile for local development.',
    'ACTIVE',
    NULL,
    NULL,
    '2026-03-30T23:59:00+00:00',
    '2026-03-30T23:59:00+00:00',
    NULL,
    NULL,
    '2026-03-30',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    company_name_cn = EXCLUDED.company_name_cn,
    company_name_en = EXCLUDED.company_name_en,
    address_cn = EXCLUDED.address_cn,
    address_en = EXCLUDED.address_en,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    location_code = EXCLUDED.location_code,
    remark = EXCLUDED.remark,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

COMMIT;

-- rows seeded: 1
