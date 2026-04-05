import { describe, expect, it } from "vitest";

import {
  DEFAULT_REGION_SORT,
  normalizeLike,
  REGION_SORT_COLUMN_MAP,
  resolveRegionSort,
} from "@/app/basic-info/regions/query-helpers";

describe("region query helpers", () => {
  it("defaults to region code ascending sort", () => {
    expect(resolveRegionSort(undefined, undefined)).toEqual(DEFAULT_REGION_SORT);
  });

  it("normalizes supported sort fields and directions", () => {
    expect(resolveRegionSort("createdAt", "desc")).toEqual({
      sortBy: "createdAt",
      sortDirection: "desc",
    });
    expect(REGION_SORT_COLUMN_MAP.createdAt).toEqual({
      column: "created_at",
    });
  });

  it("trims fuzzy-match values", () => {
    expect(normalizeLike("  USA  ")).toBe("%USA%");
    expect(normalizeLike("")).toBeNull();
  });
});
