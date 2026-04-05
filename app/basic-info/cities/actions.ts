"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CityLogisticsRow, RegionOption } from "@/types/city-logistics";

export type CitySuggestionField = "cityCode" | "cityName" | "country";

export type CityLogisticsQuery = {
  cityCode?: string;
  cityName?: string;
  regionId?: string;
  country?: string;
  page: number;
  pageSize: number;
  sortBy?: CityLogisticsSortBy;
  sortDirection?: CityLogisticsSortDirection;
};

export type CityLogisticsSortBy =
  | "cityCode"
  | "cityName"
  | "region"
  | "country"
  | "remark";
export type CityLogisticsSortDirection = "asc" | "desc";

export type CityLogisticsPageResult = {
  rows: CityLogisticsRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    cityCode: string;
    cityName: string;
    regionId: string;
    country: string;
  };
  sort: {
    sortBy: CityLogisticsSortBy;
    sortDirection: CityLogisticsSortDirection;
  };
};

export const DEFAULT_CITY_LOGISTICS_SORT = {
  sortBy: "cityCode",
  sortDirection: "asc",
} satisfies {
  sortBy: CityLogisticsSortBy;
  sortDirection: CityLogisticsSortDirection;
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function resolveCityLogisticsSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: CityLogisticsSortBy;
  sortDirection: CityLogisticsSortDirection;
} {
  return {
    sortBy:
      sortBy === "cityName" ||
      sortBy === "region" ||
      sortBy === "country" ||
      sortBy === "remark"
        ? sortBy
        : DEFAULT_CITY_LOGISTICS_SORT.sortBy,
    sortDirection:
      sortDirection === "desc" ? "desc" : DEFAULT_CITY_LOGISTICS_SORT.sortDirection,
  };
}

function buildCityLogisticsQuery(
  filters: CityLogisticsPageResult["filters"],
  sort: {
    sortBy: CityLogisticsSortBy;
    sortDirection: CityLogisticsSortDirection;
  }
) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("cities")
    .select(
      "id, city_code, city_name, country, region_id, region, remark, created_at, updated_at, region_codes(id, region_code, region_name)",
      { count: "exact" }
    );

  if (sort.sortBy === "region") {
    query = query.order("region_name", {
      ascending: sort.sortDirection === "asc",
      foreignTable: "region_codes",
    });
  } else {
    const columnMap: Record<Exclude<CityLogisticsSortBy, "region">, string> = {
      cityCode: "city_code",
      cityName: "city_name",
      country: "country",
      remark: "remark",
    };
    query = query.order(columnMap[sort.sortBy], {
      ascending: sort.sortDirection === "asc",
    });
  }

  const cityCode = normalizeLike(filters.cityCode);
  const cityName = normalizeLike(filters.cityName);
  const country = normalizeLike(filters.country);

  if (cityCode) {
    query = query.ilike("city_code", cityCode);
  }
  if (cityName) {
    query = query.ilike("city_name", cityName);
  }
  if (filters.regionId) {
    query = query.eq("region_id", filters.regionId);
  }
  if (country) {
    query = query.ilike("country", country);
  }

  return query;
}

export async function getCityLogistics(
  params: CityLogisticsQuery
): Promise<CityLogisticsPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    cityCode: params.cityCode?.trim() ?? "",
    cityName: params.cityName?.trim() ?? "",
    regionId: params.regionId?.trim() ?? "",
    country: params.country?.trim() ?? "",
  };
  const sort = resolveCityLogisticsSort(params.sortBy, params.sortDirection);
  const query = buildCityLogisticsQuery(filters, sort);

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: ((data ?? []) as unknown) as CityLogisticsRow[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportCityLogistics(filters: {
  cityCode?: string;
  cityName?: string;
  regionId?: string;
  country?: string;
  sortBy?: CityLogisticsSortBy;
  sortDirection?: CityLogisticsSortDirection;
}): Promise<CityLogisticsRow[]> {
  noStore();

  const normalizedFilters = {
    cityCode: filters.cityCode?.trim() ?? "",
    cityName: filters.cityName?.trim() ?? "",
    regionId: filters.regionId?.trim() ?? "",
    country: filters.country?.trim() ?? "",
  };
  const sort = resolveCityLogisticsSort(filters.sortBy, filters.sortDirection);
  const query = buildCityLogisticsQuery(normalizedFilters, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as CityLogisticsRow[];
}

export async function getCitySuggestions(params: {
  field: CitySuggestionField;
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const limit = Math.min(8, Math.max(1, params.limit ?? 6));
  const pattern = `%${q}%`;
  const supabase = createServerSupabaseClient();

  if (params.field === "cityCode") {
    const { data, error } = await supabase
      .from("cities")
      .select("city_code")
      .ilike("city_code", pattern)
      .order("city_code", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.city_code)
          .filter((value): value is string => Boolean(value?.trim()))
      )
    ).slice(0, limit);
  }

  if (params.field === "country") {
    const { data, error } = await supabase
      .from("cities")
      .select("country")
      .ilike("country", pattern)
      .order("country", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.country)
          .filter((value): value is string => Boolean(value?.trim()))
      )
    ).slice(0, limit);
  }

  const { data, error } = await supabase
    .from("cities")
    .select("city_name")
    .ilike("city_name", pattern)
    .order("city_name", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.city_name)
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).slice(0, limit);
}

export async function getRegionOptions(): Promise<RegionOption[]> {
  noStore();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("region_codes")
    .select("id, region_code, region_name")
    .eq("status", "ACTIVE")
    .order("region_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RegionOption[];
}

export async function revalidateCityLogisticsPage() {
  revalidatePath("/basic-info/cities");
  revalidatePath("/basic-info");
}
