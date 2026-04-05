"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import {
  DEFAULT_REGION_SORT,
  normalizeLike,
  REGION_FILTER_OPTION_LIMIT,
  REGION_SORT_COLUMN_MAP,
  resolveRegionSort,
  type RegionSortBy,
  type RegionSortDirection,
} from "@/app/basic-info/regions/query-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RegionCode } from "@/types/region-code";

export type RegionAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type RegionFilterOptions = {
  regions: RegionAutocompleteOption[];
};

export type RegionCodesQuery = {
  q?: string;
  page: number;
  pageSize: number;
  sortBy?: RegionSortBy;
  sortDirection?: RegionSortDirection;
};

export type RegionCodesPageResult = {
  rows: RegionCode[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    q: string;
  };
  sort: {
    sortBy: RegionSortBy;
    sortDirection: RegionSortDirection;
  };
};

export async function getRegionCodes(
  params: RegionCodesQuery
): Promise<RegionCodesPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = params.q?.trim() ?? "";
  const pattern = normalizeLike(q);
  const sort = resolveRegionSort(params.sortBy, params.sortDirection);

  const supabase = createServerSupabaseClient();
  let query: any = supabase
    .from("region_codes")
    .select("*", { count: "exact" });

  if (pattern) {
    query = query.or(
      `region_code.ilike.${pattern},region_name.ilike.${pattern},description.ilike.${pattern}`
    );
  }
  query = query.order(REGION_SORT_COLUMN_MAP[sort.sortBy].column, {
    ascending: sort.sortDirection === "asc",
  });

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: (data ?? []) as RegionCode[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters: { q },
    sort,
  };
}

export async function exportRegionCodes(filters: {
  q?: string;
  sortBy?: RegionSortBy;
  sortDirection?: RegionSortDirection;
}): Promise<RegionCode[]> {
  noStore();

  const q = filters.q?.trim() ?? "";
  const pattern = normalizeLike(q);
  const sort = resolveRegionSort(filters.sortBy, filters.sortDirection);
  const supabase = createServerSupabaseClient();
  let query: any = supabase.from("region_codes").select("*");

  if (pattern) {
    query = query.or(
      `region_code.ilike.${pattern},region_name.ilike.${pattern},description.ilike.${pattern}`
    );
  }

  query = query.order(REGION_SORT_COLUMN_MAP[sort.sortBy].column, {
    ascending: sort.sortDirection === "asc",
  });

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown) as RegionCode[];
}

export async function getRegionCodeSuggestions(params: {
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const supabase = createServerSupabaseClient();
  const limit = Math.min(8, Math.max(1, params.limit ?? 6));
  const pattern = `%${q}%`;

  const { data, error } = await supabase
    .from("region_codes")
    .select("region_code, region_name")
    .or(`region_code.ilike.${pattern},region_name.ilike.${pattern}`)
    .order("region_code", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(
    new Set(
      (data ?? [])
        .flatMap((row) => [row.region_code, row.region_name])
        .filter((value): value is string => Boolean(value?.trim()))
        .filter((value) => value.toLowerCase().includes(q.toLowerCase()))
    )
  ).slice(0, limit);
}

export async function getRegionFilterOptions(): Promise<RegionFilterOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("region_codes")
    .select("region_code, region_name")
    .order("region_code", { ascending: true })
    .limit(REGION_FILTER_OPTION_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return {
    regions: Array.from(
      new Map(
        (data ?? []).map((row) => [
          row.region_code as string,
          {
            value: row.region_code as string,
            label: row.region_code as string,
            secondaryLabel: row.region_name ?? undefined,
            searchText: `${row.region_code ?? ""} ${row.region_name ?? ""}`.trim(),
          },
        ])
      ).values()
    ),
  };
}

export async function revalidateRegionCodesPage() {
  revalidatePath("/basic-info/regions");
  revalidatePath("/basic-info");
}
