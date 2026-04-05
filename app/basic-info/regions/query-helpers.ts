export type RegionSortBy = "regionCode" | "regionName" | "status" | "createdBy" | "createdAt";

export type RegionSortDirection = "asc" | "desc";

export const DEFAULT_REGION_SORT = {
  sortBy: "regionCode",
  sortDirection: "asc",
} as const;

export const REGION_FILTER_OPTION_LIMIT = 100;

export const REGION_SORT_COLUMN_MAP: Record<RegionSortBy, { column: string }> = {
  regionCode: { column: "region_code" },
  regionName: { column: "region_name" },
  status: { column: "status" },
  createdBy: { column: "created_by" },
  createdAt: { column: "created_at" },
};

export function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

export function resolveRegionSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: RegionSortBy;
  sortDirection: RegionSortDirection;
} {
  const nextSortBy =
    sortBy && sortBy in REGION_SORT_COLUMN_MAP
      ? (sortBy as RegionSortBy)
      : DEFAULT_REGION_SORT.sortBy;
  const nextSortDirection =
    sortDirection === "desc" ? "desc" : DEFAULT_REGION_SORT.sortDirection;

  return {
    sortBy: nextSortBy,
    sortDirection: nextSortDirection,
  };
}
