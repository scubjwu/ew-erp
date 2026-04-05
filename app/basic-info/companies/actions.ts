"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CompanyProfile } from "@/types/company-profile";

export type CompanyProfilesQuery = {
  companyNameCn?: string;
  companyNameEn?: string;
  address?: string;
  phone?: string;
  email?: string;
  page: number;
  pageSize: number;
  sortBy?: CompanyProfilesSortBy;
  sortDirection?: CompanyProfilesSortDirection;
};

export type CompanyProfilesSortBy =
  | "companyNameCn"
  | "companyNameEn"
  | "address"
  | "phone"
  | "email"
  | "locationCode"
  | "status"
  | "createdBy"
  | "createdAt";
export type CompanyProfilesSortDirection = "asc" | "desc";

export type CompanyProfilesPageResult = {
  rows: CompanyProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: Omit<CompanyProfilesQuery, "page" | "pageSize">;
  sort: {
    sortBy: CompanyProfilesSortBy;
    sortDirection: CompanyProfilesSortDirection;
  };
};

export type CompanySuggestionField =
  | "companyNameCn"
  | "companyNameEn"
  | "address"
  | "phone"
  | "email";

const DEFAULT_COMPANY_PROFILES_SORT = {
  sortBy: "companyNameEn",
  sortDirection: "asc",
} satisfies {
  sortBy: CompanyProfilesSortBy;
  sortDirection: CompanyProfilesSortDirection;
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function resolveCompanyProfilesSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: CompanyProfilesSortBy;
  sortDirection: CompanyProfilesSortDirection;
} {
  return {
    sortBy:
      sortBy === "companyNameCn" ||
      sortBy === "address" ||
      sortBy === "phone" ||
      sortBy === "email" ||
      sortBy === "locationCode" ||
      sortBy === "status" ||
      sortBy === "createdBy" ||
      sortBy === "createdAt"
        ? sortBy
        : DEFAULT_COMPANY_PROFILES_SORT.sortBy,
    sortDirection:
      sortDirection === "desc" ? "desc" : DEFAULT_COMPANY_PROFILES_SORT.sortDirection,
  };
}

function companyProfilesSortColumn(sortBy: CompanyProfilesSortBy) {
  const map: Record<CompanyProfilesSortBy, string> = {
    companyNameCn: "company_name_cn",
    companyNameEn: "company_name_en",
    address: "address_en",
    phone: "phone",
    email: "email",
    locationCode: "location_code",
    status: "status",
    createdBy: "created_by",
    createdAt: "created_at",
  };
  return map[sortBy];
}

function buildCompanyProfilesQuery(
  filters: CompanyProfilesPageResult["filters"],
  sort: {
    sortBy: CompanyProfilesSortBy;
    sortDirection: CompanyProfilesSortDirection;
  }
) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("company_profiles")
    .select("*", { count: "exact" })
    .order(companyProfilesSortColumn(sort.sortBy), {
      ascending: sort.sortDirection === "asc",
      nullsFirst: false,
    });

  const companyNameCn = normalizeLike(filters.companyNameCn);
  const companyNameEn = normalizeLike(filters.companyNameEn);
  const address = normalizeLike(filters.address);
  const phone = normalizeLike(filters.phone);
  const email = normalizeLike(filters.email);

  if (companyNameCn) {
    query = query.ilike("company_name_cn", companyNameCn);
  }
  if (companyNameEn) {
    query = query.ilike("company_name_en", companyNameEn);
  }
  if (address) {
    query = query.or(`address_cn.ilike.${address},address_en.ilike.${address}`);
  }
  if (phone) {
    query = query.ilike("phone", phone);
  }
  if (email) {
    query = query.ilike("email", email);
  }

  return query;
}

export async function getCompanyProfiles(
  params: CompanyProfilesQuery
): Promise<CompanyProfilesPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    companyNameCn: params.companyNameCn?.trim() ?? "",
    companyNameEn: params.companyNameEn?.trim() ?? "",
    address: params.address?.trim() ?? "",
    phone: params.phone?.trim() ?? "",
    email: params.email?.trim() ?? "",
  };
  const sort = resolveCompanyProfilesSort(params.sortBy, params.sortDirection);
  const query = buildCompanyProfilesQuery(filters, sort);

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: (data ?? []) as CompanyProfile[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportCompanyProfiles(filters: {
  companyNameCn?: string;
  companyNameEn?: string;
  address?: string;
  phone?: string;
  email?: string;
  sortBy?: CompanyProfilesSortBy;
  sortDirection?: CompanyProfilesSortDirection;
}): Promise<CompanyProfile[]> {
  noStore();

  const normalizedFilters = {
    companyNameCn: filters.companyNameCn?.trim() ?? "",
    companyNameEn: filters.companyNameEn?.trim() ?? "",
    address: filters.address?.trim() ?? "",
    phone: filters.phone?.trim() ?? "",
    email: filters.email?.trim() ?? "",
  };
  const sort = resolveCompanyProfilesSort(filters.sortBy, filters.sortDirection);
  const query = buildCompanyProfilesQuery(normalizedFilters, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CompanyProfile[];
}

export async function revalidateCompanyProfilesPage() {
  revalidatePath("/basic-info/companies");
  revalidatePath("/basic-info");
}

export async function getCompanyProfileSuggestions(params: {
  field: CompanySuggestionField;
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const limit = Math.min(8, Math.max(1, params.limit ?? 5));
  const pattern = `%${q}%`;
  const supabase = createServerSupabaseClient();

  if (params.field === "companyNameCn") {
    const { data, error } = await supabase
      .from("company_profiles")
      .select("company_name_cn")
      .ilike("company_name_cn", pattern)
      .order("company_name_cn", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.company_name_cn)
          .filter((value): value is string => Boolean(value?.trim()))
      )
    ).slice(0, limit);
  }

  if (params.field === "companyNameEn") {
    const { data, error } = await supabase
      .from("company_profiles")
      .select("company_name_en")
      .ilike("company_name_en", pattern)
      .order("company_name_en", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.company_name_en)
          .filter((value): value is string => Boolean(value?.trim()))
      )
    ).slice(0, limit);
  }

  if (params.field === "phone") {
    const { data, error } = await supabase
      .from("company_profiles")
      .select("phone")
      .ilike("phone", pattern)
      .order("phone", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.phone)
          .filter((value): value is string => Boolean(value?.trim()))
      )
    ).slice(0, limit);
  }

  if (params.field === "email") {
    const { data, error } = await supabase
      .from("company_profiles")
      .select("email")
      .ilike("email", pattern)
      .order("email", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.email)
          .filter((value): value is string => Boolean(value?.trim()))
      )
    ).slice(0, limit);
  }

  const { data, error } = await supabase
    .from("company_profiles")
    .select("address_cn, address_en")
    .or(`address_cn.ilike.${pattern},address_en.ilike.${pattern}`)
    .order("address_en", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .flatMap((row) => [row.address_cn, row.address_en])
        .filter((value): value is string => Boolean(value?.trim()))
        .filter((value) => value.toLowerCase().includes(q.toLowerCase()))
    )
  ).slice(0, limit);
}
