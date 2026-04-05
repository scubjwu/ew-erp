"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  OperationPriceOption,
  OperationPriceRow,
} from "@/types/operation-price-config";

export type OperationPricesQuery = {
  sizeId?: string;
  conditionId?: string;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: OperationPricesSortBy;
  sortDirection?: OperationPricesSortDirection;
};

export type OperationPricesSortBy =
  | "size"
  | "condition"
  | "addonPrice"
  | "currency"
  | "effectiveFrom"
  | "effectiveTo"
  | "status"
  | "remark";
export type OperationPricesSortDirection = "asc" | "desc";

export type OperationPricesPageResult = {
  rows: OperationPriceRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    sizeId: string;
    conditionId: string;
    status: string;
  };
  sort: {
    sortBy: OperationPricesSortBy;
    sortDirection: OperationPricesSortDirection;
  };
};

export const DEFAULT_OPERATION_PRICES_SORT = {
  sortBy: "size",
  sortDirection: "asc",
} satisfies {
  sortBy: OperationPricesSortBy;
  sortDirection: OperationPricesSortDirection;
};

function mapRows(rows: Array<Record<string, unknown>>): OperationPriceRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    container_size_code_id: String(row.container_size_code_id ?? ""),
    container_condition_code_id: String(row.container_condition_code_id ?? ""),
    addon_price: (row.addon_price as string | number | null | undefined) ?? 0,
    currency: String(row.currency ?? "USD"),
    effective_from: String(row.effective_from ?? ""),
    effective_to: (row.effective_to as string | null | undefined) ?? null,
    status: ((row.status as string | null | undefined) ?? "ACTIVE") as
      | "ACTIVE"
      | "INACTIVE",
    remark: (row.remark as string | null | undefined) ?? null,
    container_size_codes:
      (row.container_size_codes as OperationPriceRow["container_size_codes"]) ?? null,
    container_condition_codes:
      (row.container_condition_codes as OperationPriceRow["container_condition_codes"]) ??
      null,
  }));
}

function resolveOperationPricesSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: OperationPricesSortBy;
  sortDirection: OperationPricesSortDirection;
} {
  return {
    sortBy:
      sortBy === "condition" ||
      sortBy === "addonPrice" ||
      sortBy === "currency" ||
      sortBy === "effectiveFrom" ||
      sortBy === "effectiveTo" ||
      sortBy === "status" ||
      sortBy === "remark"
        ? sortBy
        : DEFAULT_OPERATION_PRICES_SORT.sortBy,
    sortDirection:
      sortDirection === "desc" ? "desc" : DEFAULT_OPERATION_PRICES_SORT.sortDirection,
  };
}

function applyOperationPricesSort(
  query: any,
  sort: {
    sortBy: OperationPricesSortBy;
    sortDirection: OperationPricesSortDirection;
  }
) {
  const ascending = sort.sortDirection === "asc";
  if (sort.sortBy === "size") {
    return query
      .order("size_code", { ascending, foreignTable: "container_size_codes" })
      .order("condition_code", { ascending: true, foreignTable: "container_condition_codes" })
      .order("effective_from", { ascending: false });
  }
  if (sort.sortBy === "condition") {
    return query
      .order("condition_code", {
        ascending,
        foreignTable: "container_condition_codes",
      })
      .order("size_code", { ascending: true, foreignTable: "container_size_codes" })
      .order("effective_from", { ascending: false });
  }

  const columnMap: Record<Exclude<OperationPricesSortBy, "size" | "condition">, string> = {
    addonPrice: "addon_price",
    currency: "currency",
    effectiveFrom: "effective_from",
    effectiveTo: "effective_to",
    status: "status",
    remark: "remark",
  };
  return query.order(columnMap[sort.sortBy], { ascending });
}

function buildOperationPricesQuery(
  filters: OperationPricesPageResult["filters"],
  sort: {
    sortBy: OperationPricesSortBy;
    sortDirection: OperationPricesSortDirection;
  }
) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("operation_price_configs")
    .select(
      "id, container_size_code_id, container_condition_code_id, addon_price, currency, effective_from, effective_to, status, remark, container_size_codes(id, size_code, remark), container_condition_codes(id, condition_code, condition_name)",
      { count: "exact" }
    );

  query = applyOperationPricesSort(query, sort);

  if (filters.sizeId) {
    query = query.eq("container_size_code_id", filters.sizeId);
  }
  if (filters.conditionId) {
    query = query.eq("container_condition_code_id", filters.conditionId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  return query;
}

export async function getOperationPrices(
  params: OperationPricesQuery
): Promise<OperationPricesPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    sizeId: params.sizeId?.trim() ?? "",
    conditionId: params.conditionId?.trim() ?? "",
    status: params.status?.trim() ?? "",
  };
  const sort = resolveOperationPricesSort(params.sortBy, params.sortDirection);
  const query = buildOperationPricesQuery(filters, sort);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: mapRows((data ?? []) as Array<Record<string, unknown>>),
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportOperationPrices(filters: {
  sizeId?: string;
  conditionId?: string;
  status?: string;
  sortBy?: OperationPricesSortBy;
  sortDirection?: OperationPricesSortDirection;
}): Promise<OperationPriceRow[]> {
  noStore();

  const normalizedFilters = {
    sizeId: filters.sizeId?.trim() ?? "",
    conditionId: filters.conditionId?.trim() ?? "",
    status: filters.status?.trim() ?? "",
  };
  const sort = resolveOperationPricesSort(filters.sortBy, filters.sortDirection);
  const query = buildOperationPricesQuery(normalizedFilters, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapRows((data ?? []) as Array<Record<string, unknown>>);
}

export async function getOperationPriceFormOptions(): Promise<{
  sizeOptions: OperationPriceOption[];
  conditionOptions: OperationPriceOption[];
}> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [{ data: sizes, error: sizeError }, { data: conditions, error: conditionError }] =
    await Promise.all([
      supabase
        .from("container_size_codes")
        .select("id, size_code, remark, status")
        .eq("status", "ACTIVE")
        .order("size_code", { ascending: true }),
      supabase
        .from("container_condition_codes")
        .select("id, condition_code, condition_name, status")
        .eq("status", "ACTIVE")
        .order("condition_code", { ascending: true }),
    ]);

  if (sizeError) throw new Error(sizeError.message);
  if (conditionError) throw new Error(conditionError.message);

  return {
    sizeOptions: ((sizes ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      code: String(row.size_code ?? ""),
      label: String(row.size_code ?? ""),
    })),
    conditionOptions: ((conditions ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      code: String(row.condition_code ?? ""),
      label: String(row.condition_code ?? ""),
    })),
  };
}

export async function revalidateOperationPricePages() {
  revalidatePath("/basic-info/operation-prices");
  revalidatePath("/basic-info");
}
