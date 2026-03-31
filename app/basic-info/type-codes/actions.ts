"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TypeCodeRow } from "@/types/type-code";

export type TypeCodesQuery = {
  code?: string;
  page: number;
  pageSize: number;
};

export type TypeCodesPageResult = {
  rows: TypeCodeRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    code: string;
  };
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function mapRows(rows: Array<Record<string, unknown>>): TypeCodeRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.type_code ?? ""),
    typeDescription: (row.type_description as string | null | undefined) ?? null,
    remark: (row.remark as string | null | undefined) ?? null,
    status: ((row.status as string | null | undefined) ?? "ACTIVE") as
      | "ACTIVE"
      | "INACTIVE",
  }));
}

export async function getTypeCodes(
  params: TypeCodesQuery
): Promise<TypeCodesPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    code: params.code?.trim() ?? "",
  };

  const code = normalizeLike(filters.code);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("container_type_codes")
    .select("id, type_code, type_description, remark, status", {
      count: "exact",
    })
    .order("type_code", { ascending: true });

  if (code) {
    query = query.ilike("type_code", code);
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

export async function getTypeCodeSuggestions(params: {
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const limit = Math.min(8, Math.max(1, params.limit ?? 6));
  const pattern = `%${q}%`;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container_type_codes")
    .select("type_code")
    .ilike("type_code", pattern)
    .order("type_code", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.type_code)
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).slice(0, limit);
}

export async function revalidateTypeCodePages() {
  revalidatePath("/basic-info/type-codes");
  revalidatePath("/basic-info");
}

