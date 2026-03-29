/** Matches `status` comment on your table: Normal, Prepayment, Blacklisted */
export type CustomerStatus = "Normal" | "Prepayment" | "Blacklisted";

/** One depot entry in the editor → stored under `depot_info.depots` JSONB. */
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
  customer_grade: string | null;
  assigned_sales: string | null;
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
  created_at: string;
  updated_at: string;
}

export const CUSTOMER_STATUS_OPTIONS: readonly CustomerStatus[] = [
  "Normal",
  "Prepayment",
  "Blacklisted",
] as const;

export const CUSTOMER_GRADE_OPTIONS = ["A", "B", "C", "D"] as const;
