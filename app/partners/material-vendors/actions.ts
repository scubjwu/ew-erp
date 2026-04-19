"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  MaterialVendor,
  MaterialVendorAttachmentLink,
} from "@/types/material-vendor";
import {
  MATERIAL_VENDOR_FILTER_OPTION_LIMIT,
  MATERIAL_VENDOR_SORT_COLUMN_MAP,
  normalizeLike,
  resolveMaterialVendorSort,
  type MaterialVendorSortBy,
  type MaterialVendorSortDirection,
} from "@/app/partners/material-vendors/query-helpers";

export type MaterialVendorQuery = {
  vendorCode?: string;
  legalCompanyName?: string;
  materialCategory?: string;
  isDefaultVendor?: string;
  sortBy?: MaterialVendorSortBy;
  sortDirection?: MaterialVendorSortDirection;
  page: number;
  pageSize: number;
};

export type MaterialVendorPageResult = {
  rows: MaterialVendor[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    vendorCode: string;
    legalCompanyName: string;
    materialCategory: string;
    isDefaultVendor: string;
  };
  sort: {
    sortBy: MaterialVendorSortBy;
    sortDirection: MaterialVendorSortDirection;
  };
};

export type MaterialVendorBuyerOption = {
  id: string;
  full_name: string | null;
  email: string;
};

export type MaterialVendorAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type MaterialVendorFilterOptions = {
  vendorCodes: MaterialVendorAutocompleteOption[];
  legalCompanyNames: MaterialVendorAutocompleteOption[];
};

function baseMaterialVendorSelect() {
  return `
    *,
    pic_user:users(id, full_name)
  `;
}

function dedupeAutocompleteOptions(options: MaterialVendorAutocompleteOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.value}::${option.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyMaterialVendorSort<
  TQuery extends { order: (...args: any[]) => TResult },
  TResult
>(
  query: TQuery,
  sort: { sortBy: MaterialVendorSortBy; sortDirection: MaterialVendorSortDirection }
): TResult {
  const mapping = MATERIAL_VENDOR_SORT_COLUMN_MAP[sort.sortBy];
  return query.order(mapping.column, {
    ascending: sort.sortDirection === "asc",
  });
}

export async function getMaterialVendors(
  params: MaterialVendorQuery
): Promise<MaterialVendorPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sort = resolveMaterialVendorSort(params.sortBy, params.sortDirection);

  const filters = {
    vendorCode: params.vendorCode?.trim() ?? "",
    legalCompanyName: params.legalCompanyName?.trim() ?? "",
    materialCategory: params.materialCategory?.trim() ?? "",
    isDefaultVendor: params.isDefaultVendor?.trim() ?? "",
  };

  const vendorCode = normalizeLike(filters.vendorCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("material_vendors")
    .select(baseMaterialVendorSelect(), { count: "exact" });

  if (vendorCode) {
    query = query.ilike("vendor_code", vendorCode);
  }
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (filters.materialCategory) {
    query = query.eq("material_category", filters.materialCategory);
  }
  if (filters.isDefaultVendor === "yes") {
    query = query.eq("is_default_vendor", true);
  }
  if (filters.isDefaultVendor === "no") {
    query = query.eq("is_default_vendor", false);
  }

  query = applyMaterialVendorSort(query, sort);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as MaterialVendor[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportMaterialVendors(filters: {
  vendorCode?: string;
  legalCompanyName?: string;
  materialCategory?: string;
  isDefaultVendor?: string;
  sortBy?: MaterialVendorSortBy;
  sortDirection?: MaterialVendorSortDirection;
}): Promise<MaterialVendor[]> {
  noStore();
  const sort = resolveMaterialVendorSort(filters.sortBy, filters.sortDirection);
  const supabase = createServerSupabaseClient();
  let query = supabase.from("material_vendors").select(baseMaterialVendorSelect());

  const vendorCode = normalizeLike(filters.vendorCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);
  const materialCategory = filters.materialCategory?.trim();
  const isDefaultVendor = filters.isDefaultVendor?.trim();

  if (vendorCode) query = query.ilike("vendor_code", vendorCode);
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (materialCategory) query = query.eq("material_category", materialCategory);
  if (isDefaultVendor === "yes") query = query.eq("is_default_vendor", true);
  if (isDefaultVendor === "no") query = query.eq("is_default_vendor", false);

  query = applyMaterialVendorSort(query, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown) as MaterialVendor[];
  if (rows.length === 0) return [];

  const { data: attachments, error: attachmentError } = await supabase
    .from("material_vendor_attachment_links")
    .select("*")
    .in(
      "material_vendor_id",
      rows.map((row) => row.id)
    )
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  const attachmentMap = new Map<string, MaterialVendorAttachmentLink[]>();
  for (const item of (attachments ?? []) as MaterialVendorAttachmentLink[]) {
    const current = attachmentMap.get(item.material_vendor_id) ?? [];
    current.push(item);
    attachmentMap.set(item.material_vendor_id, current);
  }

  return rows.map((row) => ({
    ...row,
    attachment_links: attachmentMap.get(row.id) ?? [],
  }));
}

export async function getMaterialVendorFilterOptions(): Promise<MaterialVendorFilterOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [vendorCodesResult, legalNamesResult] = await Promise.all([
    supabase
      .from("material_vendors")
      .select("vendor_code, legal_company_name")
      .order("vendor_code", { ascending: true })
      .limit(MATERIAL_VENDOR_FILTER_OPTION_LIMIT),
    supabase
      .from("material_vendors")
      .select("legal_company_name, company_name")
      .order("legal_company_name", { ascending: true })
      .limit(MATERIAL_VENDOR_FILTER_OPTION_LIMIT),
  ]);

  if (vendorCodesResult.error) throw new Error(vendorCodesResult.error.message);
  if (legalNamesResult.error) throw new Error(legalNamesResult.error.message);

  return {
    vendorCodes: dedupeAutocompleteOptions(
      (vendorCodesResult.data ?? []).map((row) => ({
        value: row.vendor_code,
        label: row.vendor_code,
        secondaryLabel: row.legal_company_name ?? undefined,
        searchText: [row.vendor_code, row.legal_company_name].filter(Boolean).join(" "),
      }))
    ),
    legalCompanyNames: dedupeAutocompleteOptions(
      (legalNamesResult.data ?? []).map((row) => ({
        value: row.legal_company_name,
        label: row.legal_company_name,
        secondaryLabel:
          row.company_name && row.company_name !== row.legal_company_name
            ? row.company_name
            : undefined,
        searchText: [row.legal_company_name, row.company_name].filter(Boolean).join(" "),
      }))
    ),
  };
}

export async function getMaterialVendorById(id: string): Promise<MaterialVendor | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("material_vendors")
    .select(baseMaterialVendorSelect())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: attachments, error: attachmentError } = await supabase
    .from("material_vendor_attachment_links")
    .select("*")
    .eq("material_vendor_id", id)
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  return {
    ...((data as unknown) as MaterialVendor),
    attachment_links: (attachments ?? []) as MaterialVendorAttachmentLink[],
  };
}

export async function getMaterialVendorBuyerOptions(): Promise<MaterialVendorBuyerOption[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MaterialVendorBuyerOption[];
}

export async function revalidateMaterialVendorViews(id?: string) {
  revalidatePath("/partners");
  revalidatePath("/partners/material-vendors");
  revalidatePath("/partners/material-vendors/new");
  if (id) {
    revalidatePath(`/partners/material-vendors/${id}`);
    revalidatePath(`/partners/material-vendors/${id}/edit`);
  }
}
