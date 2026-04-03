export type VendorStatus = "Normal" | "Blocked" | "Deleted";

export type VendorCategory = "Container";

export type VendorBalanceTriggerEvent =
  | "Before Release"
  | "After Gate out"
  | "On Invoice";

export interface VendorRegionRef {
  id?: string;
  region_code: string | null;
  region_name: string | null;
}

export interface VendorUserRef {
  id?: string;
  full_name: string | null;
}

export interface VendorAttachmentLink {
  id: string;
  vendor_id: string;
  url: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  vendor_code: string;
  legal_company_name: string;
  company_name: string | null;
  address: string;
  region_id: string;
  region?: VendorRegionRef | null;
  country: string;
  primary_contact_person: string | null;
  contact_email: string | null;
  contact_tel: string | null;
  category: VendorCategory | null;
  assigned_buyer_id: string;
  assigned_buyer?: VendorUserRef | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_address: string | null;
  swift_code: string | null;
  settlement_payment_term: string | null;
  settlement_credit_days: number | null;
  settlement_advance_payment_percentage: number | null;
  settlement_balance_trigger_event: VendorBalanceTriggerEvent | null;
  settlement_currency: string | null;
  settlement_prepayment_pool: boolean | null;
  settlement_prepayment_threshold: number | null;
  settlement_current_prepaid_balance: number | null;
  remark: string | null;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
  attachment_links?: VendorAttachmentLink[];
}

export const VENDOR_STATUS_OPTIONS: readonly VendorStatus[] = [
  "Normal",
  "Blocked",
  "Deleted",
] as const;

export const VENDOR_CATEGORY_OPTIONS: readonly VendorCategory[] = [
  "Container",
] as const;

export const VENDOR_BALANCE_TRIGGER_EVENT_OPTIONS: readonly VendorBalanceTriggerEvent[] = [
  "Before Release",
  "After Gate out",
  "On Invoice",
] as const;
