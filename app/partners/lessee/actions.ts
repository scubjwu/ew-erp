"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Lessee, LesseeAttachmentLink } from "@/types/lessee";
import {
  LESSEE_FILTER_OPTION_LIMIT,
  LESSEE_SORT_COLUMN_MAP,
  normalizeLike,
  resolveLesseeSort,
  resolveRegionFilter,
  type LesseeSortBy,
  type LesseeSortDirection,
} from "@/app/partners/lessee/query-helpers";

export type LesseeQuery = {
  lesseeCode?: string;
  legalCompanyName?: string;
  regionQuery?: string;
  selectedRegionId?: string;
  sortBy?: LesseeSortBy;
  sortDirection?: LesseeSortDirection;
  page: number;
  pageSize: number;
};

export type LesseePageResult = {
  rows: Lessee[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    lesseeCode: string;
    legalCompanyName: string;
    regionQuery: string;
    selectedRegionId: string;
  };
  sort: {
    sortBy: LesseeSortBy;
    sortDirection: LesseeSortDirection;
  };
};

export type LesseeRegionOption = {
  id: string;
  region_code: string;
  region_name: string | null;
};

export type LesseePicOption = {
  id: string;
  full_name: string | null;
  email: string;
};

export type LesseeAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type LesseeFilterOptions = {
  lesseeCodes: LesseeAutocompleteOption[];
  legalCompanyNames: LesseeAutocompleteOption[];
  regions: LesseeAutocompleteOption[];
};

function baseLesseeSelect() {
  return `
    *,
    region:region_codes(id, region_code, region_name),
    pic_user:users(id, full_name)
  `;
}

function dedupeAutocompleteOptions(options: LesseeAutocompleteOption[]) {
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
    .limit(LESSEE_FILTER_OPTION_LIMIT);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => row.id).filter(Boolean) as string[];
}

function applyLesseeSort<T extends { order: (...args: unknown[]) => T }>(
  query: T,
  sort: { sortBy: LesseeSortBy; sortDirection: LesseeSortDirection }
) {
  const mapping = LESSEE_SORT_COLUMN_MAP[sort.sortBy];
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

export async function getLessees(params: LesseeQuery): Promise<LesseePageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sort = resolveLesseeSort(params.sortBy, params.sortDirection);
  const regionFilter = resolveRegionFilter({
    selectedRegionId: params.selectedRegionId,
    regionQuery: params.regionQuery,
  });

  const filters = {
    lesseeCode: params.lesseeCode?.trim() ?? "",
    legalCompanyName: params.legalCompanyName?.trim() ?? "",
    regionQuery: params.regionQuery?.trim() ?? "",
    selectedRegionId: regionFilter.selectedRegionId,
  };

  const lesseeCode = normalizeLike(filters.lesseeCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("lessees")
    .select(baseLesseeSelect(), { count: "exact" });

  if (lesseeCode) query = query.ilike("lessee_code", lesseeCode);
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

  query = applyLesseeSort(query, sort);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as Lessee[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportLessees(filters: {
  lesseeCode?: string;
  legalCompanyName?: string;
  regionQuery?: string;
  selectedRegionId?: string;
  sortBy?: LesseeSortBy;
  sortDirection?: LesseeSortDirection;
}): Promise<Lessee[]> {
  noStore();
  const sort = resolveLesseeSort(filters.sortBy, filters.sortDirection);
  const supabase = createServerSupabaseClient();
  let query = supabase.from("lessees").select(baseLesseeSelect());

  const lesseeCode = normalizeLike(filters.lesseeCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);
  const regionFilter = resolveRegionFilter({
    selectedRegionId: filters.selectedRegionId,
    regionQuery: filters.regionQuery,
  });

  if (lesseeCode) query = query.ilike("lessee_code", lesseeCode);
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (regionFilter.selectedRegionId) {
    query = query.eq("region_id", regionFilter.selectedRegionId);
  } else if (regionFilter.regionQuery) {
    const regionIds = await resolveRegionIdsForQuery(regionFilter.regionQuery);
    if (!regionIds || regionIds.length === 0) return [];
    query = query.in("region_id", regionIds);
  }

  query = applyLesseeSort(query, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown) as Lessee[];
  if (rows.length === 0) return [];

  const { data: attachments, error: attachmentError } = await supabase
    .from("lessee_attachment_links")
    .select("*")
    .in(
      "lessee_id",
      rows.map((row) => row.id)
    )
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  const attachmentMap = new Map<string, LesseeAttachmentLink[]>();
  for (const item of (attachments ?? []) as LesseeAttachmentLink[]) {
    const current = attachmentMap.get(item.lessee_id) ?? [];
    current.push(item);
    attachmentMap.set(item.lessee_id, current);
  }

  return rows.map((row) => ({
    ...row,
    attachment_links: attachmentMap.get(row.id) ?? [],
  }));
}

export async function getLesseeFilterOptions(): Promise<LesseeFilterOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [codesResult, legalNamesResult, regionsResult] = await Promise.all([
    supabase
      .from("lessees")
      .select("lessee_code, legal_company_name")
      .order("lessee_code", { ascending: true })
      .limit(LESSEE_FILTER_OPTION_LIMIT),
    supabase
      .from("lessees")
      .select("legal_company_name, company_name")
      .order("legal_company_name", { ascending: true })
      .limit(LESSEE_FILTER_OPTION_LIMIT),
    supabase
      .from("region_codes")
      .select("id, region_code, region_name")
      .order("region_code", { ascending: true })
      .limit(LESSEE_FILTER_OPTION_LIMIT),
  ]);

  if (codesResult.error) throw new Error(codesResult.error.message);
  if (legalNamesResult.error) throw new Error(legalNamesResult.error.message);
  if (regionsResult.error) throw new Error(regionsResult.error.message);

  return {
    lesseeCodes: dedupeAutocompleteOptions(
      (codesResult.data ?? []).map((row) => ({
        value: row.lessee_code,
        label: row.lessee_code,
        secondaryLabel: row.legal_company_name ?? undefined,
        searchText: [row.lessee_code, row.legal_company_name].filter(Boolean).join(" "),
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
      ((regionsResult.data ?? []) as LesseeRegionOption[]).map((row) => ({
        value: row.id,
        label: row.region_code,
        secondaryLabel: row.region_name ?? undefined,
        searchText: [row.region_code, row.region_name].filter(Boolean).join(" "),
      }))
    ),
  };
}

export async function getLesseeById(id: string): Promise<Lessee | null> {
  noStore();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("lessees")
    .select(baseLesseeSelect())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: attachments, error: attachmentError } = await supabase
    .from("lessee_attachment_links")
    .select("*")
    .eq("lessee_id", id)
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  return {
    ...((data as unknown) as Lessee),
    attachment_links: (attachments ?? []) as LesseeAttachmentLink[],
  };
}

export async function getLesseeRegionOptions(): Promise<LesseeRegionOption[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("region_codes")
    .select("id, region_code, region_name")
    .order("region_code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as LesseeRegionOption[];
}

export async function getLesseePicOptions(): Promise<LesseePicOption[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as LesseePicOption[];
}

export async function revalidateLesseeViews(id?: string) {
  revalidatePath("/partners");
  revalidatePath("/partners/lessee");
  revalidatePath("/partners/lessee/new");
  if (id) {
    revalidatePath(`/partners/lessee/${id}`);
    revalidatePath(`/partners/lessee/${id}/edit`);
  }
}
