"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Lessee, LesseeAttachmentLink } from "@/types/lessee";

export type LesseeQuery = {
  lesseeCode?: string;
  legalCompanyName?: string;
  regionId?: string;
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
    regionId: string;
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

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function baseLesseeSelect() {
  return `
    *,
    region:region_codes(id, region_code, region_name),
    pic_user:users(id, full_name)
  `;
}

export async function getLessees(params: LesseeQuery): Promise<LesseePageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    lesseeCode: params.lesseeCode?.trim() ?? "",
    legalCompanyName: params.legalCompanyName?.trim() ?? "",
    regionId: params.regionId?.trim() ?? "",
  };

  const lesseeCode = normalizeLike(filters.lesseeCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("lessees")
    .select(baseLesseeSelect(), { count: "exact" })
    .order("lessee_code", { ascending: true });

  if (lesseeCode) query = query.ilike("lessee_code", lesseeCode);
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (filters.regionId) query = query.eq("region_id", filters.regionId);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as Lessee[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
  };
}

export async function exportLessees(filters: {
  lesseeCode?: string;
  legalCompanyName?: string;
  regionId?: string;
}): Promise<Lessee[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  let query = supabase.from("lessees").select(baseLesseeSelect()).order("lessee_code", { ascending: true });

  const lesseeCode = normalizeLike(filters.lesseeCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);
  const regionId = filters.regionId?.trim();

  if (lesseeCode) query = query.ilike("lessee_code", lesseeCode);
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (regionId) query = query.eq("region_id", regionId);

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
