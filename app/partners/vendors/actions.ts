"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Vendor, VendorAttachmentLink } from "@/types/vendor";
import {
  DEFAULT_VENDOR_SORT,
  normalizeLike,
  resolveRegionFilter,
  resolveVendorSort,
  VENDOR_FILTER_OPTION_LIMIT,
  VENDOR_SORT_COLUMN_MAP,
  type VendorSortBy,
  type VendorSortDirection,
} from "@/app/partners/vendors/query-helpers";

export type VendorQuery = {
  vendorCode?: string;
  legalCompanyName?: string;
  regionQuery?: string;
  selectedRegionId?: string;
  sortBy?: VendorSortBy;
  sortDirection?: VendorSortDirection;
  page: number;
  pageSize: number;
};

export type VendorPageResult = {
  rows: Vendor[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    vendorCode: string;
    legalCompanyName: string;
    regionQuery: string;
    selectedRegionId: string;
  };
  sort: {
    sortBy: VendorSortBy;
    sortDirection: VendorSortDirection;
  };
};

export type VendorRegionOption = {
  id: string;
  region_code: string;
  region_name: string | null;
};

export type VendorAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type VendorFilterOptions = {
  vendorCodes: VendorAutocompleteOption[];
  legalCompanyNames: VendorAutocompleteOption[];
  regions: VendorAutocompleteOption[];
};

export type VendorBuyerOption = {
  id: string;
  full_name: string | null;
  email: string;
};

function baseVendorSelect() {
  return `
    *,
    region:region_codes(id, region_code, region_name),
    assigned_buyer:users(id, full_name)
  `;
}

function dedupeAutocompleteOptions(options: VendorAutocompleteOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.value}::${option.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function resolveRegionIdsForQuery(regionQuery: string) {
  const pattern = normalizeLike(regionQuery);
  if (!pattern) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("region_codes")
    .select("id")
    .or(`region_code.ilike.${pattern},region_name.ilike.${pattern}`)
    .order("region_code", { ascending: true })
    .limit(VENDOR_FILTER_OPTION_LIMIT);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => row.id).filter(Boolean) as string[];
}

