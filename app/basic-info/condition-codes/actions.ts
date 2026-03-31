"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ConditionCodeRow } from "@/types/condition-code";

export type ConditionCodesQuery = {
  code?: string;
  name?: string;
  page: number;
  pageSize: number;
};

export type ConditionCodesPageResult = {
  rows: ConditionCodeRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    code: string;
    name: string;
  };
};

export type ConditionCodeSuggestionField = "code" | "name";

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

  const code = normalizeLike(filters.code);
  const name = normalizeLike(filters.name);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("container_condition_codes")
    .select("id, condition_code, condition_name, description, status", {
      count: "exact",
    })
    .order("condition_code", { ascending: true });

  if (code) {
    query = query.ilike("condition_code", code);
  }
  if (name) {
    query = query.ilike("condition_name", name);
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
        .map((row) => row[column])
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).slice(0, limit);
}

export async function revalidateConditionCodePages() {
  revalidatePath("/basic-info/condition-codes");
  revalidatePath("/basic-info");
}

