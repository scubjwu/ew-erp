"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SizeCodeRow } from "@/types/size-code";

export type SizeCodesQuery = {
  code?: string;
  page: number;
  pageSize: number;
};

export type SizeCodesPageResult = {
  rows: SizeCodeRow[];
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

function mapRows(rows: Array<Record<string, unknown>>): SizeCodeRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.size_code ?? ""),
    name: String(row.size_name ?? row.remark ?? ""),
    status: ((row.status as string | null | undefined) ?? "ACTIVE") as
      | "ACTIVE"
      | "INACTIVE",
  }));
}

export async function getSizeCodes(
  params: SizeCodesQuery
): Promise<SizeCodesPageResult> {
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
    .from("container_size_codes")
    .select("id, size_code, size_name, remark, status", {
      count: "exact",
    })
    .order("size_code", { ascending: true });

  if (code) {
    query = query.ilike("size_code", code);
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

export async function getSizeCodeSuggestions(params: {
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
    .from("container_size_codes")
    .select("size_code")
    .ilike("size_code", pattern)
    .order("size_code", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.size_code)
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).slice(0, limit);
}

export async function revalidateSizeCodePages() {
  revalidatePath("/basic-info/size-codes");
  revalidatePath("/basic-info");
}
