/** Matches `status` comment on your table: Normal, Prepayment, Blacklisted */
export type CustomerStatus = "Normal" | "Prepayment" | "Blacklisted";

export interface CustomerRegionRef {
  region_code: string | null;
  region_name: string | null;
}

export interface CustomerCertificateLink {
  id: string;
  customer_id: string;
  link_url: string;
  created_at: string;
  updated_at: string;
}

export type CustomerDepotStatus = "ACTIVE" | "INACTIVE";

export interface CustomerDepot {
  id?: string;
  customer_id?: string;
  city_code: string;
  city_name: string;
  depot_name: string;
  depot_address: string;
  depot_contact_person: string;
  depot_tel: string;
  contact_email: string;
  is_default: boolean;
  status: CustomerDepotStatus;
  remark: string;
  created_at?: string;
  updated_at?: string;
}

/** Legacy depot_info JSONB editor row. Kept only for old callers not yet migrated. */
export interface DepotRow {
  city_code: string;
  city_name: string;
  contact_person: string;
  email: string;
  phone: string;
  depot_name: string;
  depot_address: string;
  depot_tel: string;
}

/** Row returned from Supabase `public.customers` */
export interface Customer {
  id: string;
  /** Human-facing reference, e.g. `C3A9FZ` (unique when set). */
  customer_custom_id: string | null;
  company_name: string;
  company_name_other_language: string | null;
  customer_grade: string | null;
  assigned_sales: string | null;
  region_id: string | null;
  region?: CustomerRegionRef | null;
  contact_person: string | null;
  status: CustomerStatus;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  finance_emails: string[];
  ops_emails: string[];
  purchasing_emails: string[];
  credit_limit: number;
  credit_term_days: number;
  depot_info: Record<string, unknown> | null;
  customer_depots?: CustomerDepot[];
  certificate_links?: CustomerCertificateLink[];
  created_at: string;
  updated_at: string;
}

export const CUSTOMER_STATUS_OPTIONS: readonly CustomerStatus[] = [
  "Normal",
  "Prepayment",
  "Blacklisted",
] as const;

export const CUSTOMER_GRADE_OPTIONS = ["A", "B", "C", "D"] as const;
