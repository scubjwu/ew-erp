export type MaterialVendorSortBy =
  | "vendorCode"
  | "legalCompanyName"
  | "companyName"
  | "primaryContactPerson"
  | "materialCategory"
  | "email"
  | "tel"
  | "defaultVendor"
  | "status"
  | "currentPrepaidBalance";

export type MaterialVendorSortDirection = "asc" | "desc";

export const DEFAULT_MATERIAL_VENDOR_SORT = {
  sortBy: "vendorCode",
  sortDirection: "asc",
} as const;

export const MATERIAL_VENDOR_FILTER_OPTION_LIMIT = 100;

export const MATERIAL_VENDOR_SORT_COLUMN_MAP: Record<
  MaterialVendorSortBy,
  { column: string }
> = {
  vendorCode: { column: "vendor_code" },
  legalCompanyName: { column: "legal_company_name" },
  companyName: { column: "company_name" },
  primaryContactPerson: { column: "primary_contact_person" },
  materialCategory: { column: "material_category" },
  email: { column: "contact_email" },
  tel: { column: "contact_tel" },
  defaultVendor: { column: "is_default_vendor" },
  status: { column: "status" },
  currentPrepaidBalance: { column: "settlement_current_prepaid_balance" },
};

export function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

export function resolveMaterialVendorSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: MaterialVendorSortBy;
  sortDirection: MaterialVendorSortDirection;
} {
  const nextSortBy =
    sortBy && sortBy in MATERIAL_VENDOR_SORT_COLUMN_MAP
      ? (sortBy as MaterialVendorSortBy)
      : DEFAULT_MATERIAL_VENDOR_SORT.sortBy;
  const nextSortDirection =
    sortDirection === "desc" ? "desc" : DEFAULT_MATERIAL_VENDOR_SORT.sortDirection;

  return {
    sortBy: nextSortBy,
    sortDirection: nextSortDirection,
  };
}
