"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import {
  CUSTOMER_FILTER_OPTION_LIMIT,
  CUSTOMER_SORT_COLUMN_MAP,
  normalizeLike,
  resolveCustomerSort,
  type CustomerSortBy,
  type CustomerSortDirection,
} from "@/app/customers/query-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer, CustomerCertificateLink } from "@/types/customer";

export type CustomerAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type CustomerFilterOptions = {
  customerIds: CustomerAutocompleteOption[];
  legalCompanyNames: CustomerAutocompleteOption[];
};

export type CustomerQuery = {
  customerId?: string;
  companyName?: string;
  page: number;
  pageSize: number;
  sortBy?: CustomerSortBy;
  sortDirection?: CustomerSortDirection;
};

export type CustomersPageResult = {
  rows: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    customerId: string;
    companyName: string;
  };
  sort: {
    sortBy: CustomerSortBy;
    sortDirection: CustomerSortDirection;
  };
};

function applyCustomerFilters(
  query: any,
  filters: {
    customerId?: string;
    companyName?: string;
  }
) {
  const customerId = normalizeLike(filters.customerId);
  const companyName = normalizeLike(filters.companyName);

  if (customerId) query = query.ilike("customer_custom_id", customerId);
  if (companyName) query = query.ilike("company_name", companyName);
  return query;
}

function baseCustomerSelect() {
  return `
    *,
    region:region_codes(region_code, region_name)
  `;
}

function applyCustomerSort(
  query: any,
  sort: { sortBy: CustomerSortBy; sortDirection: CustomerSortDirection }
) {
  const mapping = CUSTOMER_SORT_COLUMN_MAP[sort.sortBy];
  if (mapping.foreignTable) {
    return query.order(mapping.column, {
      ascending: sort.sortDirection === "asc",
      foreignTable: mapping.foreignTable,
    });
  }

  return query.order(mapping.column, {
    ascending: sort.sortDirection === "asc",
  });
}

export async function getCustomers(params: CustomerQuery): Promise<CustomersPageResult> {
  noStore();
  const filters = {
    customerId: params.customerId?.trim() ?? "",
    companyName: params.companyName?.trim() ?? "",
  };
  const sort = resolveCustomerSort(params.sortBy, params.sortDirection);
  const { page, pageSize } = params;
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const supabase = createServerSupabaseClient();
  let query = supabase.from("customers").select(baseCustomerSelect(), { count: "exact" });
  query = applyCustomerFilters(query, filters);
  query = applyCustomerSort(query, sort);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: (((data ?? []) as unknown) as Customer[]).map((row) => ({
      // The list view does not need certificate joins during the initial query.
      ...row,
      certificate_links: [],
    })),
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safeSize,
    filters,
    sort,
  };
}

export async function exportCustomers(filters: {
  customerId?: string;
  companyName?: string;
  sortBy?: CustomerSortBy;
  sortDirection?: CustomerSortDirection;
}): Promise<Customer[]> {
  noStore();
  const normalizedFilters = {
    customerId: filters.customerId?.trim() ?? "",
    companyName: filters.companyName?.trim() ?? "",
  };
  const sort = resolveCustomerSort(filters.sortBy, filters.sortDirection);
  const supabase = createServerSupabaseClient();
  let query = supabase.from("customers").select(baseCustomerSelect());
  query = applyCustomerFilters(query, normalizedFilters);
  query = applyCustomerSort(query, sort);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown) as Customer[];
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

export async function getCustomerFilterOptions(): Promise<CustomerFilterOptions> {
  noStore();
  const supabase = createServerSupabaseClient();

  const [{ data: idRows, error: idError }, { data: companyRows, error: companyError }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("customer_custom_id, company_name")
        .not("customer_custom_id", "is", null)
        .order("customer_custom_id", { ascending: true })
        .limit(CUSTOMER_FILTER_OPTION_LIMIT),
      supabase
        .from("customers")
        .select("company_name, customer_custom_id")
        .order("company_name", { ascending: true })
        .limit(CUSTOMER_FILTER_OPTION_LIMIT),
    ]);

  if (idError) throw new Error(idError.message);
  if (companyError) throw new Error(companyError.message);

  return {
    customerIds: Array.from(
      new Map(
        (idRows ?? [])
          .filter((row) => Boolean(row.customer_custom_id))
          .map((row) => [
            row.customer_custom_id as string,
            {
              value: row.customer_custom_id as string,
              label: row.customer_custom_id as string,
              secondaryLabel: row.company_name ?? undefined,
              searchText: `${row.customer_custom_id ?? ""} ${row.company_name ?? ""}`.trim(),
            },
          ])
      ).values()
    ),
    legalCompanyNames: Array.from(
      new Map(
        (companyRows ?? [])
          .filter((row) => Boolean(row.company_name))
          .map((row) => [
            row.company_name as string,
            {
              value: row.company_name as string,
              label: row.company_name as string,
              secondaryLabel: row.customer_custom_id ?? undefined,
              searchText: `${row.company_name ?? ""} ${row.customer_custom_id ?? ""}`.trim(),
            },
          ])
      ).values()
    ),
  };
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
    ...((data as unknown) as Customer),
    certificate_links: (certs ?? []) as CustomerCertificateLink[],
  };
}