function applyVendorSort<T extends { order: (...args: unknown[]) => T }>(
  query: T,
  sort: { sortBy: VendorSortBy; sortDirection: VendorSortDirection }
) {
  const mapping = VENDOR_SORT_COLUMN_MAP[sort.sortBy];
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

export async function getVendors(params: VendorQuery): Promise<VendorPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sort = resolveVendorSort(params.sortBy, params.sortDirection);
  const regionFilter = resolveRegionFilter({
    selectedRegionId: params.selectedRegionId,
    regionQuery: params.regionQuery,
  });

  const filters = {
    vendorCode: params.vendorCode?.trim() ?? "",
    legalCompanyName: params.legalCompanyName?.trim() ?? "",
    regionQuery: params.regionQuery?.trim() ?? "",
    selectedRegionId: regionFilter.selectedRegionId,
  };

  const vendorCode = normalizeLike(filters.vendorCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);

  const supabase = createServerSupabaseClient();
  let query = supabase.from("vendors").select(baseVendorSelect(), { count: "exact" });

  if (vendorCode) {
    query = query.ilike("vendor_code", vendorCode);
  }
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (regionFilter.selectedRegionId) {
    query = query.eq("region_id", regionFilter.selectedRegionId);
  } else if (regionFilter.regionQuery) {
    const regionIds = await resolveRegionIdsForQuery(regionFilter.regionQuery);
    if (!regionIds || regionIds.length === 0) {
      return {
        rows: [],
        totalCount: 0,
        page,
        pageSize,
        filters,
        sort,
      };
    }
    query = query.in("region_id", regionIds);
  }

  query = applyVendorSort(query, sort);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as Vendor[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportVendors(filters: {
  vendorCode?: string;
  legalCompanyName?: string;
  regionQuery?: string;
  selectedRegionId?: string;
  sortBy?: VendorSortBy;
  sortDirection?: VendorSortDirection;
}): Promise<Vendor[]> {
  noStore();

  const sort = resolveVendorSort(filters.sortBy, filters.sortDirection);
  const supabase = createServerSupabaseClient();
  let query = supabase.from("vendors").select(baseVendorSelect());

  const vendorCode = normalizeLike(filters.vendorCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);
  const regionFilter = resolveRegionFilter({
    selectedRegionId: filters.selectedRegionId,
    regionQuery: filters.regionQuery,
  });

  if (vendorCode) {
    query = query.ilike("vendor_code", vendorCode);
  }
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (regionFilter.selectedRegionId) {
    query = query.eq("region_id", regionFilter.selectedRegionId);
  } else if (regionFilter.regionQuery) {
    const regionIds = await resolveRegionIdsForQuery(regionFilter.regionQuery);
    if (!regionIds || regionIds.length === 0) {
      return [];
    }
    query = query.in("region_id", regionIds);
  }

  query = applyVendorSort(query, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown) as Vendor[];
  if (rows.length === 0) return [];

  const { data: attachments, error: attachmentError } = await supabase
    .from("vendor_attachment_links")
    .select("*")
    .in(
      "vendor_id",
      rows.map((row) => row.id)
    )
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  const attachmentMap = new Map<string, VendorAttachmentLink[]>();
  for (const item of (attachments ?? []) as VendorAttachmentLink[]) {
    const current = attachmentMap.get(item.vendor_id) ?? [];
    current.push(item);
    attachmentMap.set(item.vendor_id, current);
  }

  return rows.map((row) => ({
    ...row,
    attachment_links: attachmentMap.get(row.id) ?? [],
  }));
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  noStore();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("vendors")
    .select(baseVendorSelect())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: attachments, error: attachmentError } = await supabase
    .from("vendor_attachment_links")
    .select("*")
    .eq("vendor_id", id)
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  return {
    ...((data as unknown) as Vendor),
    attachment_links: (attachments ?? []) as VendorAttachmentLink[],
  };
}

export async function getVendorRegionOptions(): Promise<VendorRegionOption[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("region_codes")
    .select("id, region_code, region_name")
    .order("region_code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as VendorRegionOption[];
}

export async function getVendorFilterOptions(): Promise<VendorFilterOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [vendorCodesResult, legalNamesResult, regionsResult] = await Promise.all([
    supabase
      .from("vendors")
      .select("vendor_code, legal_company_name")
      .order("vendor_code", { ascending: true })
      .limit(VENDOR_FILTER_OPTION_LIMIT),
    supabase
      .from("vendors")
      .select("legal_company_name, company_name")
      .order("legal_company_name", { ascending: true })
      .limit(VENDOR_FILTER_OPTION_LIMIT),
    supabase
      .from("region_codes")
      .select("id, region_code, region_name")
      .order("region_code", { ascending: true })
      .limit(VENDOR_FILTER_OPTION_LIMIT),
  ]);

  if (vendorCodesResult.error) throw new Error(vendorCodesResult.error.message);
  if (legalNamesResult.error) throw new Error(legalNamesResult.error.message);
  if (regionsResult.error) throw new Error(regionsResult.error.message);

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
    regions: dedupeAutocompleteOptions(
      ((regionsResult.data ?? []) as VendorRegionOption[]).map((row) => ({
        value: row.id,
        label: row.region_code,
        secondaryLabel: row.region_name ?? undefined,
        searchText: [row.region_code, row.region_name].filter(Boolean).join(" "),
      }))
    ),
  };
}

export async function getVendorBuyerOptions(): Promise<VendorBuyerOption[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as VendorBuyerOption[];
}

export async function revalidateVendorViews(vendorId?: string) {
  revalidatePath("/partners");
  revalidatePath("/partners/vendors");
  revalidatePath("/partners/vendors/new");
  if (vendorId) {
    revalidatePath(`/partners/vendors/${vendorId}`);
    revalidatePath(`/partners/vendors/${vendorId}/edit`);
  }
}
