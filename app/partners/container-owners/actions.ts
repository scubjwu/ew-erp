"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ContainerOwner,
  ContainerOwnerAttachmentLink,
} from "@/types/container-owner";
import {
  CONTAINER_OWNER_FILTER_OPTION_LIMIT,
  CONTAINER_OWNER_SORT_COLUMN_MAP,
  normalizeLike,
  resolveContainerOwnerSort,
  resolveRegionFilter,
  type ContainerOwnerSortBy,
  type ContainerOwnerSortDirection,
} from "@/app/partners/container-owners/query-helpers";

export type ContainerOwnerQuery = {
  containerOwnerCode?: string;
  legalCompanyName?: string;
  regionQuery?: string;
  selectedRegionId?: string;
  sortBy?: ContainerOwnerSortBy;
  sortDirection?: ContainerOwnerSortDirection;
  page: number;
  pageSize: number;
};

export type ContainerOwnerPageResult = {
  rows: ContainerOwner[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    containerOwnerCode: string;
    legalCompanyName: string;
    regionQuery: string;
    selectedRegionId: string;
  };
  sort: {
    sortBy: ContainerOwnerSortBy;
    sortDirection: ContainerOwnerSortDirection;
  };
};

export type ContainerOwnerRegionOption = {
  id: string;
  region_code: string;
  region_name: string | null;
};

export type ContainerOwnerPicOption = {
  id: string;
  full_name: string | null;
  email: string;
};

export type ContainerOwnerAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type ContainerOwnerFilterOptions = {
  containerOwnerCodes: ContainerOwnerAutocompleteOption[];
  legalCompanyNames: ContainerOwnerAutocompleteOption[];
  regions: ContainerOwnerAutocompleteOption[];
};

function baseContainerOwnerSelect() {
  return `
    *,
    region:region_codes(id, region_code, region_name),
    pic_user:users(id, full_name)
  `;
}

function dedupeAutocompleteOptions(options: ContainerOwnerAutocompleteOption[]) {
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
    .limit(CONTAINER_OWNER_FILTER_OPTION_LIMIT);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => row.id).filter(Boolean) as string[];
}

