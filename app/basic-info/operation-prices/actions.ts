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
};

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

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("operation_price_configs")
    .select(
      "id, container_size_code_id, container_condition_code_id, addon_price, currency, effective_from, effective_to, status, remark, container_size_codes(id, size_code, remark), container_condition_codes(id, condition_code, condition_name)",
      { count: "exact" }
    )
    .order("container_size_code_id", { ascending: true })
    .order("container_condition_code_id", { ascending: true })
    .order("effective_from", { ascending: false });

  if (filters.sizeId) {
    query = query.eq("container_size_code_id", filters.sizeId);
  }
  if (filters.conditionId) {
    query = query.eq("container_condition_code_id", filters.conditionId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: mapRows((data ?? []) as Array<Record<string, unknown>>),
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
  };
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
