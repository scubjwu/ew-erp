"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  type SystemUser,
  type UserStatus,
} from "@/types/system-user";

export type UserManagementQuery = {
  userCode?: string;
  fullName?: string;
  role?: string;
  status?: string;
  page: number;
  pageSize: number;
};

export type UserManagementPageResult = {
  rows: SystemUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    userCode: string;
    fullName: string;
    role: string;
    status: string;
  };
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

export async function getUsers(
  params: UserManagementQuery
): Promise<UserManagementPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    userCode: params.userCode?.trim() ?? "",
    fullName: params.fullName?.trim() ?? "",
    role: params.role?.trim() ?? "",
    status: params.status?.trim() ?? "",
  };

  const userCode = normalizeLike(filters.userCode);
  const fullName = normalizeLike(filters.fullName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("user_code", { ascending: true });

  if (userCode) query = query.ilike("user_code", userCode);
  if (fullName) query = query.ilike("full_name", fullName);
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as SystemUser[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
  };
}

export async function exportUsers(filters: {
  userCode?: string;
  fullName?: string;
  role?: string;
  status?: string;
}): Promise<SystemUser[]> {
  noStore();

  const supabase = createServerSupabaseClient();
  let query = supabase.from("users").select("*").order("user_code", { ascending: true });

  const userCode = normalizeLike(filters.userCode);
  const fullName = normalizeLike(filters.fullName);
  const role = filters.role?.trim();
  const status = filters.status?.trim();

  if (userCode) query = query.ilike("user_code", userCode);
  if (fullName) query = query.ilike("full_name", fullName);
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as SystemUser[];
}

export async function getUserById(id: string): Promise<SystemUser | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as SystemUser | null) ?? null;
}

export async function getUserRoleOptions(): Promise<string[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .order("role", { ascending: true });

  if (error) throw new Error(error.message);

  const dynamicRoles = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.role?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  return Array.from(new Set([...USER_ROLE_OPTIONS, ...dynamicRoles]));
}

export async function getUserStatusOptions(): Promise<UserStatus[]> {
  return USER_STATUS_OPTIONS;
}

export async function revalidateUserManagementViews(userId?: string) {
  revalidatePath("/settings");
  revalidatePath("/settings/users");
  revalidatePath("/settings/users/new");
  if (userId) {
    revalidatePath(`/settings/users/${userId}`);
    revalidatePath(`/settings/users/${userId}/edit`);
  }
}
