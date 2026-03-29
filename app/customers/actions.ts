"use server";

import {
  CUSTOMER_SEARCH_KEYS,
  ilikeContainsPattern,
  parseCustomerSearch,
} from "@/lib/customers/search-parser";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer } from "@/types/customer";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export type CustomersPageResult = {
  rows: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
};

/**
 * Applies parsed search with ANDed `ilike` filters.
 * For large tables, enable `pg_trgm` + GIN indexes on filtered columns (see
 * `supabase/migrations` optional migration) so `%value%` can use index scans.
 */
function applyCustomerSearchFilters<
  T extends { ilike: (col: string, pattern: string) => T },
>(query: T, q: string): T {
  const parsed = parseCustomerSearch(q);

  if (parsed.mode === "simple") {
    if (!parsed.companyPattern) return query;
    return query.ilike(
      "company_name",
      ilikeContainsPattern(parsed.companyPattern)
    );
  }

  let next = query;
  for (const col of CUSTOMER_SEARCH_KEYS) {
    const val = parsed.filters[col];
    if (val == null || !String(val).trim()) continue;
    next = next.ilike(col, ilikeContainsPattern(val));
  }
  return next;
}

export async function getCustomers(params: {
  q: string;
  page: number;
  pageSize: number;
}): Promise<CustomersPageResult> {
  noStore();
  const { q, page, pageSize } = params;
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const supabase = createServerSupabaseClient();

  let query = supabase.from("customers").select("*", { count: "exact" });
  query = applyCustomerSearchFilters(query, q);
  query = query.order("company_name", { ascending: true });

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: (data ?? []) as Customer[],
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safeSize,
  };
}

/** Clears Next.js Router / Data cache for list + detail so revisits fetch fresh rows. */
export async function revalidateCustomerViews(customerId: string) {
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Customer | null) ?? null;
}
