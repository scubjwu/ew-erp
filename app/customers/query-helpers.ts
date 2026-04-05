export type CustomerSortBy =
  | "customerId"
  | "companyName"
  | "companyNameOtherLanguage"
  | "customerGrade"
  | "region"
  | "contactPhone"
  | "creditLimit"
  | "status";

export type CustomerSortDirection = "asc" | "desc";

export const DEFAULT_CUSTOMER_SORT = {
  sortBy: "customerId",
  sortDirection: "asc",
} as const;

export const CUSTOMER_FILTER_OPTION_LIMIT = 100;

export const CUSTOMER_SORT_COLUMN_MAP: Record<
  CustomerSortBy,
  { column: string; foreignTable?: string; nullsFirst?: boolean }
> = {
  customerId: { column: "customer_custom_id" },
  companyName: { column: "company_name" },
  companyNameOtherLanguage: { column: "company_name_other_language" },
  customerGrade: { column: "customer_grade" },
  region: { column: "region_code", foreignTable: "region" },
  contactPhone: { column: "contact_phone" },
  creditLimit: { column: "credit_limit" },
  status: { column: "status" },
};

export function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

export function resolveCustomerSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: CustomerSortBy;
  sortDirection: CustomerSortDirection;
} {
  const nextSortBy =
    sortBy && sortBy in CUSTOMER_SORT_COLUMN_MAP
      ? (sortBy as CustomerSortBy)
      : DEFAULT_CUSTOMER_SORT.sortBy;
  const nextSortDirection =
    sortDirection === "desc" ? "desc" : DEFAULT_CUSTOMER_SORT.sortDirection;

  return {
    sortBy: nextSortBy,
    sortDirection: nextSortDirection,
  };
}
