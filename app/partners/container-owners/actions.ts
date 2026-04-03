"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ContainerOwner,
  ContainerOwnerAttachmentLink,
} from "@/types/container-owner";

export type ContainerOwnerQuery = {
  containerOwnerCode?: string;
  legalCompanyName?: string;
  regionId?: string;
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
    regionId: string;
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

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function baseContainerOwnerSelect() {
  return `
    *,
    region:region_codes(id, region_code, region_name),
    pic_user:users(id, full_name)
  `;
}

export async function getContainerOwners(
  params: ContainerOwnerQuery
): Promise<ContainerOwnerPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    containerOwnerCode: params.containerOwnerCode?.trim() ?? "",
    legalCompanyName: params.legalCompanyName?.trim() ?? "",
    regionId: params.regionId?.trim() ?? "",
  };

  const containerOwnerCode = normalizeLike(filters.containerOwnerCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("container_owners")
    .select(baseContainerOwnerSelect(), { count: "exact" })
    .order("container_owner_code", { ascending: true });

  if (containerOwnerCode) query = query.ilike("container_owner_code", containerOwnerCode);
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (filters.regionId) query = query.eq("region_id", filters.regionId);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as ContainerOwner[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
  };
}

export async function exportContainerOwners(filters: {
  containerOwnerCode?: string;
  legalCompanyName?: string;
  regionId?: string;
}): Promise<ContainerOwner[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("container_owners")
    .select(baseContainerOwnerSelect())
    .order("container_owner_code", { ascending: true });

  const containerOwnerCode = normalizeLike(filters.containerOwnerCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);
  const regionId = filters.regionId?.trim();

  if (containerOwnerCode) query = query.ilike("container_owner_code", containerOwnerCode);
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (regionId) query = query.eq("region_id", regionId);

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
