"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DepotCityOption, DepotCodeRow } from "@/types/depot-code";

export type DepotSuggestionField = "depotCode" | "depotName";

export type DepotCodesQuery = {
  depotCode?: string;
  depotName?: string;
  cityId?: string;
  depotType?: string;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: DepotCodesSortBy;
  sortDirection?: DepotCodesSortDirection;
};

export type DepotCodesSortBy =
  | "cityCode"
  | "depotCode"
  | "depotName"
  | "depotType"
  | "isPrimaryDepot"
  | "address"
  | "contactPerson"
  | "contactEmail"
  | "depotTel";
export type DepotCodesSortDirection = "asc" | "desc";

export type DepotCodesPageResult = {
  rows: DepotCodeRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    depotCode: string;
    depotName: string;
    cityId: string;
    depotType: string;
    status: string;
  };
  sort: {
    sortBy: DepotCodesSortBy;
    sortDirection: DepotCodesSortDirection;
  };
};

const DEFAULT_DEPOT_CODES_SORT = {
  sortBy: "depotCode",
  sortDirection: "asc",
} satisfies {
  sortBy: DepotCodesSortBy;
  sortDirection: DepotCodesSortDirection;
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function resolveDepotCodesSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: DepotCodesSortBy;
  sortDirection: DepotCodesSortDirection;
} {
  return {
    sortBy:
      sortBy === "cityCode" ||
      sortBy === "depotName" ||
      sortBy === "depotType" ||
      sortBy === "isPrimaryDepot" ||
      sortBy === "address" ||
      sortBy === "contactPerson" ||
      sortBy === "contactEmail" ||
      sortBy === "depotTel"
        ? sortBy
        : DEFAULT_DEPOT_CODES_SORT.sortBy,
    sortDirection:
      sortDirection === "desc" ? "desc" : DEFAULT_DEPOT_CODES_SORT.sortDirection,
  };
}

function applyDepotCodesSort(
  query: ReturnType<typeof createServerSupabaseClient>["from"] extends never
    ? never
    : any,
  sort: {
    sortBy: DepotCodesSortBy;
    sortDirection: DepotCodesSortDirection;
  }
) {
  const ascending = sort.sortDirection === "asc";

  if (sort.sortBy === "cityCode") {
    return query.order("city_code", { ascending, foreignTable: "cities" });
  }

  const columnMap: Record<Exclude<DepotCodesSortBy, "cityCode">, string> = {
    depotCode: "depot_code",
    depotName: "depot_name",
    depotType: "depot_type",
    isPrimaryDepot: "is_primary_depot",
    address: "depot_address",
    contactPerson: "contact_person",
    contactEmail: "gate_email",
    depotTel: "depot_tel",
  };

  return query.order(columnMap[sort.sortBy], { ascending });
}

