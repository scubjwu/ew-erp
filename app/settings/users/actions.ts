"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import {
  USER_FILTER_OPTION_LIMIT,
  USER_MANAGEMENT_SORT_COLUMN_MAP,
  normalizeLike,
  resolveUserManagementSort,
  type UserManagementSortBy,
  type UserManagementSortDirection,
} from "@/app/settings/users/query-helpers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  type SystemUser,
  type UserStatus,
} from "@/types/system-user";

export type UserAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type UserFilterOptions = {
  userCodes: UserAutocompleteOption[];
  fullNames: UserAutocompleteOption[];
};

export type UserManagementQuery = {
  userCode?: string;
  fullName?: string;
  role?: string;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: UserManagementSortBy;
  sortDirection?: UserManagementSortDirection;
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
  sort: {
    sortBy: UserManagementSortBy;
    sortDirection: UserManagementSortDirection;
  };
};

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
  const sort = resolveUserManagementSort(params.sortBy, params.sortDirection);

  const userCode = normalizeLike(filters.userCode);
  const fullName = normalizeLike(filters.fullName);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("users")
    .select("*", { count: "exact" });

  if (userCode) query = query.ilike("user_code", userCode);
  if (fullName) query = query.ilike("full_name", fullName);
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("status", filters.status);
  query = query.order(USER_MANAGEMENT_SORT_COLUMN_MAP[sort.sortBy].column, {
    ascending: sort.sortDirection === "asc",
  });

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as unknown) as SystemUser[],
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportUsers(filters: {
  userCode?: string;
  fullName?: string;
  role?: string;
  status?: string;
  sortBy?: UserManagementSortBy;
  sortDirection?: UserManagementSortDirection;
}): Promise<SystemUser[]> {
  noStore();

  const supabase = createServerSupabaseClient();
  const sort = resolveUserManagementSort(filters.sortBy, filters.sortDirection);
  let query = supabase.from("users").select("*");

  const userCode = normalizeLike(filters.userCode);
  const fullName = normalizeLike(filters.fullName);
  const role = filters.role?.trim();
  const status = filters.status?.trim();

  if (userCode) query = query.ilike("user_code", userCode);
  if (fullName) query = query.ilike("full_name", fullName);
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);
  query = query.order(USER_MANAGEMENT_SORT_COLUMN_MAP[sort.sortBy].column, {
    ascending: sort.sortDirection === "asc",
  });

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as SystemUser[];
}

export async function getUserFilterOptions(): Promise<UserFilterOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [{ data: userCodeRows, error: userCodeError }, { data: fullNameRows, error: fullNameError }] =
    await Promise.all([
      supabase
        .from("users")
        .select("user_code, full_name")
        .order("user_code", { ascending: true })
        .limit(USER_FILTER_OPTION_LIMIT),
      supabase
        .from("users")
        .select("full_name, user_code")
        .not("full_name", "is", null)
        .order("full_name", { ascending: true })
        .limit(USER_FILTER_OPTION_LIMIT),
    ]);

  if (userCodeError) throw new Error(userCodeError.message);
  if (fullNameError) throw new Error(fullNameError.message);

  return {
    userCodes: Array.from(
      new Map(
        (userCodeRows ?? []).map((row) => [
          row.user_code as string,
          {
            value: row.user_code as string,
            label: row.user_code as string,
            secondaryLabel: row.full_name ?? undefined,
            searchText: `${row.user_code ?? ""} ${row.full_name ?? ""}`.trim(),
          },
        ])
      ).values()
    ),
    fullNames: Array.from(
      new Map(
        (fullNameRows ?? [])
          .filter((row) => Boolean(row.full_name))
          .map((row) => [
            row.full_name as string,
            {
              value: row.full_name as string,
              label: row.full_name as string,
              secondaryLabel: row.user_code ?? undefined,
              searchText: `${row.full_name ?? ""} ${row.user_code ?? ""}`.trim(),
            },
          ])
      ).values()
    ),
  };
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
