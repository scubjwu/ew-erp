export type ContainerOwnerStatus = "Normal" | "Blocked" | "Deleted";

export type ContainerOwnerBalanceTriggerEvent =
  | "Before Release"
  | "After Gate out"
  | "On Invoice";

export interface ContainerOwnerRegionRef {
  id?: string;
  region_code: string | null;
  region_name: string | null;
}

export interface ContainerOwnerUserRef {
  id?: string;
  full_name: string | null;
}

export interface ContainerOwnerAttachmentLink {
  id: string;
  container_owner_id: string;
  url: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContainerOwner {
  id: string;
  container_owner_code: string;
  legal_company_name: string;
  company_name: string | null;
  address: string | null;
  region_id: string | null;
  region?: ContainerOwnerRegionRef | null;
  country: string | null;
  primary_contact_person: string | null;
  contact_email: string | null;
  contact_tel: string | null;
  pic_user_id: string | null;
  pic_user?: ContainerOwnerUserRef | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_address: string | null;
  swift_code: string | null;
  settlement_payment_term: string | null;
  settlement_credit_days: number | null;
  settlement_advance_payment_percentage: number | null;
  settlement_balance_trigger_event: ContainerOwnerBalanceTriggerEvent | null;
  settlement_currency: string | null;
  settlement_prepayment_pool: boolean | null;
  settlement_prepayment_threshold: number | null;
  settlement_current_prepaid_balance: number | null;
  remark: string | null;
  status: ContainerOwnerStatus;
  created_at: string;
  updated_at: string;
  attachment_links?: ContainerOwnerAttachmentLink[];
}

export const CONTAINER_OWNER_STATUS_OPTIONS: readonly ContainerOwnerStatus[] = [
  "Normal",
  "Blocked",
  "Deleted",
] as const;

export const CONTAINER_OWNER_BALANCE_TRIGGER_EVENT_OPTIONS: readonly ContainerOwnerBalanceTriggerEvent[] =
  ["Before Release", "After Gate out", "On Invoice"] as const;
