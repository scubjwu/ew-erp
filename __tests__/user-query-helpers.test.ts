import { describe, expect, it } from "vitest";

import {
  DEFAULT_USER_MANAGEMENT_SORT,
  normalizeLike,
  resolveUserManagementSort,
  USER_MANAGEMENT_SORT_COLUMN_MAP,
} from "@/app/settings/users/query-helpers";

describe("user management query helpers", () => {
  it("defaults to user code ascending sort", () => {
    expect(resolveUserManagementSort(undefined, undefined)).toEqual(
      DEFAULT_USER_MANAGEMENT_SORT
    );
  });

  it("normalizes supported sort fields and directions", () => {
    expect(resolveUserManagementSort("status", "desc")).toEqual({
      sortBy: "status",
      sortDirection: "desc",
    });
    expect(USER_MANAGEMENT_SORT_COLUMN_MAP.status).toEqual({
      column: "status",
    });
  });

  it("trims fuzzy-match values", () => {
    expect(normalizeLike("  QA0001  ")).toBe("%QA0001%");
    expect(normalizeLike("")).toBeNull();
  });
});
