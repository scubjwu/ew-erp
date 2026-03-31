export type FinancialCodeCategory = "INCOME" | "EXPENSE";

export interface FinancialCodeRow {
  id: string;
  category: FinancialCodeCategory;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  created_at: string | null;
  updated_at: string | null;
}