function applyContainerOwnerSort<T extends { order: (...args: unknown[]) => T }>(
  query: T,
  sort: { sortBy: ContainerOwnerSortBy; sortDirection: ContainerOwnerSortDirection }
) {
  const mapping = CONTAINER_OWNER_SORT_COLUMN_MAP[sort.sortBy];
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

export async function getContainerOwners(
  params: ContainerOwnerQuery
): Promise<ContainerOwnerPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sort = resolveContainerOwnerSort(params.sortBy, params.sortDirection);
  const regionFilter = resolveRegionFilter({
    selectedRegionId: params.selectedRegionId,
    regionQuery: params.regionQuery,
  });

  const filters = {
    containerOwnerCode: params.containerOwnerCode?.trim() ?? "",
    legalCompanyName: params.legalCompanyName?.trim() ?? "",
    regionQuery: params.regionQuery?.trim() ?? "",
    selectedRegionId: regionFilter.selectedRegionId,
  };

  const containerOwnerCode = normalizeLike(filters.containerOwnerCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("container_owners")
    .select(baseContainerOwnerSelect(), { count: "exact" });

  if (containerOwnerCode) query = query.ilike("container_owner_code", containerOwnerCode);
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

  query = applyContainerOwnerSort(query, sort);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as ContainerOwner[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportContainerOwners(filters: {
  containerOwnerCode?: string;
  legalCompanyName?: string;
  regionQuery?: string;
  selectedRegionId?: string;
  sortBy?: ContainerOwnerSortBy;
  sortDirection?: ContainerOwnerSortDirection;
}): Promise<ContainerOwner[]> {
  noStore();
  const sort = resolveContainerOwnerSort(filters.sortBy, filters.sortDirection);
  const supabase = createServerSupabaseClient();
  let query = supabase.from("container_owners").select(baseContainerOwnerSelect());

  const containerOwnerCode = normalizeLike(filters.containerOwnerCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);
  const regionFilter = resolveRegionFilter({
    selectedRegionId: filters.selectedRegionId,
    regionQuery: filters.regionQuery,
  });

  if (containerOwnerCode) query = query.ilike("container_owner_code", containerOwnerCode);
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

  query = applyContainerOwnerSort(query, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown) as ContainerOwner[];
  if (rows.length === 0) return [];

  const { data: attachments, error: attachmentError } = await supabase
    .from("container_owner_attachment_links")
    .select("*")
    .in(
      "container_owner_id",
      rows.map((row) => row.id)
    )
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  const attachmentMap = new Map<string, ContainerOwnerAttachmentLink[]>();
  for (const item of (attachments ?? []) as ContainerOwnerAttachmentLink[]) {
    const current = attachmentMap.get(item.container_owner_id) ?? [];
    current.push(item);
    attachmentMap.set(item.container_owner_id, current);
  }

  return rows.map((row) => ({
    ...row,
    attachment_links: attachmentMap.get(row.id) ?? [],
  }));
}

export async function getContainerOwnerFilterOptions(): Promise<ContainerOwnerFilterOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [codesResult, legalNamesResult, regionsResult] = await Promise.all([
    supabase
      .from("container_owners")
      .select("container_owner_code, legal_company_name")
      .order("container_owner_code", { ascending: true })
      .limit(CONTAINER_OWNER_FILTER_OPTION_LIMIT),
    supabase
      .from("container_owners")
      .select("legal_company_name, company_name")
      .order("legal_company_name", { ascending: true })
      .limit(CONTAINER_OWNER_FILTER_OPTION_LIMIT),
    supabase
      .from("region_codes")
      .select("id, region_code, region_name")
      .order("region_code", { ascending: true })
      .limit(CONTAINER_OWNER_FILTER_OPTION_LIMIT),
  ]);

  if (codesResult.error) throw new Error(codesResult.error.message);
  if (legalNamesResult.error) throw new Error(legalNamesResult.error.message);
  if (regionsResult.error) throw new Error(regionsResult.error.message);

  return {
    containerOwnerCodes: dedupeAutocompleteOptions(
      (codesResult.data ?? []).map((row) => ({
        value: row.container_owner_code,
        label: row.container_owner_code,
        secondaryLabel: row.legal_company_name ?? undefined,
        searchText: [row.container_owner_code, row.legal_company_name].filter(Boolean).join(" "),
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
      ((regionsResult.data ?? []) as ContainerOwnerRegionOption[]).map((row) => ({
        value: row.id,
        label: row.region_code,
        secondaryLabel: row.region_name ?? undefined,
        searchText: [row.region_code, row.region_name].filter(Boolean).join(" "),
      }))
    ),
  };
}

export async function getContainerOwnerById(id: string): Promise<ContainerOwner | null> {
  noStore();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("container_owners")
    .select(baseContainerOwnerSelect())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: attachments, error: attachmentError } = await supabase
    .from("container_owner_attachment_links")
    .select("*")
    .eq("container_owner_id", id)
    .order("created_at", { ascending: true });

  if (attachmentError) throw new Error(attachmentError.message);

  return {
    ...((data as unknown) as ContainerOwner),
    attachment_links: (attachments ?? []) as ContainerOwnerAttachmentLink[],
  };
}

export async function getContainerOwnerRegionOptions(): Promise<ContainerOwnerRegionOption[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("region_codes")
    .select("id, region_code, region_name")
    .order("region_code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContainerOwnerRegionOption[];
}

export async function getContainerOwnerPicOptions(): Promise<ContainerOwnerPicOption[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContainerOwnerPicOption[];
}

export async function revalidateContainerOwnerViews(id?: string) {
  revalidatePath("/partners");
  revalidatePath("/partners/container-owners");
  revalidatePath("/partners/container-owners/new");
  if (id) {
    revalidatePath(`/partners/container-owners/${id}`);
    revalidatePath(`/partners/container-owners/${id}/edit`);
  }
}
