"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ConditionCodeRow } from "@/types/condition-code";

export type ConditionCodesQuery = {
  code?: string;
  name?: string;
  page: number;
  pageSize: number;
  sortBy?: ConditionCodeSortBy;
  sortDirection?: ConditionCodeSortDirection;
};

export type ConditionCodeSortBy = "code" | "name" | "description" | "status";
export type ConditionCodeSortDirection = "asc" | "desc";

export type ConditionCodesPageResult = {
  rows: ConditionCodeRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    code: string;
    name: string;
  };
  sort: {
    sortBy: ConditionCodeSortBy;
    sortDirection: ConditionCodeSortDirection;
  };
};

export type ConditionCodeSuggestionField = "code" | "name";

const DEFAULT_CONDITION_CODE_SORT = {
  sortBy: "code",
  sortDirection: "asc",
} satisfies {
  sortBy: ConditionCodeSortBy;
  sortDirection: ConditionCodeSortDirection;
};

const CONDITION_CODE_SORT_COLUMN_MAP: Record<ConditionCodeSortBy, string> = {
  code: "condition_code",
  name: "condition_name",
  description: "description",
  status: "status",
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function mapRows(rows: Array<Record<string, unknown>>): ConditionCodeRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.condition_code ?? ""),
    name: String(row.condition_name ?? ""),
    description: (row.description as string | null | undefined) ?? null,
    status: ((row.status as string | null | undefined) ?? "ACTIVE") as
      | "ACTIVE"
      | "INACTIVE",
  }));
}

function resolveConditionCodeSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: ConditionCodeSortBy;
  sortDirection: ConditionCodeSortDirection;
} {
  return {
    sortBy:
      sortBy && sortBy in CONDITION_CODE_SORT_COLUMN_MAP
        ? (sortBy as ConditionCodeSortBy)
        : DEFAULT_CONDITION_CODE_SORT.sortBy,
    sortDirection:
      sortDirection === "desc" ? "desc" : DEFAULT_CONDITION_CODE_SORT.sortDirection,
  };
}

function buildConditionCodesQuery(
  filters: ConditionCodesPageResult["filters"],
  sort: {
    sortBy: ConditionCodeSortBy;
    sortDirection: ConditionCodeSortDirection;
  }
) {
  const code = normalizeLike(filters.code);
  const name = normalizeLike(filters.name);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("container_condition_codes")
    .select("id, condition_code, condition_name, description, status", {
      count: "exact",
    })
    .order(CONDITION_CODE_SORT_COLUMN_MAP[sort.sortBy], {
      ascending: sort.sortDirection === "asc",
    });

  if (code) {
    query = query.ilike("condition_code", code);
  }
  if (name) {
    query = query.ilike("condition_name", name);
  }

  return query;
}

export async function getConditionCodes(
  params: ConditionCodesQuery
): Promise<ConditionCodesPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    code: params.code?.trim() ?? "",
    name: params.name?.trim() ?? "",
  };
  const sort = resolveConditionCodeSort(params.sortBy, params.sortDirection);
  const query = buildConditionCodesQuery(filters, sort);

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

export async function exportConditionCodes(filters: {
  code?: string;
  name?: string;
  sortBy?: ConditionCodeSortBy;
  sortDirection?: ConditionCodeSortDirection;
}): Promise<ConditionCodeRow[]> {
  noStore();

  const normalizedFilters = {
    code: filters.code?.trim() ?? "",
    name: filters.name?.trim() ?? "",
  };
  const sort = resolveConditionCodeSort(filters.sortBy, filters.sortDirection);
  const query = buildConditionCodesQuery(normalizedFilters, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapRows((data ?? []) as Array<Record<string, unknown>>);
}

export async function getConditionCodeSuggestions(params: {
  field: ConditionCodeSuggestionField;
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const limit = Math.min(8, Math.max(1, params.limit ?? 6));
  const pattern = `%${q}%`;
  const column =
    params.field === "code" ? "condition_code" : "condition_name";

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container_condition_codes")
    .select(column)
    .ilike(column, pattern)
    .order(column, { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => (row as Record<string, unknown>)[column])
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    )
  ).slice(0, limit);
}

export async function revalidateConditionCodePages() {
  revalidatePath("/basic-info/condition-codes");
  revalidatePath("/basic-info");
}
