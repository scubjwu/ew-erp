export type ContainerOwnerSortBy =
  | "containerOwnerCode"
  | "legalCompanyName"
  | "companyName"
  | "primaryContactPerson"
  | "email"
  | "tel"
  | "region"
  | "status"
  | "currentPrepaidBalance";

export type ContainerOwnerSortDirection = "asc" | "desc";

export const DEFAULT_CONTAINER_OWNER_SORT = {
  sortBy: "containerOwnerCode",
  sortDirection: "asc",
} as const;

export const CONTAINER_OWNER_FILTER_OPTION_LIMIT = 100;

export const CONTAINER_OWNER_SORT_COLUMN_MAP: Record<
  ContainerOwnerSortBy,
  { column: string; foreignTable?: string }
> = {
  containerOwnerCode: { column: "container_owner_code" },
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

export function resolveContainerOwnerSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: ContainerOwnerSortBy;
  sortDirection: ContainerOwnerSortDirection;
} {
  const nextSortBy =
    sortBy && sortBy in CONTAINER_OWNER_SORT_COLUMN_MAP
      ? (sortBy as ContainerOwnerSortBy)
      : DEFAULT_CONTAINER_OWNER_SORT.sortBy;
  const nextSortDirection =
    sortDirection === "desc" ? "desc" : DEFAULT_CONTAINER_OWNER_SORT.sortDirection;

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
