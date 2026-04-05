export type VendorSortBy =
  | "vendorCode"
  | "legalCompanyName"
  | "companyName"
  | "primaryContactPerson"
  | "email"
  | "tel"
  | "region"
  | "status"
  | "currentPrepaidBalance";

export type VendorSortDirection = "asc" | "desc";

export const DEFAULT_VENDOR_SORT = {
  sortBy: "vendorCode",
  sortDirection: "asc",
} as const;

export const VENDOR_FILTER_OPTION_LIMIT = 100;

export const VENDOR_SORT_COLUMN_MAP: Record<
  VendorSortBy,
  { column: string; foreignTable?: string }
> = {
  vendorCode: { column: "vendor_code" },
  legalCompanyName: { column: "legal_company_name" },
  companyName: { column: "company_name" },
  primaryContactPerson: { column: "primary_contact_person" },
  email: { column: "contact_email" },
  tel: { column: "contact_tel" },
  region: { column: "region_code", foreignTable: "region" },
  status: { column: "status" },
  currentPrepaidBalance: { column: "settlement_current_prepaid_balance" },
};

export function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

export function resolveVendorSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: VendorSortBy;
  sortDirection: VendorSortDirection;
} {
  const nextSortBy =
    sortBy && sortBy in VENDOR_SORT_COLUMN_MAP
      ? (sortBy as VendorSortBy)
      : DEFAULT_VENDOR_SORT.sortBy;
  const nextSortDirection =
    sortDirection === "desc" ? "desc" : DEFAULT_VENDOR_SORT.sortDirection;

  return {
    sortBy: nextSortBy,
    sortDirection: nextSortDirection,
  };
}

export function resolveRegionFilter(filters: {
  selectedRegionId?: string;
  regionQuery?: string;
}) {
  const selectedRegionId = filters.selectedRegionId?.trim() ?? "";
  const regionQuery = filters.regionQuery?.trim() ?? "";

  if (selectedRegionId) {
    return {
      selectedRegionId,
      regionQuery: "",
    };
  }

  return {
    selectedRegionId: "",
    regionQuery,
  };
}
