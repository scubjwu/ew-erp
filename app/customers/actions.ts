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
import type { Customer, CustomerCertificateLink, CustomerDepot } from "@/types/customer";

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

type CustomerDepotQueryRow = {
  id: string;
  customer_id: string;
  city_code: string;
  depot_name: string;
  depot_address: string | null;
  depot_contact_person: string | null;
  depot_tel: string | null;
  contact_email: string | null;
  is_default: boolean | null;
  status: "ACTIVE" | "INACTIVE";
  remark: string | null;
  created_at: string;
  updated_at: string;
  city?: {
    city_code: string | null;
    city_name: string | null;
  } | Array<{
    city_code: string | null;
    city_name: string | null;
  }> | null;
};

function compareCustomerDepotStatus(a: string, b: string) {
  if (a === b) return 0;
  if (a === "ACTIVE") return -1;
  if (b === "ACTIVE") return 1;
  return a.localeCompare(b);
}

function mapCustomerDepotRows(rows: CustomerDepotQueryRow[]): CustomerDepot[] {
  return rows
    .map((row) => {
      const cityRecord = Array.isArray(row.city) ? row.city[0] : row.city;
      return {
        id: row.id,
        customer_id: row.customer_id,
        city_code: row.city_code,
        city_name: cityRecord?.city_name ?? "",
        depot_name: row.depot_name,
        depot_address: row.depot_address ?? "",
        depot_contact_person: row.depot_contact_person ?? "",
        depot_tel: row.depot_tel ?? "",
        contact_email: row.contact_email ?? "",
        is_default: Boolean(row.is_default),
        status: row.status,
        remark: row.remark ?? "",
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    })
    .sort((left, right) => {
      const statusOrder = compareCustomerDepotStatus(left.status, right.status);
      if (statusOrder !== 0) return statusOrder;
      return left.city_code.localeCompare(right.city_code);
    });
}

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

  const { data: depots, error: depotError } = await supabase
    .from("customer_depot")
    .select(
      `
        id,
        customer_id,
        city_code,
        depot_name,
        depot_address,
        depot_contact_person,
        depot_tel,
        contact_email,
        is_default,
        status,
        remark,
        created_at,
        updated_at,
        city:cities(city_code, city_name)
      `
    )
    .eq("customer_id", id);

  if (depotError) throw new Error(depotError.message);

  return {
    ...((data as unknown) as Customer),
    customer_depots: mapCustomerDepotRows((depots ?? []) as CustomerDepotQueryRow[]),
    certificate_links: (certs ?? []) as CustomerCertificateLink[],
  };
}
