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
};

export type CompanyProfilesPageResult = {
  rows: CompanyProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: Omit<CompanyProfilesQuery, "page" | "pageSize">;
};

export type CompanySuggestionField =
  | "companyNameCn"
  | "companyNameEn"
  | "address"
  | "phone"
  | "email";

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
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

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("company_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

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
    query = query.or(
      `address_cn.ilike.${address},address_en.ilike.${address}`
    );
  }
  if (phone) {
    query = query.ilike("phone", phone);
  }
  if (email) {
    query = query.ilike("email", email);
  }

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
  };
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
      .order("created_at", { ascending: false })
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
      .order("created_at", { ascending: false })
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
      .order("created_at", { ascending: false })
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
      .order("created_at", { ascending: false })
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
    .order("created_at", { ascending: false })
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
