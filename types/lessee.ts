export type LesseeStatus = "Normal" | "Blocked" | "Deleted";

export type LesseeBalanceTriggerEvent =
  | "Before Release"
  | "After Gate out"
  | "On Invoice";

export interface LesseeRegionRef {
  id?: string;
  region_code: string | null;
  region_name: string | null;
}

export interface LesseeUserRef {
  id?: string;
  full_name: string | null;
}

export interface LesseeAttachmentLink {
  id: string;
  lessee_id: string;
  url: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lessee {
  id: string;
  lessee_code: string;
  legal_company_name: string;
  company_name: string | null;
  address: string;
  region_id: string | null;
  region?: LesseeRegionRef | null;
  country: string;
  primary_contact_person: string | null;
  contact_email: string | null;
  contact_tel: string | null;
  pic_user_id: string | null;
  pic_user?: LesseeUserRef | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_address: string | null;
  swift_code: string | null;
  settlement_payment_term: string | null;
  settlement_credit_days: number | null;
  settlement_advance_payment_percentage: number | null;
  settlement_balance_trigger_event: LesseeBalanceTriggerEvent | null;
  settlement_currency: string | null;
  settlement_prepayment_pool: boolean | null;
  settlement_prepayment_threshold: number | null;
  settlement_current_prepaid_balance: number | null;
  remark: string | null;
  status: LesseeStatus;
  created_at: string;
  updated_at: string;
  attachment_links?: LesseeAttachmentLink[];
}

export const LESSEE_STATUS_OPTIONS: readonly LesseeStatus[] = [
  "Normal",
  "Blocked",
  "Deleted",
] as const;

export const LESSEE_BALANCE_TRIGGER_EVENT_OPTIONS: readonly LesseeBalanceTriggerEvent[] = [
  "Before Release",
  "After Gate out",
  "On Invoice",
] as const;
