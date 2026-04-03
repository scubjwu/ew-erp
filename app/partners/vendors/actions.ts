"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Vendor, VendorAttachmentLink } from "@/types/vendor";

export type VendorQuery = {
  vendorCode?: string;
  legalCompanyName?: string;
  regionId?: string;
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
    regionId: string;
  };
};

export type VendorRegionOption = {
  id: string;
  region_code: string;
  region_name: string | null;
};

export type VendorBuyerOption = {
  id: string;
  full_name: string | null;
  email: string;
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function baseVendorSelect() {
  return `
    *,
    region:region_codes(id, region_code, region_name),
    assigned_buyer:users(id, full_name)
  `;
}

export async function getVendors(params: VendorQuery): Promise<VendorPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    vendorCode: params.vendorCode?.trim() ?? "",
    legalCompanyName: params.legalCompanyName?.trim() ?? "",
    regionId: params.regionId?.trim() ?? "",
  };

  const vendorCode = normalizeLike(filters.vendorCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("vendors")
    .select(baseVendorSelect(), { count: "exact" })
    .order("vendor_code", { ascending: true });

  if (vendorCode) {
    query = query.ilike("vendor_code", vendorCode);
  }
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (filters.regionId) {
    query = query.eq("region_id", filters.regionId);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as Vendor[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
  };
}

export async function exportVendors(filters: {
  vendorCode?: string;
  legalCompanyName?: string;
  regionId?: string;
}): Promise<Vendor[]> {
  noStore();

  const supabase = createServerSupabaseClient();
  let query = supabase.from("vendors").select(baseVendorSelect()).order("vendor_code", { ascending: true });

  const vendorCode = normalizeLike(filters.vendorCode);
  const legalCompanyName = normalizeLike(filters.legalCompanyName);
  const regionId = filters.regionId?.trim();

  if (vendorCode) {
    query = query.ilike("vendor_code", vendorCode);
  }
  if (legalCompanyName) {
    query = query.or(
      `legal_company_name.ilike.${legalCompanyName},company_name.ilike.${legalCompanyName}`
    );
  }
  if (regionId) {
    query = query.eq("region_id", regionId);
  }

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
