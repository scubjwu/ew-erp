export interface OperationPriceOption {
  id: string;
  code: string;
  label: string;
}

export interface OperationPriceRow {
  id: string;
  container_size_code_id: string;
  container_condition_code_id: string;
  addon_price: string | number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  status: "ACTIVE" | "INACTIVE";
  remark: string | null;
  container_size_codes?: {
    id: string;
    size_code: string;
    remark: string | null;
  } | null;
  container_condition_codes?: {
    id: string;
    condition_code: string;
    condition_name: string;
  } | null;
}
