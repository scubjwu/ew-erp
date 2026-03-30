export type CompanyProfileStatus = "ACTIVE" | "INACTIVE";

export interface CompanyProfile {
  id: string;
  company_name_cn: string;
  company_name_en: string | null;
  address_cn: string | null;
  address_en: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  postal_code: string | null;
  record_date: string | null;
  business_code: string | null;
  system_code: string | null;
  group_code: string | null;
  data_code: string | null;
  certificate_code: string | null;
  invoice_code: string | null;
  version_info: string | null;
  location_code: string | null;
  remark: string | null;
  status: CompanyProfileStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
