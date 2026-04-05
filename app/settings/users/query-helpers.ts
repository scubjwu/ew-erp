export type UserManagementSortBy =
  | "userCode"
  | "fullName"
  | "email"
  | "role"
  | "status";

export type UserManagementSortDirection = "asc" | "desc";

export const DEFAULT_USER_MANAGEMENT_SORT = {
  sortBy: "userCode",
  sortDirection: "asc",
} as const;

export const USER_FILTER_OPTION_LIMIT = 100;

export const USER_MANAGEMENT_SORT_COLUMN_MAP: Record<UserManagementSortBy, { column: string }> = {
  userCode: { column: "user_code" },
  fullName: { column: "full_name" },
  email: { column: "email" },
  role: { column: "role" },
  status: { column: "status" },
};

export function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

export function resolveUserManagementSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: UserManagementSortBy;
  sortDirection: UserManagementSortDirection;
} {
  const nextSortBy =
    sortBy && sortBy in USER_MANAGEMENT_SORT_COLUMN_MAP
      ? (sortBy as UserManagementSortBy)
      : DEFAULT_USER_MANAGEMENT_SORT.sortBy;
  const nextSortDirection =
    sortDirection === "desc" ? "desc" : DEFAULT_USER_MANAGEMENT_SORT.sortDirection;

  return {
    sortBy: nextSortBy,
    sortDirection: nextSortDirection,
  };
}
