"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FinancialCodeCategory, FinancialCodeRow } from "@/types/financial-code";

export type FinancialCodesQuery = {
  category: FinancialCodeCategory;
  code?: string;
  name?: string;
  enabled?: string;
  page: number;
  pageSize: number;
};

export type FinancialCodesPageResult = {
  rows: FinancialCodeRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    category: FinancialCodeCategory;
    code: string;
    name: string;
    enabled: string;
  };
};

export type FinancialCodeSuggestionField = "code" | "name";

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function tableForCategory(category: FinancialCodeCategory) {
  return category === "INCOME" ? "revenue_codes" : "cost_codes";
}

function codeColumnForCategory(category: FinancialCodeCategory) {
  return category === "INCOME" ? "revenue_code" : "cost_code";
}

function nameColumnForCategory(category: FinancialCodeCategory) {
  return category === "INCOME" ? "revenue_name" : "cost_name";
}

function mapRows(
  category: FinancialCodeCategory,
  rows: Array<Record<string, unknown>>
): FinancialCodeRow[] {
  const codeColumn = codeColumnForCategory(category);
  const nameColumn = nameColumnForCategory(category);
  return rows.map((row) => ({
    id: String(row.id),
    category,
    code: String(row[codeColumn] ?? ""),
    name: String(row[nameColumn] ?? ""),
    description: (row.description as string | null | undefined) ?? null,
    status: ((row.status as string | null | undefined) ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
    created_at: (row.created_at as string | null | undefined) ?? null,
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }));
}

export async function getFinancialCodes(
  params: FinancialCodesQuery
): Promise<FinancialCodesPageResult> {
  noStore();

  const category = params.category;
  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const codeColumn = codeColumnForCategory(category);
  const nameColumn = nameColumnForCategory(category);

  const filters = {
    category,
    code: params.code?.trim() ?? "",
    name: params.name?.trim() ?? "",
    enabled: params.enabled?.trim() ?? "",
  };

  const code = normalizeLike(filters.code);
  const name = normalizeLike(filters.name);
  const selectColumns =
    category === "INCOME"
      ? "id, revenue_code, revenue_name, description, status, created_at, updated_at"
      : "id, cost_code, cost_name, description, status, created_at, updated_at";

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from(tableForCategory(category))
    .select(selectColumns, {
      count: "exact",
    })
    .order(codeColumn, { ascending: true });

  if (code) {
    query = query.ilike(codeColumn, code);
  }
  if (name) {
    query = query.ilike(nameColumn, name);
  }
  if (filters.enabled) {
    query = query.eq("status", filters.enabled === "ENABLED" ? "ACTIVE" : "INACTIVE");
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: mapRows(category, (data ?? []) as Array<Record<string, unknown>>),
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
  };
}

export async function getFinancialCodeSuggestions(params: {
  category: FinancialCodeCategory;
  field: FinancialCodeSuggestionField;
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const category = params.category;
  const limit = Math.min(8, Math.max(1, params.limit ?? 6));
  const pattern = `%${q}%`;
  const column =
    params.field === "code"
      ? codeColumnForCategory(category)
      : nameColumnForCategory(category);

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from(tableForCategory(category))
    .select(column)
    .ilike(column, pattern)
    .order(column, { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row[column])
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).slice(0, limit);
}

export async function revalidateFinancialCodePages() {
  revalidatePath("/basic-info/cost-codes");
  revalidatePath("/basic-info/revenue-codes");
  revalidatePath("/basic-info");
}
