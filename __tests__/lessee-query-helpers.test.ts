import { describe, expect, it } from "vitest";

import {
  DEFAULT_LESSEE_SORT,
  LESSEE_SORT_COLUMN_MAP,
  normalizeLike,
  resolveLesseeSort,
  resolveRegionFilter,
} from "@/app/partners/lessee/query-helpers";

describe("lessee query helpers", () => {
  it("defaults to lessee_code ascending sort", () => {
    expect(resolveLesseeSort(undefined, undefined)).toEqual(DEFAULT_LESSEE_SORT);
  });

  it("normalizes supported sort fields and directions", () => {
    expect(resolveLesseeSort("currentPrepaidBalance", "desc")).toEqual({
      sortBy: "currentPrepaidBalance",
      sortDirection: "desc",
    });
    expect(LESSEE_SORT_COLUMN_MAP.region).toEqual({
      column: "region_code",
      foreignTable: "region",
    });
  });

  it("trims fuzzy-match values and prioritizes selected region", () => {
    expect(normalizeLike("  BABCDE  ")).toBe("%BABCDE%");
    expect(
      resolveRegionFilter({ selectedRegionId: "region-1", regionQuery: "China" })
    ).toEqual({
      selectedRegionId: "region-1",
      regionQuery: "",
    });
  });
});