function buildDepotCodesQuery(
  filters: DepotCodesPageResult["filters"],
  sort: {
    sortBy: DepotCodesSortBy;
    sortDirection: DepotCodesSortDirection;
  }
) {
  const depotCode = normalizeLike(filters.depotCode);
  const depotName = normalizeLike(filters.depotName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("depots")
    .select(
      "id, depot_code, depot_name, depot_name_cn, depot_type, depot_address, depot_address_cn, contact_person, contact_email, depot_tel, fax, gate_email, account_email, business_contact_person, country_code, country_name, status, is_primary_depot, working_hour, currency, free_days, gate_in_20_cost, gate_out_20_cost, gate_in_40_cost, gate_out_40_cost, lift_in_20_cost, lift_out_20_cost, lift_in_40_cost, lift_out_40_cost, storage_rate_20, storage_rate_40, storage_rate_45, storage_rate_53, digging_cost, pti_cost, labour_cost, min_repair_cost, survey_cost, inspection_cost, est_recovery_fee, user_return_surcharge_in, user_return_surcharge_out, settlement_cycle, payment_remark, other_terms_remark, data_updated_on, remark, depot_attachment_url, created_at, updated_at, city_id, region_id, depot_additional_costs(id, cost_item, rate, currency, remark), depot_attachment_links(id, url), cities(id, city_code, city_name, country, region_id, region, region_codes(id, region_code, region_name))",
      { count: "exact" }
    );

  query = applyDepotCodesSort(query, sort);

  if (depotCode) {
    query = query.ilike("depot_code", depotCode);
  }
  if (depotName) {
    query = query.or(`depot_name.ilike.${depotName},depot_name_cn.ilike.${depotName}`);
  }
  if (filters.cityId) {
    query = query.eq("city_id", filters.cityId);
  }
  if (filters.depotType) {
    query = query.eq("depot_type", filters.depotType);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  return query;
}

export async function getDepotCodes(
  params: DepotCodesQuery
): Promise<DepotCodesPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    depotCode: params.depotCode?.trim() ?? "",
    depotName: params.depotName?.trim() ?? "",
    cityId: params.cityId?.trim() ?? "",
    depotType: params.depotType?.trim() ?? "",
    status: params.status?.trim() ?? "",
  };
  const sort = resolveDepotCodesSort(params.sortBy, params.sortDirection);
  const query = buildDepotCodesQuery(filters, sort);

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: ((data ?? []) as unknown) as DepotCodeRow[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportDepotCodes(filters: {
  depotCode?: string;
  depotName?: string;
  cityId?: string;
  depotType?: string;
  status?: string;
  sortBy?: DepotCodesSortBy;
  sortDirection?: DepotCodesSortDirection;
}): Promise<DepotCodeRow[]> {
  noStore();

  const normalizedFilters = {
    depotCode: filters.depotCode?.trim() ?? "",
    depotName: filters.depotName?.trim() ?? "",
    cityId: filters.cityId?.trim() ?? "",
    depotType: filters.depotType?.trim() ?? "",
    status: filters.status?.trim() ?? "",
  };
  const sort = resolveDepotCodesSort(filters.sortBy, filters.sortDirection);
  const query = buildDepotCodesQuery(normalizedFilters, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as DepotCodeRow[];
}

export async function getDepotSuggestions(params: {
  field: DepotSuggestionField;
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const limit = Math.min(8, Math.max(1, params.limit ?? 6));
  const pattern = `%${q}%`;
  const supabase = createServerSupabaseClient();

  if (params.field === "depotCode") {
    const { data, error } = await supabase
      .from("depots")
      .select("depot_code")
      .ilike("depot_code", pattern)
      .order("depot_code", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.depot_code)
          .filter((value): value is string => Boolean(value?.trim()))
      )
    ).slice(0, limit);
  }

  const { data, error } = await supabase
    .from("depots")
    .select("depot_name, depot_name_cn")
    .or(`depot_name.ilike.${pattern},depot_name_cn.ilike.${pattern}`)
    .order("depot_name", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .flatMap((row) => [row.depot_name, row.depot_name_cn])
        .filter((value): value is string => Boolean(value?.trim()))
        .filter((value) => value.toLowerCase().includes(q.toLowerCase()))
    )
  ).slice(0, limit);
}

export async function getDepotCityOptions(): Promise<DepotCityOption[]> {
  noStore();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, city_code, city_name, country, region_id, region_codes(region_name)")
    .order("city_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    city_code: String(row.city_code ?? ""),
    city_name: String(row.city_name ?? ""),
    country: String(row.country ?? ""),
    region_id: (row.region_id as string | null | undefined) ?? null,
    region_name:
      ((row.region_codes as { region_name?: string | null } | null | undefined)
        ?.region_name ?? null),
  }));
}

export async function getSuggestedDepotCode(params: {
  cityId: string;
  depotName?: string;
}): Promise<string> {
  noStore();

  const cityId = params.cityId.trim();
  if (!cityId) {
    return "";
  }

  const supabase = createServerSupabaseClient();
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("city_code")
    .eq("id", cityId)
    .single();

  if (cityError) {
    throw new Error(cityError.message);
  }

  const cityCode = (city?.city_code ?? "").trim().toUpperCase();
  if (!cityCode) {
    return "";
  }

  const { data, error } = await supabase
    .from("depots")
    .select("depot_code")
    .ilike("depot_code", `${cityCode}%`)
    .order("depot_code", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  let nextSequence = 1;
  for (const row of data ?? []) {
    const depotCode = (row.depot_code ?? "").toString().trim().toUpperCase();
    if (!depotCode.startsWith(cityCode) || depotCode.length !== cityCode.length + 3) {
      continue;
    }
    const suffix = depotCode.slice(cityCode.length);
    if (!/^\d{3}$/.test(suffix)) {
      continue;
    }
    nextSequence = Math.max(nextSequence, Number.parseInt(suffix, 10) + 1);
  }

  return `${cityCode}${String(nextSequence).padStart(3, "0")}`;
}

export async function revalidateDepotCodesPage() {
  revalidatePath("/basic-info/depots");
  revalidatePath("/basic-info");
}
