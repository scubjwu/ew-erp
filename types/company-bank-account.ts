export interface CompanyBankAccount {
  id: string;
  company_profile_id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string | null;
  bank_address: string | null;
  swift_code: string | null;
  remark: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
