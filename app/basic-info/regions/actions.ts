"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RegionCode } from "@/types/region-code";

export type RegionCodesQuery = {
  q?: string;
  page: number;
  pageSize: number;
};

export type RegionCodesPageResult = {
  rows: RegionCode[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    q: string;
  };
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

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

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("region_codes")
    .select("*", { count: "exact" })
    .order("region_code", { ascending: true });

  if (pattern) {
    query = query.or(
      `region_code.ilike.${pattern},region_name.ilike.${pattern},description.ilike.${pattern}`
    );
  }

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
  };
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

export async function revalidateRegionCodesPage() {
  revalidatePath("/basic-info/regions");
  revalidatePath("/basic-info");
}
