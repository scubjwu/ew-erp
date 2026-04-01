"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { parseCustomerSearch, ilikeContainsPattern } from "@/lib/customers/search-parser";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer, CustomerCertificateLink } from "@/types/customer";

export type CustomersPageResult = {
  rows: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
};

function applyCustomerSearch(
  query: ReturnType<ReturnType<typeof createServerSupabaseClient>["from"]>,
  rawSearch: string
) {
  const parsed = parseCustomerSearch(rawSearch);
  if (parsed.mode === "simple") {
    if (parsed.companyPattern) {
      query = query.ilike("company_name", ilikeContainsPattern(parsed.companyPattern));
    }
    return query;
  }

  for (const [column, value] of Object.entries(parsed.filters)) {
    if (!value) continue;
    query = query.ilike(column, ilikeContainsPattern(value));
  }

  return query;
}

function baseCustomerSelect() {
  return `
    *,
    region:region_codes(region_code, region_name)
  `;
}

export async function getCustomers(params: {
  search?: string;
  page: number;
  pageSize: number;
}): Promise<CustomersPageResult> {
  noStore();
  const { search = "", page, pageSize } = params;
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const supabase = createServerSupabaseClient();
  let query = supabase.from("customers").select(baseCustomerSelect(), { count: "exact" });
  query = applyCustomerSearch(query, search);
  query = query.order("company_name", { ascending: true });

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as Customer[]).map((row) => ({
      ...row,
      certificate_links: [],
    })),
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safeSize,
  };
}

export async function exportCustomers(search = ""): Promise<Customer[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  let query = supabase.from("customers").select(baseCustomerSelect());
  query = applyCustomerSearch(query, search);
  query = query.order("company_name", { ascending: true });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Customer[];
  if (rows.length === 0) return [];

  const { data: certs, error: certError } = await supabase
    .from("customer_certificate_links")
    .select("*")
    .in(
      "customer_id",
      rows.map((row) => row.id)
    );

  if (certError) throw new Error(certError.message);

  const certMap = new Map<string, CustomerCertificateLink[]>();
  for (const cert of (certs ?? []) as CustomerCertificateLink[]) {
    const current = certMap.get(cert.customer_id) ?? [];
    current.push(cert);
    certMap.set(cert.customer_id, current);
  }

  return rows.map((row) => ({
    ...row,
    certificate_links: certMap.get(row.id) ?? [],
  }));
}

export async function revalidateCustomerViews(customerId: string) {
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/partners/customers");
  revalidatePath(`/partners/customers/${customerId}`);
  revalidatePath(`/partners/customers/${customerId}/edit`);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select(baseCustomerSelect())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: certs, error: certError } = await supabase
    .from("customer_certificate_links")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: true });

  if (certError) throw new Error(certError.message);

  return {
    ...(data as Customer),
    certificate_links: (certs ?? []) as CustomerCertificateLink[],
  };
}
