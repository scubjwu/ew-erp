export type LesseeSortBy =
  | "lesseeCode"
  | "legalCompanyName"
  | "companyName"
  | "primaryContactPerson"
  | "email"
  | "tel"
  | "region"
  | "status"
  | "currentPrepaidBalance";

export type LesseeSortDirection = "asc" | "desc";

export const DEFAULT_LESSEE_SORT = {
  sortBy: "lesseeCode",
  sortDirection: "asc",
} as const;

export const LESSEE_FILTER_OPTION_LIMIT = 100;

export const LESSEE_SORT_COLUMN_MAP: Record<
  LesseeSortBy,
  { column: string; foreignTable?: string }
> = {
  lesseeCode: { column: "lessee_code" },
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

export function resolveLesseeSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: LesseeSortBy;
  sortDirection: LesseeSortDirection;
} {
  const nextSortBy =
    sortBy && sortBy in LESSEE_SORT_COLUMN_MAP
      ? (sortBy as LesseeSortBy)
      : DEFAULT_LESSEE_SORT.sortBy;
  const nextSortDirection =
    sortDirection === "desc" ? "desc" : DEFAULT_LESSEE_SORT.sortDirection;

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
