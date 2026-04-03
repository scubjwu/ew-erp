export type MaterialVendorStatus = "Normal" | "Blocked" | "Deleted";

export type MaterialCategory =
  | "油漆"
  | "密封胶"
  | "胶条"
  | "地板"
  | "贴标"
  | "角件"
  | "锁杆"
  | "底漆";

export type MaterialVendorBalanceTriggerEvent =
  | "Before Release"
  | "After Gate out"
  | "On Invoice";

export interface MaterialVendorUserRef {
  id?: string;
  full_name: string | null;
}

export interface MaterialVendorAttachmentLink {
  id: string;
  material_vendor_id: string;
  url: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialVendor {
  id: string;
  vendor_code: string;
  legal_company_name: string;
  company_name: string | null;
  address: string;
  country: string;
  primary_contact_person: string | null;
  material_category: MaterialCategory;
  contact_email: string | null;
  contact_tel: string | null;
  pic_user_id: string | null;
  pic_user?: MaterialVendorUserRef | null;
  is_default_vendor: boolean;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_address: string | null;
  swift_code: string | null;
  settlement_payment_term: string | null;
  settlement_calculation_method: string | null;
  settlement_credit_days: number | null;
  settlement_advance_payment_percentage: number | null;
  settlement_balance_trigger_event: MaterialVendorBalanceTriggerEvent | null;
  settlement_currency: string | null;
  settlement_prepayment_pool: boolean | null;
  settlement_prepayment_threshold: number | null;
  settlement_current_prepaid_balance: number | null;
  remark: string | null;
  status: MaterialVendorStatus;
  created_at: string;
  updated_at: string;
  attachment_links?: MaterialVendorAttachmentLink[];
}

export const MATERIAL_VENDOR_STATUS_OPTIONS: readonly MaterialVendorStatus[] = [
  "Normal",
  "Blocked",
  "Deleted",
] as const;

export const MATERIAL_CATEGORY_OPTIONS: readonly MaterialCategory[] = [
  "油漆",
  "密封胶",
  "胶条",
  "地板",
  "贴标",
  "角件",
  "锁杆",
  "底漆",
] as const;

export const MATERIAL_VENDOR_BALANCE_TRIGGER_EVENT_OPTIONS: readonly MaterialVendorBalanceTriggerEvent[] = [
  "Before Release",
  "After Gate out",
  "On Invoice",
] as const;

export const MATERIAL_CATEGORY_CODE_PREFIX: Record<MaterialCategory, string> = {
  油漆: "YQ",
  密封胶: "MF",
  胶条: "JT",
  地板: "DB",
  贴标: "TB",
  角件: "JJ",
  锁杆: "SG",
  底漆: "DQ",
};
